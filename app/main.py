from datetime import datetime
from contextlib import asynccontextmanager
import uvicorn

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.api.workout_routes import router as workout_router
from app.database import create_database_tables, engine, get_db_session
from app.models.db_models import (
    DBExercise,
    DBSetLog,
    DBUser,
    DBWeeklyFeedback,
    DBWorkoutDay,
    DBWorkoutPlan,
    DBWorkoutWeek,
)
from app.models.fitness_models import (
    AdjustWorkoutDayRequest,
    CompleteWorkoutDayResponse,
    ExerciseHistoryResponse,
    SetLogCreate,
    SetLogResponse,
    WeeklyFeedbackRequest,
    WeeklyFeedbackResponse,
    WorkoutDay,
    WorkoutLogRequest,
    WorkoutPlan,
    WorkoutWeekCreateRequest,
    WorkoutWeekCreateResponse,
    WorkoutWeekDayResponse,
    WorkoutWeekResponse,
    WorkoutPlanHistoryResponse,
    UserProfile,
)
from app.services.workout_service import (
    WorkoutServiceConfigurationError,
    WorkoutServiceError,
    WorkoutServiceResponseError,
    adjust_workout_day,
    generate_next_week_plan,
)

load_dotenv()


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Handle application startup and shutdown tasks."""

    create_database_tables()
    try:
        yield
    finally:
        engine.dispose()


app = FastAPI(title="Smart Fitness API", lifespan=lifespan)

app.include_router(
    workout_router,
    prefix="/api/workouts",
    tags=["Workouts"],
)


def _extract_target_sets(user_notes: str | None) -> int:
    """Extract the saved target set count from the stored notes field."""

    if not user_notes:
        return 1

    prefix = "Target sets:"
    if user_notes.startswith(prefix):
        raw_value = user_notes[len(prefix) :].strip()
        if raw_value.isdigit():
            return int(raw_value)

    return 1


def _upsert_user_from_profile(db: Session, profile: UserProfile) -> DBUser:
    """Create or update a persisted user from the supplied profile."""

    user = db.execute(
        select(DBUser).where(DBUser.username == profile.username)
    ).scalar_one_or_none()

    if user is None:
        user = DBUser(
            username=profile.username,
            gender=profile.gender,
            age=profile.age,
            height_cm=profile.height_cm,
            weight_kg=profile.weight_kg,
            body_proportion=profile.body_proportion.value,
            dietary_goal=profile.dietary_goal.value,
            recovery_capacity=profile.recovery_capacity,
            experience_level=profile.experience_level,
            days_per_week=profile.days_per_week,
            session_length_mins=profile.session_length_mins,
            primary_goal=profile.primary_goal,
            focus_areas=profile.focus_areas,
            injuries_limitations=profile.injuries_limitations,
            equipment_access=profile.equipment_access,
        )
        db.add(user)
        return user

    user.gender = profile.gender
    user.age = profile.age
    user.height_cm = profile.height_cm
    user.weight_kg = profile.weight_kg
    user.body_proportion = profile.body_proportion.value
    user.dietary_goal = profile.dietary_goal.value
    user.recovery_capacity = profile.recovery_capacity
    user.experience_level = profile.experience_level
    user.days_per_week = profile.days_per_week
    user.session_length_mins = profile.session_length_mins
    user.primary_goal = profile.primary_goal
    user.focus_areas = profile.focus_areas
    user.injuries_limitations = profile.injuries_limitations
    user.equipment_access = profile.equipment_access
    return user


def _serialize_exercise_history(exercise: DBExercise) -> ExerciseHistoryResponse:
    """Serialize an exercise row into the shared exercise history response."""

    return ExerciseHistoryResponse(
        exercise_id=exercise.id,
        target_sub_muscle=exercise.target_sub_muscle,
        name=exercise.name,
        sets=_extract_target_sets(exercise.user_notes),
        reps_goal=exercise.reps_goal,
        recommended_rest=exercise.rest_goal,
        biomechanical_reason=exercise.biomechanical_reason,
        set_logs=[
            SetLogResponse(
                id=set_log.id,
                set_number=set_log.set_number,
                weight_kg=set_log.weight_kg,
                reps=set_log.reps,
                completed=set_log.completed,
            )
            for set_log in exercise.set_logs
        ],
    )


def _serialize_week_response(workout_week: DBWorkoutWeek) -> WorkoutWeekResponse:
    """Serialize one persisted workout week into the API response model."""

    feedback = workout_week.weekly_feedback
    return WorkoutWeekResponse(
        week_id=workout_week.id,
        week_index=workout_week.week_index,
        title=workout_week.title,
        created_date=workout_week.created_date,
        is_completed=workout_week.is_completed,
        feedback_submitted=feedback is not None,
        weekly_feedback=(
            WeeklyFeedbackResponse(
                feedback_id=feedback.id,
                week_id=feedback.week_id,
                feedback_text=feedback.feedback_text,
                created_date=feedback.created_date,
            )
            if feedback is not None
            else None
        ),
        days=[
            WorkoutWeekDayResponse(
                day_id=day.id,
                day_order=day.day_order,
                day_name=day.day_name,
                is_completed=day.is_completed,
                completed_at=day.completed_at,
                exercises=[_serialize_exercise_history(exercise) for exercise in day.exercises],
            )
            for day in workout_week.days
        ],
    )


def _create_week_from_generated_plan(
    db: Session,
    user: DBUser,
    plan: WorkoutPlan,
) -> DBWorkoutWeek:
    """Persist a generated workout plan as a real workout week using default options."""

    current_week_count = db.execute(
        select(func.count(DBWorkoutWeek.id)).where(DBWorkoutWeek.user_id == user.id)
    ).scalar_one()
    workout_week = DBWorkoutWeek(
        user_id=user.id,
        week_index=int(current_week_count) + 1,
        title=plan.plan_title,
        is_completed=False,
    )
    db.add(workout_week)
    db.flush()

    for day_order, day in enumerate(plan.days, start=1):
        workout_day = DBWorkoutDay(
            week_id=workout_week.id,
            day_order=day_order,
            day_name=day.day_name,
            is_completed=False,
        )
        db.add(workout_day)
        db.flush()

        for slot in day.slots:
            default_option = slot.options[0]
            db.add(
                DBExercise(
                    workout_day_id=workout_day.id,
                    name=default_option.name,
                    target_sub_muscle=slot.target_sub_muscle,
                    biomechanical_reason=default_option.biomechanical_reason,
                    reps_goal=slot.reps,
                    rest_goal=slot.recommended_rest,
                    actual_reps=None,
                    actual_weight=None,
                    user_notes=f"Target sets: {slot.sets}",
                    is_completed=False,
                )
            )

    db.flush()
    return workout_week


@app.get("/")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "message": "Smart Fitness API is running",
    }


@app.get("/api/users/{username}", response_model=UserProfile, tags=["Users"])
def get_user_profile(username: str, db: Session = Depends(get_db_session)) -> UserProfile:
    """Fetch one saved user profile by username."""

    user = db.execute(select(DBUser).where(DBUser.username == username)).scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return UserProfile(
        username=user.username,
        gender=user.gender,
        age=user.age,
        height_cm=user.height_cm,
        weight_kg=user.weight_kg,
        body_proportion=user.body_proportion,
        dietary_goal=user.dietary_goal,
        recovery_capacity=user.recovery_capacity,
        experience_level=user.experience_level,
        days_per_week=user.days_per_week,
        session_length_mins=user.session_length_mins,
        primary_goal=user.primary_goal,
        focus_areas=user.focus_areas,
        injuries_limitations=user.injuries_limitations,
        equipment_access=user.equipment_access,
    )


@app.post("/api/workouts/adjust-day", response_model=WorkoutDay, tags=["Workouts"])
async def adjust_workout_day_endpoint(
    request: AdjustWorkoutDayRequest,
) -> WorkoutDay:
    """Adjust a single workout day based on live user feedback."""

    try:
        return await adjust_workout_day(
            request.current_day_data,
            request.user_feedback,
        )
    except WorkoutServiceConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except WorkoutServiceResponseError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    except WorkoutServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@app.post("/api/workouts/save", tags=["Workouts"])
def save_completed_workout(
    request: WorkoutLogRequest,
    db: Session = Depends(get_db_session),
) -> dict[str, int | str]:
    """Persist a co-piloted workout day and the associated user profile."""

    try:
        profile = request.user_profile
        user = _upsert_user_from_profile(db, profile)

        db.flush()

        workout_plan = DBWorkoutPlan(
            user_id=user.id,
            week_label=request.day_name,
            is_completed=False,
        )
        db.add(workout_plan)
        db.flush()

        for chosen_exercise in request.chosen_exercises:
            db.add(
                DBExercise(
                    workout_plan_id=workout_plan.id,
                    name=chosen_exercise.chosen_exercise_name,
                    target_sub_muscle=chosen_exercise.target_sub_muscle,
                    biomechanical_reason=chosen_exercise.biomechanical_reason,
                    reps_goal=chosen_exercise.reps,
                    rest_goal=chosen_exercise.recommended_rest,
                    actual_reps=None,
                    actual_weight=None,
                    user_notes=f"Target sets: {chosen_exercise.sets}",
                    is_completed=False,
                )
            )

        db.commit()
        return {
            "status": "saved",
            "workout_plan_id": int(workout_plan.id),
            "exercise_count": len(request.chosen_exercises),
        }
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save workout data to the database.",
        ) from exc


@app.post(
    "/api/workouts/weeks",
    response_model=WorkoutWeekCreateResponse,
    tags=["Workouts"],
)
def save_workout_week(
    request: WorkoutWeekCreateRequest,
    db: Session = Depends(get_db_session),
) -> WorkoutWeekCreateResponse:
    """Persist a full generated workout week with child days."""

    try:
        user = _upsert_user_from_profile(db, request.user_profile)
        db.flush()

        current_week_count = db.execute(
            select(func.count(DBWorkoutWeek.id)).where(DBWorkoutWeek.user_id == user.id)
        ).scalar_one()
        workout_week = DBWorkoutWeek(
            user_id=user.id,
            week_index=int(current_week_count) + 1,
            title=request.plan_title,
            is_completed=False,
        )
        db.add(workout_week)
        db.flush()

        for day in request.days:
            workout_day = DBWorkoutDay(
                week_id=workout_week.id,
                day_order=day.day_order,
                day_name=day.day_name,
                is_completed=False,
            )
            db.add(workout_day)
            db.flush()

            for chosen_exercise in day.chosen_exercises:
                db.add(
                DBExercise(
                    workout_day_id=workout_day.id,
                    name=chosen_exercise.chosen_exercise_name,
                    target_sub_muscle=chosen_exercise.target_sub_muscle,
                    biomechanical_reason=chosen_exercise.biomechanical_reason,
                    reps_goal=chosen_exercise.reps,
                    rest_goal=chosen_exercise.recommended_rest,
                    actual_reps=None,
                    actual_weight=None,
                    user_notes=f"Target sets: {chosen_exercise.sets}",
                    is_completed=False,
                )
                )

        db.commit()
        return WorkoutWeekCreateResponse(
            status="saved",
            week_id=workout_week.id,
            week_index=workout_week.week_index,
            day_count=len(request.days),
        )
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save the workout week to the database.",
        ) from exc


@app.get(
    "/api/workouts/history",
    response_model=list[WorkoutPlanHistoryResponse],
    tags=["Workouts"],
)
def get_workout_history(
    username: str = Query(..., min_length=3),
    db: Session = Depends(get_db_session),
) -> list[WorkoutPlanHistoryResponse]:
    """Fetch all saved workout plans and their exercise selections."""

    try:
        user = db.execute(
            select(DBUser).where(DBUser.username == username)
        ).scalar_one_or_none()
        if user is None:
            return []

        workout_plans = db.execute(
            select(DBWorkoutPlan)
            .options(
                selectinload(DBWorkoutPlan.exercises).selectinload(DBExercise.set_logs)
            )
            .where(DBWorkoutPlan.user_id == user.id)
            .order_by(DBWorkoutPlan.created_date.desc())
        ).scalars().all()

        return [
            WorkoutPlanHistoryResponse(
                plan_id=workout_plan.id,
                label=workout_plan.week_label,
                created_date=workout_plan.created_date,
                is_completed=workout_plan.is_completed,
                exercises=[
                    ExerciseHistoryResponse(
                        exercise_id=exercise.id,
                        target_sub_muscle=exercise.target_sub_muscle,
                        name=exercise.name,
                        sets=_extract_target_sets(exercise.user_notes),
                        reps_goal=exercise.reps_goal,
                        recommended_rest=exercise.rest_goal,
                        biomechanical_reason=exercise.biomechanical_reason,
                        set_logs=[
                            SetLogResponse(
                                id=set_log.id,
                                set_number=set_log.set_number,
                                weight_kg=set_log.weight_kg,
                                reps=set_log.reps,
                                completed=set_log.completed,
                            )
                            for set_log in exercise.set_logs
                        ],
                    )
                    for exercise in workout_plan.exercises
                ],
            )
            for workout_plan in workout_plans
        ]
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load workout history from the database.",
        ) from exc


@app.get(
    "/api/workouts/weeks",
    response_model=list[WorkoutWeekResponse],
    tags=["Workouts"],
)
def get_workout_weeks(
    username: str = Query(..., min_length=3),
    db: Session = Depends(get_db_session),
) -> list[WorkoutWeekResponse]:
    """Fetch all saved workout weeks for a user."""

    try:
        user = db.execute(
            select(DBUser).where(DBUser.username == username)
        ).scalar_one_or_none()
        if user is None:
            return []

        workout_weeks = db.execute(
            select(DBWorkoutWeek)
            .options(
                selectinload(DBWorkoutWeek.days)
                .selectinload(DBWorkoutDay.exercises)
                .selectinload(DBExercise.set_logs),
                selectinload(DBWorkoutWeek.weekly_feedback),
            )
            .where(DBWorkoutWeek.user_id == user.id)
            .order_by(DBWorkoutWeek.created_date.desc())
        ).scalars().all()

        return [_serialize_week_response(workout_week) for workout_week in workout_weeks]
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load workout weeks from the database.",
        ) from exc


@app.get(
    "/api/workouts/weeks/{week_id}",
    response_model=WorkoutWeekResponse,
    tags=["Workouts"],
)
def get_workout_week(
    week_id: int,
    db: Session = Depends(get_db_session),
) -> WorkoutWeekResponse:
    """Fetch one saved workout week with child days and feedback."""

    try:
        workout_week = db.execute(
            select(DBWorkoutWeek)
            .options(
                selectinload(DBWorkoutWeek.days)
                .selectinload(DBWorkoutDay.exercises)
                .selectinload(DBExercise.set_logs),
                selectinload(DBWorkoutWeek.weekly_feedback),
            )
            .where(DBWorkoutWeek.id == week_id)
        ).scalar_one_or_none()
        if workout_week is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workout week not found.",
            )

        return _serialize_week_response(workout_week)
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load the workout week.",
        ) from exc


@app.post(
    "/api/workouts/log_set",
    response_model=SetLogResponse,
    tags=["Workouts"],
)
def log_workout_set(
    payload: SetLogCreate,
    exercise_id: int = Query(..., ge=1),
    db: Session = Depends(get_db_session),
) -> SetLogResponse:
    """Persist one performed set for an exercise in active workout mode."""

    try:
        exercise = db.execute(
            select(DBExercise).where(DBExercise.id == exercise_id)
        ).scalar_one_or_none()
        if exercise is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Exercise not found.",
            )

        set_log = DBSetLog(
            exercise_id=exercise_id,
            set_number=payload.set_number,
            weight_kg=payload.weight_kg,
            reps=payload.reps,
            completed=True,
        )
        db.add(set_log)
        db.flush()
        db.commit()
        db.refresh(set_log)

        return SetLogResponse(
            id=set_log.id,
            set_number=set_log.set_number,
            weight_kg=set_log.weight_kg,
            reps=set_log.reps,
            completed=set_log.completed,
        )
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to log the performed set.",
        ) from exc


@app.post("/api/workouts/finish_day/{day_id}", tags=["Workouts"])
def finish_workout_day(
    day_id: int,
    db: Session = Depends(get_db_session),
) -> dict[str, int | str | bool]:
    """Mark a saved workout day as completed."""

    try:
        workout_plan = db.execute(
            select(DBWorkoutPlan).where(DBWorkoutPlan.id == day_id)
        ).scalar_one_or_none()
        if workout_plan is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workout day not found.",
            )

        workout_plan.is_completed = True
        db.commit()
        return {
            "status": "completed",
            "day_id": workout_plan.id,
            "is_completed": workout_plan.is_completed,
        }
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to finish the workout day.",
        ) from exc


@app.post(
    "/api/workouts/weeks/{week_id}/days/{day_id}/complete",
    response_model=CompleteWorkoutDayResponse,
    tags=["Workouts"],
)
def complete_week_workout_day(
    week_id: int,
    day_id: int,
    db: Session = Depends(get_db_session),
) -> CompleteWorkoutDayResponse:
    """Mark one child workout day as completed and return week completion state."""

    try:
        workout_day = db.execute(
            select(DBWorkoutDay)
            .where(DBWorkoutDay.id == day_id, DBWorkoutDay.week_id == week_id)
        ).scalar_one_or_none()
        if workout_day is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workout day not found in the specified week.",
            )

        workout_day.is_completed = True
        if workout_day.completed_at is None:
            workout_day.completed_at = datetime.utcnow()

        workout_week = db.execute(
            select(DBWorkoutWeek)
            .options(selectinload(DBWorkoutWeek.days))
            .where(DBWorkoutWeek.id == week_id)
        ).scalar_one()
        week_completed = all(day.is_completed for day in workout_week.days)
        workout_week.is_completed = week_completed
        db.commit()

        return CompleteWorkoutDayResponse(
            week_id=workout_week.id,
            day_id=workout_day.id,
            day_completed=workout_day.is_completed,
            week_completed=week_completed,
        )
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark the workout day completed.",
        ) from exc


@app.post(
    "/api/workouts/weeks/{week_id}/feedback",
    response_model=WeeklyFeedbackResponse,
    tags=["Workouts"],
)
def submit_weekly_feedback(
    week_id: int,
    request: WeeklyFeedbackRequest,
    db: Session = Depends(get_db_session),
) -> WeeklyFeedbackResponse:
    """Persist free-text weekly feedback after all workout days are complete."""

    try:
        workout_week = db.execute(
            select(DBWorkoutWeek)
            .options(
                selectinload(DBWorkoutWeek.days),
                selectinload(DBWorkoutWeek.weekly_feedback),
            )
            .where(DBWorkoutWeek.id == week_id)
        ).scalar_one_or_none()
        if workout_week is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workout week not found.",
            )

        if not workout_week.days or not all(day.is_completed for day in workout_week.days):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Weekly feedback is only allowed once all workout days are completed.",
            )

        feedback = workout_week.weekly_feedback
        if feedback is None:
            feedback = DBWeeklyFeedback(
                week_id=workout_week.id,
                feedback_text=request.feedback_text,
            )
            db.add(feedback)
            db.flush()
        else:
            feedback.feedback_text = request.feedback_text

        db.commit()
        db.refresh(feedback)
        return WeeklyFeedbackResponse(
            feedback_id=feedback.id,
            week_id=feedback.week_id,
            feedback_text=feedback.feedback_text,
            created_date=feedback.created_date,
        )
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save weekly feedback.",
        ) from exc


@app.post(
    "/api/workouts/weeks/{week_id}/generate-next",
    response_model=WorkoutWeekResponse,
    tags=["Workouts"],
)
async def generate_next_workout_week(
    week_id: int,
    db: Session = Depends(get_db_session),
) -> WorkoutWeekResponse:
    """Generate and persist the next workout week from feedback and logged performance."""

    try:
        source_week = db.execute(
            select(DBWorkoutWeek)
            .options(
                selectinload(DBWorkoutWeek.user),
                selectinload(DBWorkoutWeek.days)
                .selectinload(DBWorkoutDay.exercises)
                .selectinload(DBExercise.set_logs),
                selectinload(DBWorkoutWeek.weekly_feedback),
            )
            .where(DBWorkoutWeek.id == week_id)
        ).scalar_one_or_none()
        if source_week is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workout week not found.",
            )

        if not source_week.is_completed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Next week can only be generated from a fully completed week.",
            )

        if source_week.weekly_feedback is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Weekly feedback must be submitted before generating the next week.",
            )

        existing_next_week = db.execute(
            select(DBWorkoutWeek).where(
                DBWorkoutWeek.user_id == source_week.user_id,
                DBWorkoutWeek.week_index == source_week.week_index + 1,
            )
        ).scalar_one_or_none()
        if existing_next_week is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The next workout week has already been generated.",
            )

        user = source_week.user
        user_profile = UserProfile(
            username=user.username,
            gender=user.gender,
            age=user.age,
            height_cm=user.height_cm,
            weight_kg=user.weight_kg,
            body_proportion=user.body_proportion,
            dietary_goal=user.dietary_goal,
            recovery_capacity=user.recovery_capacity,
            experience_level=user.experience_level,
            days_per_week=user.days_per_week,
            session_length_mins=user.session_length_mins,
            primary_goal=user.primary_goal,
            focus_areas=user.focus_areas,
            injuries_limitations=user.injuries_limitations,
            equipment_access=user.equipment_access,
        )
        previous_week_data = _serialize_week_response(source_week).model_dump(mode="json")

        next_plan = await generate_next_week_plan(
            user_profile,
            previous_week_data,
            source_week.weekly_feedback.feedback_text,
        )
        next_week = _create_week_from_generated_plan(db, user, next_plan)
        db.commit()

        persisted_next_week = db.execute(
            select(DBWorkoutWeek)
            .options(
                selectinload(DBWorkoutWeek.days)
                .selectinload(DBWorkoutDay.exercises)
                .selectinload(DBExercise.set_logs),
                selectinload(DBWorkoutWeek.weekly_feedback),
            )
            .where(DBWorkoutWeek.id == next_week.id)
        ).scalar_one()
        return _serialize_week_response(persisted_next_week)
    except HTTPException:
        db.rollback()
        raise
    except WorkoutServiceConfigurationError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except WorkoutServiceResponseError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    except WorkoutServiceError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate and save the next workout week.",
        ) from exc


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
