"""Pydantic models for the Smart Fitness App backend."""

from datetime import datetime
from enum import Enum
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class FitnessBaseModel(BaseModel):
    """Shared base model with strict, production-friendly defaults."""

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        validate_assignment=True,
    )


class BodyProportion(str, Enum):
    """Biomechanical body-proportion categories used in deep assessment."""

    LONG_LIMBED = "Long Limbed"
    SHORT_LIMBED = "Short Limbed"
    BALANCED = "Balanced"


class DietaryGoal(str, Enum):
    """Nutrition phase labels that affect recovery expectations."""

    BULKING = "Bulking"
    CUTTING = "Cutting"
    MAINTENANCE = "Maintenance"


class Exercise(FitnessBaseModel):
    """Represents an exercise that can be used in workout planning."""

    id: str = Field(..., min_length=1, description="Unique exercise identifier.")
    name: str = Field(..., min_length=1, description="Human-readable exercise name.")
    target_muscle: str = Field(
        ...,
        min_length=1,
        description=(
            "Be highly specific. Instead of 'Chest', write 'Upper Pectorals'. "
            "Instead of 'Shoulders', write 'Lateral Deltoids'."
        ),
    )
    equipment_required: List[str] = Field(
        default_factory=list,
        description="Equipment needed to perform the exercise.",
    )
    difficulty_level: str = Field(
        ...,
        min_length=1,
        description="Difficulty level such as Beginner, Intermediate, or Advanced.",
    )
    video_url: Optional[str] = Field(
        default=None,
        description="Optional instructional video URL for the exercise.",
    )
    is_low_impact: bool = Field(
        default=False,
        description="Whether the exercise is considered low impact.",
    )


class UserProfile(FitnessBaseModel):
    """Captures the full co-pilot assessment used for anatomical planning."""

    username: str = Field(
        ...,
        min_length=3,
        description="Unique username used to load and save this athlete's profile.",
    )
    gender: str = Field(..., min_length=1, description="User gender identity.")
    age: int = Field(..., ge=1, description="User age in years.")
    height_cm: int = Field(..., ge=100, le=250, description="User height in centimeters.")
    weight_kg: float = Field(..., gt=0, description="User body weight in kilograms.")
    body_proportion: BodyProportion = Field(
        ...,
        description="Body-proportion category used to refine biomechanics and exercise choice.",
    )
    dietary_goal: DietaryGoal = Field(
        ...,
        description="Current dietary phase, which affects expected recovery and volume tolerance.",
    )
    recovery_capacity: int = Field(
        ...,
        ge=1,
        le=5,
        description="Recovery score from 1-5 based on sleep, stress, and overall resilience.",
    )
    experience_level: Literal["Beginner", "Intermediate", "Advanced"] = Field(
        ...,
        description="Training experience level used to scale anatomical complexity.",
    )
    days_per_week: int = Field(
        ...,
        ge=1,
        le=7,
        description="Number of training sessions per week.",
    )
    session_length_mins: int = Field(
        ...,
        gt=0,
        description="Typical session length available for each workout.",
    )
    primary_goal: Literal["Hypertrophy", "Strength", "Fat Loss", "Endurance"] = Field(
        ...,
        description="Primary training outcome the program should optimize for.",
    )
    focus_areas: List[str] = Field(
        default_factory=list,
        description="Specific body parts or weaknesses that should receive extra focus.",
    )
    injuries_limitations: str = Field(
        ...,
        min_length=1,
        description="Reported injuries or physical limitations, or 'None'.",
    )
    equipment_access: Literal[
        "Full Commercial Gym",
        "Home Gym (Barbell/Dumbbells)",
        "Dumbbells Only",
        "Bodyweight",
    ] = Field(
        ...,
        description="Available equipment environment that constrains exercise selection.",
    )


class ExerciseOption(FitnessBaseModel):
    """One possible exercise choice for a biomechanical workout slot."""

    name: str = Field(..., min_length=1, description="Exercise option name.")
    biomechanical_reason: str = Field(
        ...,
        min_length=1,
        description="Why this option is biomechanically appropriate for the target slot.",
    )


class WorkoutSlot(FitnessBaseModel):
    """A single anatomical training slot with three valid exercise options."""

    target_sub_muscle: str = Field(
        ...,
        min_length=1,
        description="Primary sub-muscle or anatomical region this slot should emphasize.",
    )
    sets: int = Field(..., ge=1, description="Prescribed set count for the slot.")
    reps: str = Field(
        ...,
        min_length=1,
        description="Recommended rep range or prescription for the slot.",
    )
    recommended_rest: str = Field(
        default="60-90 seconds",
        min_length=1,
        description=(
            "Recommended rest range for the slot, expressed as a human-readable "
            "range such as '60-90 seconds' or '120-150 seconds'."
        ),
    )
    options: List[ExerciseOption] = Field(
        ...,
        min_length=3,
        max_length=3,
        description="Exactly three exercise options that satisfy the slot's demands.",
    )


class WorkoutDay(FitnessBaseModel):
    """Represents one structured day in the co-piloted workout plan."""

    day_name: str = Field(
        ...,
        min_length=1,
        description="Display name for the workout day.",
    )
    slots: List[WorkoutSlot] = Field(
        default_factory=list,
        description="Ordered list of anatomical slots for the day.",
    )


class WorkoutPlan(FitnessBaseModel):
    """Represents the complete workout plan returned by the system."""

    plan_title: str = Field(
        ...,
        min_length=1,
        description="Title of the generated workout plan.",
    )
    days: List[WorkoutDay] = Field(
        default_factory=list,
        description="Ordered list of workout days in the plan.",
    )


class AdjustWorkoutDayRequest(FitnessBaseModel):
    """Request payload for adjusting a single workout day in real time."""

    current_day_data: WorkoutDay = Field(
        ...,
        description="The current structured workout day that should be adjusted.",
    )
    user_feedback: str = Field(
        ...,
        min_length=1,
        description=(
            "Real-time user feedback about the session, such as pain, fatigue, "
            "or equipment issues."
        ),
    )


class ChosenExerciseLog(FitnessBaseModel):
    """Represents one exercise option selected by the user for a workout slot."""

    target_sub_muscle: str = Field(
        ...,
        min_length=1,
        description="The anatomical slot the selected exercise is meant to train.",
    )
    chosen_exercise_name: str = Field(
        ...,
        min_length=1,
        description="The exact exercise option chosen by the user for this slot.",
    )
    sets: int = Field(
        ...,
        ge=1,
        description="Prescribed set count for the chosen exercise.",
    )
    reps: str = Field(
        ...,
        min_length=1,
        description="Rep prescription for the chosen exercise.",
    )
    recommended_rest: str = Field(
        default="Not specified",
        min_length=1,
        description="Recommended rest range saved for the chosen exercise.",
    )
    biomechanical_reason: str = Field(
        ...,
        min_length=1,
        description="Why the chosen exercise is biomechanically appropriate.",
    )


class WorkoutLogRequest(FitnessBaseModel):
    """Request payload for saving one co-piloted workout day to the database."""

    day_name: str = Field(
        ...,
        min_length=1,
        description="Name of the completed workout day or session label.",
    )
    user_profile: UserProfile = Field(
        ...,
        description="Full user profile used to create or update the persisted user record.",
    )
    chosen_exercises: List[ChosenExerciseLog] = Field(
        ...,
        min_length=1,
        description="The exercise options the user selected for this workout day.",
    )


class WorkoutWeekDayCreate(FitnessBaseModel):
    """Represents one chosen workout day when saving a full generated week."""

    day_order: int = Field(..., ge=1, description="Sequential position of the day in the week.")
    day_name: str = Field(..., min_length=1, description="Display name of the workout day.")
    chosen_exercises: List[ChosenExerciseLog] = Field(
        ...,
        min_length=1,
        description="Chosen exercises that make up this workout day.",
    )


class WorkoutWeekCreateRequest(FitnessBaseModel):
    """Request payload for saving a full workout week with child days."""

    user_profile: UserProfile = Field(
        ...,
        description="Full user profile that owns this saved workout week.",
    )
    plan_title: str = Field(
        ...,
        min_length=1,
        description="Title of the generated weekly workout plan.",
    )
    days: List[WorkoutWeekDayCreate] = Field(
        ...,
        min_length=1,
        description="Ordered workout days that belong to the saved week.",
    )


class WorkoutWeekCreateResponse(FitnessBaseModel):
    """Response payload returned after saving a full workout week."""

    status: str = Field(..., min_length=1, description="Status message for the save operation.")
    week_id: int = Field(..., ge=1, description="Database identifier of the saved workout week.")
    week_index: int = Field(..., ge=1, description="Sequential week number for the user.")
    day_count: int = Field(..., ge=1, description="Number of saved workout days in the week.")


class SetLogCreate(FitnessBaseModel):
    """Payload for logging one performed set during active workout mode."""

    set_number: int = Field(..., ge=1, description="Sequential number of the set being logged.")
    weight_kg: float = Field(..., ge=0, description="Actual weight used for the set.")
    reps: int = Field(..., ge=0, description="Actual repetitions completed in the set.")


class SetLogResponse(FitnessBaseModel):
    """Represents one persisted performed set returned by the API."""

    id: int = Field(..., ge=1, description="Database identifier for the set log.")
    set_number: int = Field(..., ge=1, description="Sequential number of the set.")
    weight_kg: float = Field(..., ge=0, description="Actual weight used.")
    reps: int = Field(..., ge=0, description="Actual repetitions completed.")
    completed: bool = Field(..., description="Whether the set log was marked completed.")


class ExerciseHistoryResponse(FitnessBaseModel):
    """Represents one saved exercise entry returned from workout history."""

    exercise_id: int = Field(..., ge=1, description="Unique identifier of the saved exercise.")
    target_sub_muscle: str = Field(
        ...,
        min_length=1,
        description="The anatomical sub-muscle target for the saved exercise.",
    )
    name: str = Field(
        ...,
        min_length=1,
        description="Saved exercise name selected by the user.",
    )
    sets: int = Field(
        ...,
        ge=1,
        description="Target set count stored for the saved exercise.",
    )
    reps_goal: str = Field(
        ...,
        min_length=1,
        description="Saved rep prescription for the exercise.",
    )
    recommended_rest: str = Field(
        ...,
        min_length=1,
        description="Saved rest recommendation for the exercise.",
    )
    biomechanical_reason: str = Field(
        ...,
        min_length=1,
        description="Why the exercise was chosen for the anatomical slot.",
    )
    set_logs: List[SetLogResponse] = Field(
        default_factory=list,
        description="Performed sets already logged for this exercise.",
    )


class WorkoutWeekDayResponse(FitnessBaseModel):
    """Represents one persisted workout day inside a saved workout week."""

    day_id: int = Field(..., ge=1, description="Unique identifier of the persisted workout day.")
    day_order: int = Field(..., ge=1, description="Sequential position of the day in the week.")
    day_name: str = Field(..., min_length=1, description="Display name of the workout day.")
    is_completed: bool = Field(
        ...,
        description="Whether the workout day has been marked completed.",
    )
    completed_at: Optional[datetime] = Field(
        default=None,
        description="Timestamp when the workout day was marked completed, if any.",
    )
    exercises: List[ExerciseHistoryResponse] = Field(
        default_factory=list,
        description="Saved exercises that belong to this workout day.",
    )


class WeeklyFeedbackRequest(FitnessBaseModel):
    """Request payload for submitting free-text feedback on a completed week."""

    feedback_text: str = Field(
        ...,
        min_length=1,
        description="Free-text weekly feedback such as fatigue, ease, or load concerns.",
    )


class WeeklyFeedbackResponse(FitnessBaseModel):
    """Represents persisted weekly feedback for a workout week."""

    feedback_id: int = Field(..., ge=1, description="Unique identifier of the feedback row.")
    week_id: int = Field(..., ge=1, description="Identifier of the associated workout week.")
    feedback_text: str = Field(..., min_length=1, description="Submitted free-text feedback.")
    created_date: datetime = Field(..., description="Timestamp when the feedback was saved.")


class WorkoutWeekResponse(FitnessBaseModel):
    """Represents one saved workout week with child days and optional feedback."""

    week_id: int = Field(..., ge=1, description="Unique identifier of the saved workout week.")
    week_index: int = Field(..., ge=1, description="Sequential week number for the user.")
    title: str = Field(..., min_length=1, description="Title of the saved workout week.")
    created_date: datetime = Field(..., description="Timestamp when the week was created.")
    is_completed: bool = Field(
        ...,
        description="Whether all workout days in the week are completed.",
    )
    feedback_submitted: bool = Field(
        ...,
        description="Whether weekly feedback has been submitted for the week.",
    )
    weekly_feedback: Optional[WeeklyFeedbackResponse] = Field(
        default=None,
        description="Optional weekly feedback linked to the workout week.",
    )
    days: List[WorkoutWeekDayResponse] = Field(
        default_factory=list,
        description="Ordered workout days that belong to the week.",
    )


class CompleteWorkoutDayResponse(FitnessBaseModel):
    """Response payload returned after marking one workout day complete."""

    week_id: int = Field(..., ge=1, description="Identifier of the parent workout week.")
    day_id: int = Field(..., ge=1, description="Identifier of the completed workout day.")
    day_completed: bool = Field(..., description="Whether the selected day is completed.")
    week_completed: bool = Field(
        ...,
        description="Whether all workout days in the week are now completed.",
    )


class WorkoutPlanHistoryResponse(FitnessBaseModel):
    """Represents one saved workout plan with its historical exercise data."""

    plan_id: int = Field(..., ge=1, description="Unique identifier of the saved plan.")
    label: str = Field(
        ...,
        min_length=1,
        description="Saved workout day or session label.",
    )
    created_date: datetime = Field(
        ...,
        description="Timestamp when the workout plan was saved.",
    )
    is_completed: bool = Field(
        ...,
        description="Whether the saved workout day has been fully completed.",
    )
    exercises: List[ExerciseHistoryResponse] = Field(
        default_factory=list,
        description="Saved exercise selections associated with the workout plan.",
    )


class ExerciseSwapRequest(FitnessBaseModel):
    """Request payload for swapping an exercise during a workout."""

    original_exercise_id: str = Field(
        ...,
        min_length=1,
        description="Identifier of the exercise the user wants to replace.",
    )
    user_message: str = Field(
        ...,
        min_length=1,
        description=(
            "Natural-language user input describing what the user is experiencing "
            "or why they want to swap the exercise, in their own words."
        ),
    )
    workout_location: str = Field(
        ...,
        min_length=1,
        description="Workout location, for example gym or home.",
    )
    available_equipment: List[str] = Field(
        default_factory=list,
        description="Equipment available at the moment of the swap request.",
    )


class ExerciseSwapResponse(FitnessBaseModel):
    """Response payload containing alternative exercise options."""

    interpreted_reason: str = Field(
        ...,
        min_length=1,
        description=(
            "Normalized internal interpretation of the user's natural-language "
            "message, such as Equipment Unavailable or Too Hard."
        ),
    )
    alternative_options: List[Exercise] = Field(
        ...,
        min_length=1,
        description="Alternative exercise options returned by the AI.",
    )
