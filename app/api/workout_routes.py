"""API routes for workout generation and exercise swap operations."""

from fastapi import APIRouter, HTTPException, status

from app.models.fitness_models import (
    ExerciseSwapRequest,
    ExerciseSwapResponse,
    UserProfile,
    WorkoutPlan,
)
from app.services.workout_service import (
    WorkoutServiceConfigurationError,
    WorkoutServiceError,
    WorkoutServiceResponseError,
    generate_exercise_swap,
    generate_workout_plan,
)

router = APIRouter()


@router.post("/generate", response_model=WorkoutPlan)
async def generate_workout_plan_route(user_profile: UserProfile) -> WorkoutPlan:
    """Generate a personalized workout plan for the requesting user."""

    try:
        return await generate_workout_plan(user_profile)
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


@router.post("/swap", response_model=ExerciseSwapResponse)
async def generate_exercise_swap_route(
    swap_request: ExerciseSwapRequest,
) -> ExerciseSwapResponse:
    """Generate structured exercise substitutions for the current workout."""

    try:
        return await generate_exercise_swap(swap_request)
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
