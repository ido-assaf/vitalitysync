"""Service-layer business logic for workout generation and exercise swaps."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Optional, TypeVar

import cohere
from dotenv import load_dotenv
from google import genai
from google.genai import errors, types
from pydantic import BaseModel, ValidationError

from app.models.fitness_models import (
    ExerciseSwapRequest,
    ExerciseSwapResponse,
    UserProfile,
    WorkoutDay,
    WorkoutPlan,
)

logger = logging.getLogger(__name__)

DEFAULT_WORKOUT_MODEL = "gemini-2.5-flash"
DEFAULT_SWAP_MODEL = "gemini-2.5-flash"
DEFAULT_COHERE_MODEL = "command-a-03-2025"

ModelT = TypeVar("ModelT", bound=BaseModel)


class WorkoutServiceError(RuntimeError):
    """Raised when workout service logic cannot complete successfully."""


class WorkoutServiceConfigurationError(WorkoutServiceError):
    """Raised when required service configuration is missing or invalid."""


class WorkoutServiceResponseError(WorkoutServiceError):
    """Raised when the model response is missing or violates expectations."""


@dataclass(frozen=True)
class GeminiSettings:
    """Configuration required to interact with the Gemini API."""

    api_key: Optional[str]
    cohere_api_key: Optional[str]
    workout_model: str
    swap_model: str
    cohere_model: str


@lru_cache(maxsize=1)
def _get_settings() -> GeminiSettings:
    """Load and cache environment-backed Gemini settings."""

    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    cohere_api_key = os.getenv("COHERE_API_KEY")

    workout_model = os.getenv("GEMINI_WORKOUT_MODEL", DEFAULT_WORKOUT_MODEL)
    swap_model = os.getenv("GEMINI_SWAP_MODEL", DEFAULT_SWAP_MODEL)
    cohere_model = os.getenv("COHERE_MODEL", DEFAULT_COHERE_MODEL)

    return GeminiSettings(
        api_key=api_key,
        cohere_api_key=cohere_api_key,
        workout_model=workout_model,
        swap_model=swap_model,
        cohere_model=cohere_model,
    )


@lru_cache(maxsize=1)
def _get_gemini_client() -> Optional[genai.Client]:
    """Create and cache a shared Gemini client for service calls."""

    settings = _get_settings()
    if not settings.api_key:
        return None
    return genai.Client(api_key=settings.api_key)


@lru_cache(maxsize=1)
def _get_cohere_client() -> Optional[cohere.ClientV2]:
    """Create and cache a shared Cohere client for fallback service calls."""

    settings = _get_settings()
    if not settings.cohere_api_key:
        return None
    return cohere.ClientV2(api_key=settings.cohere_api_key)


def _format_list(values: list[str]) -> str:
    """Format a string list for prompt readability."""

    return ", ".join(values) if values else "None provided"


def _sanitize_json_schema(schema: Any) -> Any:
    """Recursively strip JSON Schema keys Gemini rejects from Pydantic output."""

    if isinstance(schema, dict):
        sanitized: dict[str, Any] = {}
        for key, value in schema.items():
            if key in {
                "title",
                "additionalProperties",
                "additional_properties",
                "minLength",
                "maxLength",
                "minimum",
                "maximum",
                "exclusiveMinimum",
                "exclusiveMaximum",
                "pattern",
            }:
                continue
            sanitized[key] = _sanitize_json_schema(value)
        return sanitized

    if isinstance(schema, list):
        return [_sanitize_json_schema(item) for item in schema]

    return schema


def _build_response_json_schema(schema_model: type[BaseModel]) -> dict[str, Any]:
    """Build a Gemini-compatible JSON Schema from a Pydantic model."""

    return _sanitize_json_schema(schema_model.model_json_schema())


def _extract_cohere_text(response: Any) -> str:
    """Extract the structured JSON text from a Cohere Chat response."""

    message = getattr(response, "message", None)
    content = getattr(message, "content", None) if message is not None else None
    if not content:
        raise WorkoutServiceResponseError(
            "Cohere returned no structured payload for the requested schema."
        )

    for item in content:
        text = getattr(item, "text", None)
        if isinstance(text, str) and text.strip():
            return text
        if isinstance(item, dict):
            dict_text = item.get("text")
            if isinstance(dict_text, str) and dict_text.strip():
                return dict_text

    raise WorkoutServiceResponseError(
        "Cohere returned no structured text payload for the requested schema."
    )


def _warn_fallback(message: str) -> None:
    """Emit a visible warning when provider fallback is triggered."""

    logger.warning(message)
    print(message)


async def _generate_with_gemini(
    *,
    schema_model: type[ModelT],
    model_name: str,
    system_instruction: str,
    user_contents: str,
) -> ModelT:
    """Generate structured output with Gemini."""

    client = _get_gemini_client()
    if client is None:
        raise WorkoutServiceConfigurationError(
            "GEMINI_API_KEY is not configured in the environment."
        )

    response_schema = _build_response_json_schema(schema_model)
    response = await client.aio.models.generate_content(
        model=model_name,
        contents=user_contents,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_json_schema=response_schema,
            temperature=0.3,
        ),
    )
    return _parse_structured_response(response, schema_model)


async def _generate_with_cohere(
    *,
    schema_model: type[ModelT],
    system_instruction: str,
    user_message: str,
) -> ModelT:
    """Generate structured output with Cohere JSON mode."""

    settings = _get_settings()
    client = _get_cohere_client()
    if client is None:
        raise WorkoutServiceConfigurationError(
            "COHERE_API_KEY is not configured in the environment."
        )

    response_schema = _build_response_json_schema(schema_model)
    response = await asyncio.to_thread(
        client.chat,
        model=settings.cohere_model,
        messages=[
            {"role": "system", "content": system_instruction},
            {
                "role": "user",
                "content": (
                    "Generate a valid JSON object only, strictly matching the schema. "
                    f"{user_message}"
                ),
            },
        ],
        response_format={
            "type": "json_object",
            "schema": response_schema,
        },
    )
    return schema_model.model_validate_json(_extract_cohere_text(response))


async def _generate_with_fallback(
    *,
    schema_model: type[ModelT],
    gemini_model: str,
    system_instruction: str,
    gemini_contents: str,
    cohere_user_message: str,
) -> ModelT:
    """Run Gemini first and fall back to Cohere when Gemini is unavailable or fails."""

    try:
        return await _generate_with_gemini(
            schema_model=schema_model,
            model_name=gemini_model,
            system_instruction=system_instruction,
            user_contents=gemini_contents,
        )
    except WorkoutServiceConfigurationError:
        if _get_cohere_client() is None:
            raise
        _warn_fallback("Gemini unavailable, falling back to Cohere...")
        return await _generate_with_cohere(
            schema_model=schema_model,
            system_instruction=system_instruction,
            user_message=cohere_user_message,
        )
    except errors.APIError as exc:
        fallback_message = (
            "Gemini Rate Limit hit, falling back to Cohere..."
            if getattr(exc, "code", None) == 429
            else "Gemini API error hit, falling back to Cohere..."
        )
        _warn_fallback(fallback_message)
        return await _generate_with_cohere(
            schema_model=schema_model,
            system_instruction=system_instruction,
            user_message=cohere_user_message,
        )


def _build_workout_plan_system_prompt(user_profile: UserProfile) -> str:
    """Build a detailed, profile-aware system prompt for co-pilot workout generation."""

    return "\n".join(
        [
            "You are an Elite Kinesiology, Biomechanics, and Periodization Expert.",
            "Create a dynamic anatomical co-pilot plan, not a static workout sheet.",
            "Return output that strictly matches the provided JSON schema.",
            "Never include prose, markdown, or extra keys outside the schema.",
            "Every workout day must contain slots, and every slot must contain exactly 3 options.",
            "",
            "Use every part of the user profile below when designing the plan:",
            f"- Username: {user_profile.username}",
            f"- Gender: {user_profile.gender}",
            f"- Age: {user_profile.age}",
            f"- Height (cm): {user_profile.height_cm}",
            f"- Weight (kg): {user_profile.weight_kg}",
            f"- Body proportion: {user_profile.body_proportion.value}",
            f"- Dietary goal: {user_profile.dietary_goal.value}",
            f"- Recovery capacity: {user_profile.recovery_capacity}/5",
            f"- Experience level: {user_profile.experience_level}",
            f"- Primary goal: {user_profile.primary_goal}",
            f"- Training days per week: {user_profile.days_per_week}",
            f"- Session length: {user_profile.session_length_mins} minutes",
            f"- Focus areas: {_format_list(user_profile.focus_areas)}",
            f"- Injuries and limitations: {user_profile.injuries_limitations}",
            f"- Equipment access: {user_profile.equipment_access}",
            "",
            "Planning rules:",
            f"- Create exactly {user_profile.days_per_week} workout days.",
            (
                "- Dynamic Scaling: Adapt the anatomical depth to the user's "
                "experience_level and days_per_week. Beginners and lower-frequency "
                "plans should use broader targets such as 'Entire Chest' or 'Entire "
                "Back'. Advanced users and higher-frequency split plans should use "
                "more precise sub-components such as 'Chest - Clavicular Head' or "
                "'Triceps - Long Head'."
            ),
            (
                "- Height and lever mechanics: Use the user's height_cm and "
                "body_proportion to refine exercise selection. Long-limbed users "
                "may benefit from more stable machine patterns, supported variations, "
                "or ROM-friendly setups when a free-weight option would create poor "
                "joint mechanics. Short-limbed and balanced users can tolerate more "
                "traditional compound patterns when otherwise appropriate."
            ),
            (
                "- Nutrition and recovery: Use dietary_goal and recovery_capacity "
                "to adjust total fatigue and slot volume. Users in a Cutting phase "
                "or with lower recovery_capacity should receive more conservative "
                "volume, fatigue management, and machine-supported choices when "
                "helpful. Users in Bulking or Maintenance with stronger recovery can "
                "tolerate slightly more total work when it fits the goal."
            ),
            (
                "- Injury Prevention: Strictly avoid exercises that aggravate the "
                "reported injuries_limitations. If the user reports pain, fragility, "
                "or a medical limitation, choose safer alternatives conservatively."
            ),
            (
                "- Equipment Constraints: Only suggest exercises that are genuinely "
                "possible with the user's equipment_access. Do not leak in barred "
                "machines, cables, benches, or barbells when that equipment tier "
                "does not support them."
            ),
            (
                "- Prioritization: Give extra slot volume, attention, or placement "
                "priority to the user's focus_areas while still preserving overall "
                "program balance."
            ),
            (
                "- Keep each day realistic within approximately "
                f"{user_profile.session_length_mins} minutes."
            ),
            (
                "- Session-Length Allocation: Fill the session intelligently using real "
                "gym math instead of stopping early. Estimate each slot using working "
                "sets, exercise-appropriate rest, and brief setup transitions. A "
                "60-minute session should usually contain roughly 4 to 6 slots unless "
                "the user's split, injuries, recovery limits, or advanced strength "
                "focus clearly justify fewer. Do not under-fill longer sessions with "
                "only 2 to 3 slots unless there is a strong coaching reason."
            ),
            (
                "- Match set and rep prescriptions to the user's primary_goal, "
                "experience_level, and the mechanics of each targeted slot."
            ),
            (
                "- Rest Prescription: Every WorkoutSlot must include recommended_rest. "
                "Use longer rest for heavy compound or highly fatiguing movements, "
                "moderate rest for machine compounds and stable secondary patterns, "
                "and shorter rest for smaller isolation work. Typical ranges should "
                "often fall around 90-180 seconds for heavy compounds, 75-120 seconds "
                "for moderate compound patterns, and 45-75 seconds for isolation work, "
                "but personalize these ranges to the goal, experience, and slot demands."
            ),
            (
                "- For each WorkoutSlot, provide exactly 3 valid options that all "
                "hit the same target_sub_muscle effectively while respecting injuries "
                "and equipment constraints."
            ),
            (
                "- Each ExerciseOption.biomechanical_reason must briefly explain why "
                "that option is mechanically appropriate for the target_sub_muscle "
                "and user context."
            ),
            (
                "- When the user lists focus areas like weak upper chest, small calves, "
                "or lagging rear delts, reflect that with more precise targeting and "
                "meaningful slot allocation."
            ),
            "- Keep day names clear and human-readable.",
            "- Use concise exercise names that are familiar to real trainees.",
            "- Do not mention unsupported anatomy, invented machines, or non-viable movements.",
            "- Populate every required field for the WorkoutPlan, WorkoutDay, WorkoutSlot, and ExerciseOption models, including recommended_rest.",
        ]
    )


def _build_workout_plan_request_context(user_profile: UserProfile) -> str:
    """Build the explicit user payload shared with the LLM providers."""

    return (
        "Generate a personalized anatomical co-pilot workout plan for this user. "
        f"User profile JSON: {user_profile.model_dump_json()}"
    )


def _build_adjust_workout_day_request_context(
    current_day_data: WorkoutDay,
    user_feedback: str,
) -> str:
    """Build the explicit day-adjustment payload shared with the LLM providers."""

    return (
        "Adjust this single workout day based on the provided real-time feedback. "
        f"Current day JSON: {current_day_data.model_dump_json()}. "
        f"User feedback: {user_feedback}"
    )


def _build_adjust_workout_day_system_prompt(
    current_day_data: WorkoutDay,
    user_feedback: str,
) -> str:
    """Build the tactical day-adjustment prompt for a single workout session."""

    return "\n".join(
        [
            "You are a tactical fitness coach.",
            (
                "You will receive a JSON representing a single workout day and a "
                "text description of a problem (like pain, fatigue, equipment "
                "issues, etc.). Your job is to return a modified JSON of ONLY "
                "that day. Adjust slot emphasis, sets, reps, or exercise options "
                "as needed to keep the user safe and effective. This can mean "
                "modifying the entire training session or just a single slot, "
                "depending on your professional coaching judgment."
            ),
            "Return output that strictly matches the provided JSON schema.",
            "Never include prose, markdown, or extra keys outside the schema.",
            "",
            f"- Current workout day JSON: {current_day_data.model_dump_json()}",
            f"- User feedback: {user_feedback}",
            "",
            "Adjustment rules:",
            "- Preserve the same day_name unless changing it is clearly necessary.",
            "- Keep the response limited to this single day only.",
            "- Keep the slot-based structure valid and usable by the UI.",
            "- Each slot must still contain exactly 3 options after the adjustment.",
            "- Make the smallest safe and effective change that addresses the feedback.",
            "- If pain or limitation is reported, prioritize safety over planned volume.",
            "- If equipment is unavailable, swap only the affected slot options when possible.",
            (
                "DYNAMIC TIME & PRIORITY ALGORITHM:\n"
                "If the user mentions a specific time constraint (e.g., '15 "
                "minutes', 'half an hour'):\n"
                "1. CALCULATE EXPECTED TIME:\n"
                "- Base time per exercise = (Number of sets * (60 seconds "
                "execution + Rest time in seconds)).\n"
                "- Add 150 seconds (2.5 mins) of transition/setup time for "
                "EVERY new exercise.\n"
                "- The total estimated time of your returned workout MUST be "
                "strictly less than or equal to the user's available time.\n"
                "2. PRIORITIZE: If the calculated time exceeds the limit, trim "
                "the workout smartly. DROP isolation exercises first (e.g., "
                "biceps, triceps, abs, calves) or make only 1 exercise per "
                "muscle - make your decision. KEEP large compound movements "
                "(e.g., squats, chest presses, rows, deadlifts).\n"
                "3. OPTIMIZE: To maximize efficiency, reduce the number of sets "
                "for secondary exercises, or combine exercises into "
                "'Supersets', before deleting core compound movements entirely.\n"
                "Apply this logic to return a realistic, highly efficient "
                "workout that mathematically fits the exact time constraint."
            ),
            "- Maintain valid target_sub_muscle, sets, reps, and option structure for every slot.",
        ]
    )


def _build_next_week_system_prompt(user_profile: UserProfile) -> str:
    """Build the coaching prompt for next-week progression from real feedback."""

    return "\n".join(
        [
            "You are an Elite Kinesiology, Biomechanics, and Periodization Expert.",
            "You are generating the next training week from a completed prior week.",
            "Return output that strictly matches the provided JSON schema.",
            "Never include prose, markdown, or extra keys outside the schema.",
            "You must preserve the prior week's overall structure as much as possible.",
            "Do not create a totally unrelated plan unless the feedback or performance clearly demands it.",
            "",
            "Use every part of the user profile below when designing the next week:",
            f"- Username: {user_profile.username}",
            f"- Gender: {user_profile.gender}",
            f"- Age: {user_profile.age}",
            f"- Height (cm): {user_profile.height_cm}",
            f"- Weight (kg): {user_profile.weight_kg}",
            f"- Body proportion: {user_profile.body_proportion.value}",
            f"- Dietary goal: {user_profile.dietary_goal.value}",
            f"- Recovery capacity: {user_profile.recovery_capacity}/5",
            f"- Experience level: {user_profile.experience_level}",
            f"- Primary goal: {user_profile.primary_goal}",
            f"- Training days per week: {user_profile.days_per_week}",
            f"- Session length: {user_profile.session_length_mins} minutes",
            f"- Focus areas: {_format_list(user_profile.focus_areas)}",
            f"- Injuries and limitations: {user_profile.injuries_limitations}",
            f"- Equipment access: {user_profile.equipment_access}",
            "",
            "Coaching rules:",
            "- Preserve the same number of workout days unless feedback clearly justifies a change.",
            "- Preserve the same day names and general day themes whenever possible.",
            "- Preserve the same broad target_sub_muscle sequencing whenever possible.",
            "- Aim for normal week-to-week progression when feedback and logged performance support it.",
            (
                "- If feedback says the load was too high, recovery was poor, fatigue was excessive, "
                "or pain occurred, reduce or modify only the volume, rep ranges, exercise choices, "
                "or difficulty that the feedback justifies."
            ),
            (
                "- If feedback says the work felt easy or the user outperformed the targets, "
                "progress only the relevant slots using modest rep, set, or exercise difficulty increases."
            ),
            "- Use the performed set logs as real evidence of how the week actually went.",
            "- Respect injuries, biomechanics, equipment access, and recovery capacity conservatively.",
            "- Keep each workout realistic within the user's session_length_mins.",
            (
                "- Session-Length Allocation: Preserve the prior week's structure, but "
                "make sure each day still fills the user's available time realistically. "
                "Estimate time using working sets, exercise-appropriate rest, and brief "
                "setup transitions. A 60-minute session should usually contain roughly "
                "4 to 6 slots unless the user's split, recovery, or heavy strength "
                "focus clearly justifies fewer."
            ),
            (
                "- Rest Prescription: Every WorkoutSlot must include recommended_rest. "
                "Use longer rest for heavy compound or highly fatiguing movements, "
                "moderate rest for stable secondary patterns, and shorter rest for "
                "smaller isolation work. Adjust the exact range based on weekly "
                "feedback, performance, primary_goal, and exercise demands."
            ),
            (
                "- For each WorkoutSlot, provide exactly 3 valid options and place your best recommended "
                "default option first, because the first option may be used as the default persisted movement."
            ),
            "- Keep day names clear and human-readable.",
            "- Populate every required field for WorkoutPlan, WorkoutDay, WorkoutSlot, and ExerciseOption, including recommended_rest.",
        ]
    )


def _build_next_week_request_context(
    user_profile: UserProfile,
    previous_week_data: dict[str, Any],
    weekly_feedback: str,
) -> str:
    """Build the explicit next-week coaching context shared with LLM providers."""

    serialized_week = json.dumps(previous_week_data, ensure_ascii=True)
    return (
        "Generate the next workout week from this completed prior week. "
        "Use the previous week's structure as the base, use the logged set performance "
        "and free-text feedback as the reason for any change, and preserve as much of "
        f"the plan as possible. User profile JSON: {user_profile.model_dump_json()}. "
        f"Previous completed week JSON: {serialized_week}. "
        f"Weekly feedback: {weekly_feedback}"
    )


def _build_exercise_swap_system_prompt(
    swap_request: ExerciseSwapRequest,
) -> str:
    """Build a detailed system prompt for generating exercise alternatives."""

    return "\n".join(
        [
            "You are the exercise-substitution engine for the Smart Fitness App.",
            "Interpret the user's free-text message and return structured swap options.",
            "Return output that strictly matches the provided JSON schema.",
            "Never include prose, markdown, or extra keys outside the schema.",
            "",
            "Swap context:",
            f"- Original exercise id: {swap_request.original_exercise_id}",
            f"- User message: {swap_request.user_message}",
            f"- Workout location: {swap_request.workout_location}",
            f"- Available equipment right now: {_format_list(swap_request.available_equipment)}",
            "",
            "Swap rules:",
            (
                "You are an expert physical therapist and elite strength coach. "
                "When providing alternative options, you MUST follow this "
                "biomechanical checklist internally before answering:\n"
                "1. Analysis: What are the primary moving joints and loaded "
                "structures (e.g., spine, knees) of the original exercise?\n"
                "2. Constraint Check: Analyze the user_message. Is it a "
                "mechanical constraint (e.g., 'machine taken') or a "
                "physiological one (e.g., 'lower back pain')?\n"
                "3. Selection: Generate alternatives that target the EXACT SAME "
                "primary muscle group, but completely avoid the user's specific "
                "constraint. For example, DO NOT suggest exercises with high "
                "axial loading if the user complains of lower back pain.\n"
                "Your returned interpreted_reason must explicitly reflect this "
                "professional analysis."
            ),
            "- Infer the user's core issue from the natural-language message.",
            (
                "- Set interpreted_reason to a short, normalized internal label such as "
                "'Equipment Unavailable', 'Pain or Injury', or 'Too Hard'."
            ),
            "- Return between 1 and 3 realistic alternative exercises.",
            "- Match the original exercise's likely movement pattern or training intent when possible.",
            "- Respect the workout location and only use currently available equipment.",
            "- Favor safer and lower-impact substitutions if the user mentions pain or discomfort.",
            "- Populate every required field for each alternative exercise.",
            "- Use concise, stable exercise ids.",
        ]
    )


def _parse_structured_response(response: object, schema: type[ModelT]) -> ModelT:
    """Parse Gemini structured output, with a JSON fallback for robustness."""

    # When Gemini honors the schema directly, the SDK surfaces a parsed object here.
    parsed_response = getattr(response, "parsed", None)
    if parsed_response is not None:
        if isinstance(parsed_response, schema):
            return parsed_response
        return schema.model_validate(parsed_response)

    raw_text = getattr(response, "text", None)
    if isinstance(raw_text, str) and raw_text.strip():
        return schema.model_validate_json(raw_text)

    raise WorkoutServiceResponseError(
        "Gemini returned no structured payload for the requested schema."
    )


def _validate_plan_shape(plan: WorkoutPlan, user_profile: UserProfile) -> WorkoutPlan:
    """Perform business-level validation that extends the schema constraints."""

    # The schema validates shape, while this check enforces a profile-driven rule.
    if len(plan.days) != user_profile.days_per_week:
        raise WorkoutServiceResponseError(
            "Gemini returned a workout plan with an unexpected number of workout days."
        )

    return plan


def _validate_swap_shape(
    swap_response: ExerciseSwapResponse,
) -> ExerciseSwapResponse:
    """Ensure the swap response respects service-level business rules."""

    # The Pydantic model guarantees at least one option; this caps the service response.
    option_count = len(swap_response.alternative_options)
    if option_count < 1 or option_count > 3:
        raise WorkoutServiceResponseError(
            "Gemini returned an invalid number of exercise alternatives."
        )

    return swap_response


def _validate_adjusted_day_shape(adjusted_day: WorkoutDay) -> WorkoutDay:
    """Ensure the adjusted workout day remains usable by the UI."""

    if not adjusted_day.slots:
        raise WorkoutServiceResponseError(
            "Gemini returned an adjusted workout day without any workout slots."
        )

    return adjusted_day


def _validate_next_week_shape(
    plan: WorkoutPlan,
    user_profile: UserProfile,
    previous_week_data: dict[str, Any],
) -> WorkoutPlan:
    """Validate that the generated next week still preserves weekly structure."""

    plan = _validate_plan_shape(plan, user_profile)
    previous_day_count = len(previous_week_data.get("days", []))
    if previous_day_count and len(plan.days) != previous_day_count:
        raise WorkoutServiceResponseError(
            "The provider returned a next-week plan with an unexpected number of workout days."
        )
    return plan


async def generate_workout_plan(user_profile: UserProfile) -> WorkoutPlan:
    """Generate a personalized workout plan using Gemini structured output."""

    settings = _get_settings()
    system_instruction = _build_workout_plan_system_prompt(user_profile)

    try:
        request_context = _build_workout_plan_request_context(user_profile)
        plan = await _generate_with_fallback(
            schema_model=WorkoutPlan,
            gemini_model=settings.workout_model,
            system_instruction=system_instruction,
            gemini_contents=request_context,
            cohere_user_message=request_context,
        )
        return _validate_plan_shape(plan, user_profile)
    except WorkoutServiceError:
        raise
    except ValidationError as exc:
        logger.exception("The provider returned an invalid workout plan payload.")
        raise WorkoutServiceResponseError(
            "The provider returned workout plan data that failed schema validation."
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error while generating workout plan.")
        raise WorkoutServiceError(
            "Unexpected error while generating workout plan."
        ) from exc


async def generate_exercise_swap(
    swap_request: ExerciseSwapRequest,
) -> ExerciseSwapResponse:
    """Generate structured exercise swap alternatives from free-text input."""

    settings = _get_settings()
    client = _get_gemini_client()
    if client is None:
        raise WorkoutServiceConfigurationError(
            "GEMINI_API_KEY is not configured in the environment."
        )
    response_schema = _build_response_json_schema(ExerciseSwapResponse)

    try:
        response = await client.aio.models.generate_content(
            model=settings.swap_model,
            contents="Generate exercise swap alternatives for the current situation.",
            config=types.GenerateContentConfig(
                system_instruction=_build_exercise_swap_system_prompt(swap_request),
                response_mime_type="application/json",
                response_json_schema=response_schema,
                temperature=0.2,
            ),
        )
        swap_response = _parse_structured_response(response, ExerciseSwapResponse)
        return _validate_swap_shape(swap_response)
    except WorkoutServiceError:
        raise
    except errors.APIError as exc:
        logger.exception("Gemini API error while generating exercise swap.")
        error_code = getattr(exc, "code", "unknown")
        error_message = getattr(exc, "message", str(exc))
        raise WorkoutServiceError(
            "Gemini API error while generating exercise swap: "
            f"{error_code} {error_message}"
        ) from exc
    except ValidationError as exc:
        logger.exception("Gemini returned an invalid exercise swap payload.")
        raise WorkoutServiceResponseError(
            "Gemini returned exercise swap data that failed schema validation."
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error while generating exercise swap.")
        raise WorkoutServiceError(
            "Unexpected error while generating exercise swap."
        ) from exc


async def adjust_workout_day(
    current_day_data: WorkoutDay,
    user_feedback: str,
) -> WorkoutDay:
    """Adjust a single workout day in response to live user feedback."""

    settings = _get_settings()
    system_instruction = _build_adjust_workout_day_system_prompt(
        current_day_data,
        user_feedback,
    )

    try:
        request_context = _build_adjust_workout_day_request_context(
            current_day_data,
            user_feedback,
        )
        adjusted_day = await _generate_with_fallback(
            schema_model=WorkoutDay,
            gemini_model=settings.workout_model,
            system_instruction=system_instruction,
            gemini_contents=request_context,
            cohere_user_message=request_context,
        )
        return _validate_adjusted_day_shape(adjusted_day)
    except WorkoutServiceError:
        raise
    except ValidationError as exc:
        logger.exception("The provider returned an invalid adjusted workout day payload.")
        raise WorkoutServiceResponseError(
            "The provider returned adjusted workout day data that failed schema validation."
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error while adjusting workout day.")
        raise WorkoutServiceError(
            "Unexpected error while adjusting workout day."
        ) from exc


async def generate_next_week_plan(
    user_profile: UserProfile,
    previous_week_data: dict[str, Any],
    weekly_feedback: str,
) -> WorkoutPlan:
    """Generate the next workout week from the prior week, set logs, and feedback."""

    settings = _get_settings()
    system_instruction = _build_next_week_system_prompt(user_profile)

    try:
        request_context = _build_next_week_request_context(
            user_profile,
            previous_week_data,
            weekly_feedback,
        )
        plan = await _generate_with_fallback(
            schema_model=WorkoutPlan,
            gemini_model=settings.workout_model,
            system_instruction=system_instruction,
            gemini_contents=request_context,
            cohere_user_message=request_context,
        )
        return _validate_next_week_shape(plan, user_profile, previous_week_data)
    except WorkoutServiceError:
        raise
    except ValidationError as exc:
        logger.exception("The provider returned an invalid next-week workout payload.")
        raise WorkoutServiceResponseError(
            "The provider returned next-week workout data that failed schema validation."
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error while generating the next workout week.")
        raise WorkoutServiceError(
            "Unexpected error while generating the next workout week."
        ) from exc
