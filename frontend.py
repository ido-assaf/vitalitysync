"""Streamlit frontend for the Anatomical Co-Pilot onboarding and dashboard flow."""

from __future__ import annotations

import re
from typing import Any

import requests
import streamlit as st
import streamlit.components.v1 as components

API_BASE_URL = "http://127.0.0.1:8000"
GENERATE_ENDPOINT = f"{API_BASE_URL}/api/workouts/generate"
SAVE_WORKOUT_ENDPOINT = f"{API_BASE_URL}/api/workouts/save"
WEEKS_ENDPOINT = f"{API_BASE_URL}/api/workouts/weeks"
HISTORY_ENDPOINT = f"{API_BASE_URL}/api/workouts/history"
USER_ENDPOINT_TEMPLATE = f"{API_BASE_URL}/api/users/{{username}}"
LOG_SET_ENDPOINT = f"{API_BASE_URL}/api/workouts/log_set"
FINISH_DAY_ENDPOINT_TEMPLATE = f"{API_BASE_URL}/api/workouts/finish_day/{{day_id}}"
COMPLETE_WEEK_DAY_ENDPOINT_TEMPLATE = (
    f"{API_BASE_URL}/api/workouts/weeks/{{week_id}}/days/{{day_id}}/complete"
)
WEEKLY_FEEDBACK_ENDPOINT_TEMPLATE = (
    f"{API_BASE_URL}/api/workouts/weeks/{{week_id}}/feedback"
)
GENERATE_NEXT_WEEK_ENDPOINT_TEMPLATE = (
    f"{API_BASE_URL}/api/workouts/weeks/{{week_id}}/generate-next"
)
REQUEST_TIMEOUT_SECONDS = 180

TITLE = "Anatomical Co-Pilot"
SUBTITLE = (
    "A biomechanics-first coaching system that onboards each athlete deeply, "
    "then builds intelligent exercise menus around their structure and recovery."
)

SCREEN_LOGIN = "LOGIN"
SCREEN_ONBOARDING = "ONBOARDING"
SCREEN_MAIN = "MAIN"

APP_MODE_MAIN = "MAIN"
APP_MODE_ACTIVE_WORKOUT = "ACTIVE_WORKOUT"

NAV_WORKOUT = "Workout Co-Pilot"
NAV_HISTORY = "My Saved Workouts"

EXPERIENCE_OPTIONS = ["Beginner", "Intermediate", "Advanced"]
PRIMARY_GOAL_OPTIONS = ["Hypertrophy", "Strength", "Fat Loss", "Endurance"]
EQUIPMENT_OPTIONS = [
    "Full Commercial Gym",
    "Home Gym (Barbell/Dumbbells)",
    "Dumbbells Only",
    "Bodyweight",
]
BODY_PROPORTION_OPTIONS = ["Long Limbed", "Short Limbed", "Balanced"]
DIETARY_GOAL_OPTIONS = ["Bulking", "Cutting", "Maintenance"]
FOCUS_AREA_OPTIONS = [
    "Weak Upper Chest",
    "Small Calves",
    "Lagging Rear Delts",
    "Weak Lats",
    "Flat Glutes",
    "Underdeveloped Quads",
    "Hamstring Weakness",
    "Core Stability",
    "Triceps Long Head",
    "Biceps Peak",
]


def _slugify(value: str) -> str:
    """Convert free text into a Streamlit-safe key fragment."""

    return re.sub(r"[^a-zA-Z0-9_-]", "_", value.strip()) or "item"


def _request_error_detail(exc: requests.exceptions.HTTPError) -> str:
    """Extract a readable error string from an HTTP error."""

    try:
        payload = exc.response.json()
    except ValueError:
        return exc.response.text or "The API returned an unexpected error."
    return payload.get("detail", "The API returned an unexpected error.")


def _request_user_profile(username: str) -> dict[str, Any]:
    """Fetch a saved user profile by username."""

    response = requests.get(
        USER_ENDPOINT_TEMPLATE.format(username=username),
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()


def _request_workout_plan(payload: dict[str, Any]) -> dict[str, Any]:
    """Send the anatomical co-pilot generation request to the backend."""

    response = requests.post(
        GENERATE_ENDPOINT,
        json=payload,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()


def _request_save_workout(payload: dict[str, Any]) -> dict[str, Any]:
    """Send the selected co-piloted workout structure to the backend."""

    response = requests.post(
        SAVE_WORKOUT_ENDPOINT,
        json=payload,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()


def _request_save_workout_week(payload: dict[str, Any]) -> dict[str, Any]:
    """Send a full saved workout week to the backend."""

    response = requests.post(
        WEEKS_ENDPOINT,
        json=payload,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()


def _request_workout_history(username: str) -> list[dict[str, Any]]:
    """Fetch saved workout history for a specific username."""

    response = requests.get(
        HISTORY_ENDPOINT,
        params={"username": username},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()


def _request_workout_weeks(username: str) -> list[dict[str, Any]]:
    """Fetch saved workout weeks for a specific username."""

    response = requests.get(
        WEEKS_ENDPOINT,
        params={"username": username},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()


def _request_log_set(exercise_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    """Log one performed set for an exercise."""

    response = requests.post(
        LOG_SET_ENDPOINT,
        params={"exercise_id": exercise_id},
        json=payload,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()


def _request_finish_day(day_id: int) -> dict[str, Any]:
    """Mark a workout day as completed."""

    response = requests.post(
        FINISH_DAY_ENDPOINT_TEMPLATE.format(day_id=day_id),
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()


def _request_complete_week_day(week_id: int, day_id: int) -> dict[str, Any]:
    """Mark one child workout day as completed inside a saved week."""

    response = requests.post(
        COMPLETE_WEEK_DAY_ENDPOINT_TEMPLATE.format(week_id=week_id, day_id=day_id),
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()


def _request_submit_weekly_feedback(week_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    """Submit free-text weekly feedback for a completed workout week."""

    response = requests.post(
        WEEKLY_FEEDBACK_ENDPOINT_TEMPLATE.format(week_id=week_id),
        json=payload,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()


def _request_generate_next_week(week_id: int) -> dict[str, Any]:
    """Generate and persist the next workout week from completed-week feedback."""

    response = requests.post(
        GENERATE_NEXT_WEEK_ENDPOINT_TEMPLATE.format(week_id=week_id),
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()


def _parse_csv_list(raw_value: str) -> list[str]:
    """Convert a comma-separated text input into a clean list."""

    return [item.strip() for item in raw_value.split(",") if item.strip()]


def _collect_focus_areas(selected_values: list[str], custom_values: str) -> list[str]:
    """Merge selected and custom focus areas into one stable list."""

    combined: list[str] = []
    for item in list(selected_values) + _parse_csv_list(custom_values):
        if item and item not in combined:
            combined.append(item)
    return combined


def _slot_selection_key(day_name: str, slot_index: int) -> str:
    """Build a stable widget key for one workout slot selection."""

    return f"slot_choice_{_slugify(day_name)}_{slot_index}"


def _escape_markdown_cell(value: Any) -> str:
    """Escape markdown table cell content for safe rendering."""

    return str(value).replace("|", "\\|").replace("\n", "<br>")


def _build_markdown_table(rows: list[dict[str, Any]]) -> str:
    """Build a markdown table from a list of dictionaries."""

    if not rows:
        return "_No saved exercises for this session._"

    headers = list(rows[0].keys())
    header_row = "| " + " | ".join(headers) + " |"
    separator_row = "| " + " | ".join("---" for _ in headers) + " |"
    body_rows = [
        "| "
        + " | ".join(_escape_markdown_cell(row.get(header, "")) for header in headers)
        + " |"
        for row in rows
    ]
    return "\n".join([header_row, separator_row, *body_rows])


def _build_set_log_table(set_logs: list[dict[str, Any]]) -> str:
    """Build a markdown table for logged sets."""

    if not set_logs:
        return "_No sets logged yet._"

    rows = [
        {
            "Set": set_log["set_number"],
            "Weight (kg)": set_log["weight_kg"],
            "Reps": set_log["reps"],
            "Completed": "Yes" if set_log.get("completed", True) else "No",
        }
        for set_log in set_logs
    ]
    return _build_markdown_table(rows)


def _parse_rest_seconds(rest_text: str) -> int:
    """Extract a practical countdown duration from a rest recommendation."""

    numbers = [int(value) for value in re.findall(r"\d+", rest_text or "")]
    if not numbers:
        return 60
    return max(numbers)


def _format_timer_seconds(total_seconds: int) -> str:
    """Format raw seconds as MM:SS for timer display."""

    minutes, seconds = divmod(max(total_seconds, 0), 60)
    return f"{minutes:02d}:{seconds:02d}"


def _handle_start_rest_timer(exercise_id: int, recommended_rest: str) -> None:
    """Start or restart the visual rest timer for one exercise."""

    duration_seconds = _parse_rest_seconds(recommended_rest)
    st.session_state[f"rest_timer_duration_{exercise_id}"] = duration_seconds
    st.session_state[f"rest_timer_token_{exercise_id}"] = (
        int(st.session_state.get(f"rest_timer_token_{exercise_id}", 0)) + 1
    )
    st.session_state[f"rest_timer_visible_{exercise_id}"] = True


def _handle_reset_rest_timer(exercise_id: int, recommended_rest: str) -> None:
    """Hide and reset the visual rest timer for one exercise."""

    st.session_state[f"rest_timer_visible_{exercise_id}"] = False
    st.session_state[f"rest_timer_duration_{exercise_id}"] = _parse_rest_seconds(
        recommended_rest
    )


def _render_rest_timer(exercise_id: int, recommended_rest: str) -> None:
    """Render a lightweight client-side countdown timer for one exercise."""

    timer_duration = _parse_rest_seconds(recommended_rest)
    timer_key = f"rest_timer_token_{exercise_id}"
    active_duration_key = f"rest_timer_duration_{exercise_id}"
    visible_key = f"rest_timer_visible_{exercise_id}"

    timer_col_1, timer_col_2 = st.columns([1.2, 1.0])
    with timer_col_1:
        st.button(
            "Start Rest Timer",
            key=f"start_rest_timer_{exercise_id}",
            use_container_width=True,
            on_click=_handle_start_rest_timer,
            args=(exercise_id, recommended_rest),
        )
    with timer_col_2:
        st.button(
            "Reset Timer",
            key=f"reset_rest_timer_{exercise_id}",
            use_container_width=True,
            on_click=_handle_reset_rest_timer,
            args=(exercise_id, recommended_rest),
        )

    if not st.session_state.get(visible_key, False):
        st.caption(f"Rest timer ready: {_format_timer_seconds(timer_duration)}")
        return

    current_duration = int(st.session_state.get(active_duration_key, timer_duration))
    current_token = int(st.session_state.get(timer_key, 0))
    components.html(
        f"""
        <div id="rest-timer-{exercise_id}" style="
            border: 1px solid rgba(49, 51, 63, 0.2);
            border-radius: 12px;
            padding: 0.85rem 1rem;
            background: linear-gradient(135deg, rgba(36, 41, 47, 0.04), rgba(36, 41, 47, 0.08));
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        ">
            <div style="font-size: 0.85rem; color: #57606a; margin-bottom: 0.35rem;">
                Recommended Rest
            </div>
            <div style="font-size: 1.8rem; font-weight: 700; letter-spacing: 0.04em;" id="timer-value-{exercise_id}">
                {_format_timer_seconds(current_duration)}
            </div>
            <div style="font-size: 0.85rem; color: #57606a; margin-top: 0.35rem;">
                {recommended_rest}
            </div>
        </div>
        <script>
            const token = "{current_token}";
            const durationSeconds = {current_duration};
            const storageKey = "rest-timer-{exercise_id}-" + token;
            const timerNode = document.getElementById("timer-value-{exercise_id}");

            function formatSeconds(totalSeconds) {{
                const safeSeconds = Math.max(totalSeconds, 0);
                const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
                const seconds = String(safeSeconds % 60).padStart(2, "0");
                return `${{minutes}}:${{seconds}}`;
            }}

            let storedEndTime = Number(window.localStorage.getItem(storageKey) || 0);
            if (!storedEndTime) {{
                storedEndTime = Date.now() + durationSeconds * 1000;
                window.localStorage.setItem(storageKey, String(storedEndTime));
            }}

            function tick() {{
                const remaining = Math.max(0, Math.ceil((storedEndTime - Date.now()) / 1000));
                timerNode.textContent = remaining === 0 ? "Rest Over!" : formatSeconds(remaining);
                if (remaining > 0) {{
                    window.requestAnimationFrame(() => setTimeout(tick, 250));
                }}
            }}

            tick();
        </script>
        """,
        height=120,
    )


def _build_current_user_profile() -> dict[str, Any]:
    """Build the onboarding profile payload from session state."""

    return {
        "username": st.session_state.onboarding_username.strip(),
        "gender": st.session_state.onboarding_gender.strip(),
        "age": int(st.session_state.onboarding_age),
        "height_cm": int(st.session_state.onboarding_height_cm),
        "weight_kg": float(st.session_state.onboarding_weight_kg),
        "body_proportion": st.session_state.onboarding_body_proportion,
        "dietary_goal": st.session_state.onboarding_dietary_goal,
        "recovery_capacity": int(st.session_state.onboarding_recovery_capacity),
        "experience_level": st.session_state.onboarding_experience_level,
        "days_per_week": int(st.session_state.onboarding_days_per_week),
        "session_length_mins": int(st.session_state.onboarding_session_length_mins),
        "primary_goal": st.session_state.onboarding_primary_goal,
        "focus_areas": _collect_focus_areas(
            st.session_state.onboarding_focus_areas,
            st.session_state.onboarding_custom_focus_areas,
        ),
        "injuries_limitations": st.session_state.onboarding_injuries_limitations.strip()
        or "None",
        "equipment_access": st.session_state.onboarding_equipment_access,
    }


def _build_day_save_payload(day: dict[str, Any]) -> dict[str, Any]:
    """Build a save payload for one workout day using the chosen slot options."""

    chosen_exercises: list[dict[str, Any]] = []

    for slot_index, slot in enumerate(day.get("slots", [])):
        selected_index = int(
            st.session_state.get(_slot_selection_key(day["day_name"], slot_index), 0)
        )
        selected_option = slot["options"][selected_index]
        chosen_exercises.append(
            {
                "target_sub_muscle": slot["target_sub_muscle"],
                "chosen_exercise_name": selected_option["name"],
                "sets": slot["sets"],
                "reps": slot["reps"],
                "recommended_rest": slot["recommended_rest"],
                "biomechanical_reason": selected_option["biomechanical_reason"],
            }
        )

    return {
        "day_name": day["day_name"],
        "user_profile": st.session_state.current_user_profile,
        "chosen_exercises": chosen_exercises,
    }


def _build_week_save_payload(plan: dict[str, Any]) -> dict[str, Any]:
    """Build a full week-save payload from the generated co-pilot plan."""

    return {
        "user_profile": st.session_state.current_user_profile,
        "plan_title": plan["plan_title"],
        "days": [
            {
                "day_order": day_index + 1,
                "day_name": day["day_name"],
                "chosen_exercises": _build_day_save_payload(day)["chosen_exercises"],
            }
            for day_index, day in enumerate(plan.get("days", []))
        ],
    }


def _handle_login() -> None:
    """Resolve the username into either MAIN or ONBOARDING state."""

    username = st.session_state.login_username.strip()
    if not username:
        st.session_state.login_error = "Please enter a username."
        st.session_state.login_message = None
        return

    try:
        profile = _request_user_profile(username)
        st.session_state.current_user_profile = profile
        st.session_state.logged_in_username = username
        st.session_state.last_payload = profile
        st.session_state.workout_plan = None
        st.session_state.workout_history = None
        st.session_state.app_mode = APP_MODE_MAIN
        st.session_state.active_week_id = None
        st.session_state.active_day_id = None
        st.session_state.screen = SCREEN_MAIN
        st.session_state.login_error = None
        st.session_state.login_message = f"Welcome back, {username}."
    except requests.exceptions.HTTPError as exc:
        if exc.response is not None and exc.response.status_code == 404:
            st.session_state.onboarding_username = username
            st.session_state.logged_in_username = username
            st.session_state.screen = SCREEN_ONBOARDING
            st.session_state.login_error = None
            st.session_state.login_message = (
                "No saved profile was found. Complete the assessment to continue."
            )
            return
        st.session_state.login_error = f"Login failed: {_request_error_detail(exc)}"
        st.session_state.login_message = None
    except requests.exceptions.ConnectionError:
        st.session_state.login_error = (
            "The FastAPI server is not reachable. Start the backend and try again."
        )
        st.session_state.login_message = None
    except requests.exceptions.Timeout:
        st.session_state.login_error = "The login request timed out. Please try again."
        st.session_state.login_message = None
    except requests.exceptions.RequestException as exc:
        st.session_state.login_error = f"Login failed: {exc}"
        st.session_state.login_message = None


def _handle_complete_onboarding() -> None:
    """Store the onboarding profile in session and advance to MAIN mode."""

    profile = _build_current_user_profile()
    st.session_state.current_user_profile = profile
    st.session_state.logged_in_username = profile["username"]
    st.session_state.last_payload = profile
    st.session_state.workout_plan = None
    st.session_state.workout_history = None
    st.session_state.app_mode = APP_MODE_MAIN
    st.session_state.active_week_id = None
    st.session_state.active_day_id = None
    st.session_state.screen = SCREEN_MAIN
    st.session_state.onboarding_error = None


def _handle_logout() -> None:
    """Return the app to the LOGIN state and clear user-bound session state."""

    st.session_state.screen = SCREEN_LOGIN
    st.session_state.logged_in_username = None
    st.session_state.current_user_profile = None
    st.session_state.workout_plan = None
    st.session_state.workout_history = None
    st.session_state.history_error = None
    st.session_state.save_error = None
    st.session_state.save_success = None
    st.session_state.app_mode = APP_MODE_MAIN
    st.session_state.active_week_id = None
    st.session_state.active_day_id = None
    st.session_state.active_mode_error = None
    st.session_state.active_mode_success = None
    st.session_state.feedback_error = None
    st.session_state.feedback_success = None
    st.session_state.coaching_error = None
    st.session_state.coaching_success = None
    st.session_state.api_error = None
    st.session_state.last_payload = None


def _handle_generate_workout() -> None:
    """Generate a new anatomical co-pilot workout plan."""

    payload = st.session_state.current_user_profile
    if not payload:
        st.session_state.api_error = "No user profile is loaded. Please log in again."
        return

    st.session_state.last_payload = payload
    st.session_state.save_error = None
    st.session_state.save_success = None

    try:
        with st.spinner("Analyzing your assessment and building slot options..."):
            st.session_state.workout_plan = _request_workout_plan(payload)
        st.session_state.api_error = None
    except requests.exceptions.ConnectionError:
        st.session_state.workout_plan = None
        st.session_state.api_error = (
            "The FastAPI server is not reachable. Start the backend at "
            "`http://127.0.0.1:8000` and try again."
        )
    except requests.exceptions.Timeout:
        st.session_state.workout_plan = None
        st.session_state.api_error = "The request timed out. Please try again."
    except requests.exceptions.HTTPError as exc:
        st.session_state.workout_plan = None
        st.session_state.api_error = f"Backend error: {_request_error_detail(exc)}"
    except requests.exceptions.RequestException as exc:
        st.session_state.workout_plan = None
        st.session_state.api_error = f"Request failed: {exc}"


def _handle_save_copiloted_workout(plan: dict[str, Any]) -> None:
    """Persist the user's final selected exercises for each workout day."""

    try:
        with st.spinner("Saving your co-piloted selections..."):
            week_payload = _build_week_save_payload(plan)
            saved_week = _request_save_workout_week(week_payload)
        st.session_state.workout_history = None
        st.session_state.save_error = None
        st.session_state.save_success = (
            f"Co-piloted workout week saved successfully as Week {saved_week['week_index']}."
        )
    except requests.exceptions.ConnectionError:
        st.session_state.save_success = None
        st.session_state.save_error = (
            "The FastAPI server is not reachable. Start the backend and try again."
        )
    except requests.exceptions.Timeout:
        st.session_state.save_success = None
        st.session_state.save_error = "The save request timed out. Please try again."
    except requests.exceptions.HTTPError as exc:
        st.session_state.save_success = None
        st.session_state.save_error = f"Save failed: {_request_error_detail(exc)}"
    except requests.exceptions.RequestException as exc:
        st.session_state.save_success = None
        st.session_state.save_error = f"Save failed: {exc}"


def _handle_load_history() -> None:
    """Load saved workout history into session state for the current user."""

    username = st.session_state.logged_in_username
    if not username:
        st.session_state.history_error = "No username is loaded. Please log in again."
        return

    try:
        with st.spinner("Loading saved workouts..."):
            st.session_state.workout_history = _request_workout_weeks(username)
        st.session_state.history_error = None
    except requests.exceptions.ConnectionError:
        st.session_state.workout_history = []
        st.session_state.history_error = (
            "The FastAPI server is not reachable. Start the backend and try again."
        )
    except requests.exceptions.Timeout:
        st.session_state.workout_history = []
        st.session_state.history_error = "The history request timed out. Please try again."
    except requests.exceptions.HTTPError as exc:
        st.session_state.workout_history = []
        st.session_state.history_error = f"History failed: {_request_error_detail(exc)}"
    except requests.exceptions.RequestException as exc:
        st.session_state.workout_history = []
        st.session_state.history_error = f"History failed: {exc}"


def _get_active_week() -> dict[str, Any] | None:
    """Return the currently active workout week from cached history."""

    active_week_id = st.session_state.get("active_week_id")
    history = st.session_state.get("workout_history") or []
    for saved_week in history:
        if saved_week["week_id"] == active_week_id:
            return saved_week
    return None


def _get_active_day() -> dict[str, Any] | None:
    """Return the currently active workout day from cached weekly history."""

    active_day_id = st.session_state.get("active_day_id")
    active_week = _get_active_week()
    if active_week is None:
        return None

    for saved_day in active_week.get("days", []):
        if saved_day["day_id"] == active_day_id:
            return saved_day
    return None


def _handle_start_workout(week_id: int, day_id: int) -> None:
    """Enter active workout mode for a saved child day inside a workout week."""

    st.session_state.active_week_id = week_id
    st.session_state.active_day_id = day_id
    st.session_state.app_mode = APP_MODE_ACTIVE_WORKOUT
    st.session_state.active_mode_error = None
    st.session_state.active_mode_success = None


def _handle_back_to_saved_week() -> None:
    """Exit active workout mode without discarding cached or persisted set logs."""

    st.session_state.app_mode = APP_MODE_MAIN
    st.session_state.main_navigation = NAV_HISTORY
    st.session_state.active_mode_error = None
    st.session_state.active_mode_success = None


def _handle_log_set(exercise_id: int) -> None:
    """Persist one performed set and update local active-mode state."""

    weight_key = f"active_weight_{exercise_id}"
    reps_key = f"active_reps_{exercise_id}"

    active_day = _get_active_day()
    if active_day is None:
        st.session_state.active_mode_error = "No active workout day is loaded."
        return

    exercise = next(
        (
            saved_exercise
            for saved_exercise in active_day.get("exercises", [])
            if saved_exercise["exercise_id"] == exercise_id
        ),
        None,
    )
    if exercise is None:
        st.session_state.active_mode_error = "The selected exercise could not be found."
        return

    payload = {
        "set_number": len(exercise.get("set_logs", [])) + 1,
        "weight_kg": float(st.session_state.get(weight_key, 0.0)),
        "reps": int(st.session_state.get(reps_key, 0)),
    }

    try:
        logged_set = _request_log_set(exercise_id, payload)
        exercise.setdefault("set_logs", []).append(logged_set)
        st.session_state.active_mode_error = None
        st.session_state.active_mode_success = (
            f"Logged set {logged_set['set_number']} for {exercise['name']}."
        )
    except requests.exceptions.ConnectionError:
        st.session_state.active_mode_error = (
            "The FastAPI server is not reachable. Start the backend and try again."
        )
    except requests.exceptions.Timeout:
        st.session_state.active_mode_error = "The set-log request timed out. Please try again."
    except requests.exceptions.HTTPError as exc:
        st.session_state.active_mode_error = f"Set log failed: {_request_error_detail(exc)}"
    except requests.exceptions.RequestException as exc:
        st.session_state.active_mode_error = f"Set log failed: {exc}"


def _handle_finish_active_workout() -> None:
    """Finish the active workout and return to the main dashboard."""

    active_week_id = st.session_state.get("active_week_id")
    active_day_id = st.session_state.get("active_day_id")
    if active_week_id is None or active_day_id is None:
        st.session_state.active_mode_error = "No active workout day is loaded."
        return

    try:
        completion_result = _request_complete_week_day(active_week_id, active_day_id)
        active_day = _get_active_day()
        active_week = _get_active_week()
        if active_day is not None:
            active_day["is_completed"] = True
        if active_week is not None:
            active_week["is_completed"] = completion_result["week_completed"]
        st.session_state.app_mode = APP_MODE_MAIN
        st.session_state.main_navigation = NAV_HISTORY
        st.session_state.active_week_id = None
        st.session_state.active_day_id = None
        st.session_state.active_mode_error = None
        st.session_state.active_mode_success = (
            "Workout finished successfully."
            if not completion_result["week_completed"]
            else "Workout finished successfully. The full week is now complete."
        )
    except requests.exceptions.ConnectionError:
        st.session_state.active_mode_error = (
            "The FastAPI server is not reachable. Start the backend and try again."
        )
    except requests.exceptions.Timeout:
        st.session_state.active_mode_error = "The finish-workout request timed out."
    except requests.exceptions.HTTPError as exc:
        st.session_state.active_mode_error = f"Finish failed: {_request_error_detail(exc)}"
    except requests.exceptions.RequestException as exc:
        st.session_state.active_mode_error = f"Finish failed: {exc}"


def _handle_submit_weekly_feedback(week_id: int) -> None:
    """Submit free-text weekly feedback for a completed workout week."""

    feedback_key = f"weekly_feedback_text_{week_id}"
    feedback_text = st.session_state.get(feedback_key, "").strip()
    if not feedback_text:
        st.session_state.feedback_error = "Please write feedback before submitting."
        st.session_state.feedback_success = None
        return

    try:
        feedback_response = _request_submit_weekly_feedback(
            week_id,
            {"feedback_text": feedback_text},
        )
        workout_history = st.session_state.get("workout_history") or []
        for saved_week in workout_history:
            if saved_week["week_id"] == week_id:
                saved_week["feedback_submitted"] = True
                saved_week["weekly_feedback"] = feedback_response
                break
        st.session_state.feedback_error = None
        st.session_state.feedback_success = "Weekly feedback saved successfully."
    except requests.exceptions.ConnectionError:
        st.session_state.feedback_error = (
            "The FastAPI server is not reachable. Start the backend and try again."
        )
        st.session_state.feedback_success = None
    except requests.exceptions.Timeout:
        st.session_state.feedback_error = "The feedback request timed out. Please try again."
        st.session_state.feedback_success = None
    except requests.exceptions.HTTPError as exc:
        st.session_state.feedback_error = f"Feedback failed: {_request_error_detail(exc)}"
        st.session_state.feedback_success = None
    except requests.exceptions.RequestException as exc:
        st.session_state.feedback_error = f"Feedback failed: {exc}"
        st.session_state.feedback_success = None


def _handle_generate_next_week(week_id: int) -> None:
    """Trigger AI coaching to generate and save the next workout week."""

    try:
        generated_week = _request_generate_next_week(week_id)
        workout_history = st.session_state.get("workout_history") or []
        workout_history.insert(0, generated_week)
        st.session_state.workout_history = workout_history
        st.session_state.coaching_error = None
        st.session_state.coaching_success = (
            f"Generated and saved Week {generated_week['week_index']} successfully."
        )
    except requests.exceptions.ConnectionError:
        st.session_state.coaching_error = (
            "The FastAPI server is not reachable. Start the backend and try again."
        )
        st.session_state.coaching_success = None
    except requests.exceptions.Timeout:
        st.session_state.coaching_error = (
            "The next-week generation request timed out. Please try again."
        )
        st.session_state.coaching_success = None
    except requests.exceptions.HTTPError as exc:
        st.session_state.coaching_error = (
            f"Next-week generation failed: {_request_error_detail(exc)}"
        )
        st.session_state.coaching_success = None
    except requests.exceptions.RequestException as exc:
        st.session_state.coaching_error = f"Next-week generation failed: {exc}"
        st.session_state.coaching_success = None


def _render_login_screen() -> None:
    """Render the professional entry screen for username login."""

    left_pad, center_col, right_pad = st.columns([1.2, 2.2, 1.2])
    with center_col:
        st.header("Welcome Back")
        st.write(
            "Enter your username to continue. Existing athletes will jump straight "
            "into the dashboard, while new athletes will unlock the full anatomical assessment."
        )
        st.text_input(
            "Username",
            key="login_username",
            placeholder="e.g. alexfit",
        )
        st.button(
            "Continue",
            key="login_continue",
            use_container_width=True,
            on_click=_handle_login,
        )

        if st.session_state.get("login_message"):
            st.info(st.session_state.login_message)
        if st.session_state.get("login_error"):
            st.error(st.session_state.login_error)


def _render_onboarding_screen() -> None:
    """Render the premium anatomical assessment form."""

    st.header("Anatomical Assessment")
    st.caption(
        "Phase A onboarding captures the structural and recovery variables that drive "
        "better biomechanics, smarter volume, and safer exercise choices."
    )

    with st.form("onboarding_form"):
        st.subheader("Physical Stats")
        stat_col_1, stat_col_2, stat_col_3 = st.columns(3)
        with stat_col_1:
            st.text_input("Username", key="onboarding_username")
            st.text_input("Gender", key="onboarding_gender")
        with stat_col_2:
            st.number_input(
                "Age",
                min_value=13,
                max_value=100,
                value=30,
                key="onboarding_age",
            )
            st.number_input(
                "Height (cm)",
                min_value=100,
                max_value=250,
                value=175,
                step=1,
                key="onboarding_height_cm",
            )
        with stat_col_3:
            st.number_input(
                "Weight (kg)",
                min_value=30.0,
                max_value=250.0,
                value=75.0,
                step=0.5,
                key="onboarding_weight_kg",
            )

        st.subheader("Biomechanics & Recovery")
        bio_col_1, bio_col_2 = st.columns(2)
        with bio_col_1:
            st.selectbox(
                "Body Proportion",
                options=BODY_PROPORTION_OPTIONS,
                key="onboarding_body_proportion",
                help="Long-limbed athletes may need more stable or machine-supported patterns.",
            )
            st.selectbox(
                "Dietary Goal",
                options=DIETARY_GOAL_OPTIONS,
                key="onboarding_dietary_goal",
            )
            st.select_slider(
                "Recovery Capacity",
                options=[1, 2, 3, 4, 5],
                value=3,
                key="onboarding_recovery_capacity",
                help="1 = low recovery capacity, 5 = excellent sleep/stress resilience.",
            )
        with bio_col_2:
            st.multiselect(
                "Focus Areas",
                options=FOCUS_AREA_OPTIONS,
                key="onboarding_focus_areas",
            )
            st.text_input(
                "Additional Focus Areas",
                key="onboarding_custom_focus_areas",
                placeholder="Optional, comma-separated",
            )
            st.text_area(
                "Injuries / Limitations",
                key="onboarding_injuries_limitations",
                height=120,
                placeholder="Example: Lower back pain with axial loading, old shoulder impingement, None",
            )

        st.subheader("Training Logistics")
        training_col_1, training_col_2, training_col_3 = st.columns(3)
        with training_col_1:
            st.selectbox(
                "Experience Level",
                options=EXPERIENCE_OPTIONS,
                key="onboarding_experience_level",
            )
            st.selectbox(
                "Primary Goal",
                options=PRIMARY_GOAL_OPTIONS,
                key="onboarding_primary_goal",
            )
        with training_col_2:
            st.slider(
                "Days Per Week",
                min_value=1,
                max_value=7,
                value=4,
                key="onboarding_days_per_week",
            )
            st.number_input(
                "Session Length (mins)",
                min_value=20,
                max_value=180,
                value=60,
                step=5,
                key="onboarding_session_length_mins",
            )
        with training_col_3:
            st.selectbox(
                "Equipment Access",
                options=EQUIPMENT_OPTIONS,
                key="onboarding_equipment_access",
            )

        submitted = st.form_submit_button(
            "Complete Assessment",
            use_container_width=True,
        )

        if submitted:
            _handle_complete_onboarding()


def _render_main_sidebar() -> None:
    """Render the sidebar for the main dashboard only."""

    if st.session_state.get("app_mode") == APP_MODE_ACTIVE_WORKOUT:
        return

    profile = st.session_state.current_user_profile or {}

    with st.sidebar:
        st.markdown(
            (
                "### User Badge\n"
                f"**@{profile.get('username', 'unknown')}**  \n"
                f"{profile.get('primary_goal', 'No goal loaded')}  \n"
                f"{profile.get('experience_level', 'No level loaded')}"
            )
        )
        st.radio(
            "Navigation",
            [NAV_WORKOUT, NAV_HISTORY],
            key="main_navigation",
        )
        if st.button("Logout", key="logout_button", use_container_width=True):
            _handle_logout()

        if st.session_state.get("main_navigation") == NAV_HISTORY:
            if st.button(
                "Refresh Saved Workouts",
                key="refresh_saved_workouts",
                use_container_width=True,
            ):
                _handle_load_history()


def _render_profile_snapshot() -> None:
    """Render a compact summary of the loaded athlete profile."""

    profile = st.session_state.current_user_profile or {}

    col_1, col_2, col_3 = st.columns(3)
    with col_1:
        st.markdown(
            (
                f"**Height / Weight**  \n"
                f"{profile.get('height_cm', '-')} cm / {profile.get('weight_kg', '-')} kg"
            )
        )
        st.markdown(f"**Body Proportion**  \n{profile.get('body_proportion', '-')}")
    with col_2:
        st.markdown(f"**Dietary Goal**  \n{profile.get('dietary_goal', '-')}")
        st.markdown(
            f"**Recovery Capacity**  \n{profile.get('recovery_capacity', '-')} / 5"
        )
    with col_3:
        st.markdown(
            f"**Training Logistics**  \n{profile.get('days_per_week', '-')} days / "
            f"{profile.get('session_length_mins', '-')} mins"
        )
        st.markdown(f"**Equipment**  \n{profile.get('equipment_access', '-')}")


def _render_slot(day_name: str, slot: dict[str, Any], slot_index: int) -> None:
    """Render one anatomical workout slot and let the user choose an option."""

    slot_key = _slot_selection_key(day_name, slot_index)

    st.markdown(f"### {slot['target_sub_muscle']}")
    st.caption(
        "Sets: "
        f"{slot['sets']} | Reps: {slot['reps']} | Rest: {slot.get('recommended_rest', 'Not specified')}"
    )

    option_labels = [
        (
            f"{option['name']}  \n"
            f"Why it fits: {option['biomechanical_reason']}"
        )
        for option in slot.get("options", [])
    ]

    st.radio(
        "Choose your preferred movement",
        options=list(range(len(option_labels))),
        index=int(st.session_state.get(slot_key, 0)),
        format_func=lambda selected_index: option_labels[selected_index],
        key=slot_key,
        horizontal=False,
        label_visibility="collapsed",
    )


def _render_workout_plan(plan: dict[str, Any]) -> None:
    """Render the generated co-pilot workout plan."""

    st.success("Your anatomical menu is ready.")
    st.subheader(plan["plan_title"])
    st.write(
        "Each slot below targets a specific muscle region. Choose the movement that "
        "best matches your structure, comfort, and gym flow."
    )

    for day_index, day in enumerate(plan.get("days", [])):
        with st.expander(day["day_name"], expanded=(day_index == 0)):
            for slot_index, slot in enumerate(day.get("slots", [])):
                _render_slot(day["day_name"], slot, slot_index)
                if slot_index < len(day.get("slots", [])) - 1:
                    st.divider()

    st.button(
        "Save Co-Piloted Workout",
        key="save_copiloted_workout",
        use_container_width=True,
        on_click=_handle_save_copiloted_workout,
        args=(plan,),
    )

    if st.session_state.get("save_error"):
        st.error(st.session_state.save_error)
    if st.session_state.get("save_success"):
        st.success(st.session_state.save_success)


def _render_workout_dashboard() -> None:
    """Render the main co-pilot dashboard for a loaded athlete."""

    st.header("Workout Co-Pilot")
    st.caption(
        "Your profile is already loaded. The dashboard now focuses purely on planning "
        "and reviewing your biomechanically filtered options."
    )
    _render_profile_snapshot()

    if st.button(
        "Generate Co-Piloted Plan",
        key="generate_plan",
        use_container_width=True,
        on_click=_handle_generate_workout,
    ):
        pass

    if st.session_state.get("api_error"):
        st.error(st.session_state.api_error)

    if st.session_state.get("workout_plan"):
        _render_workout_plan(st.session_state.workout_plan)
    else:
        st.info(
            "Generate a plan to receive slot-based exercise options tailored to your "
            "assessment profile."
        )


def _render_saved_workouts() -> None:
    """Render the saved workouts and progress history view."""

    if st.session_state.get("workout_history") is None:
        _handle_load_history()

    st.header("Saved Workouts & Progress")

    if st.session_state.get("history_error"):
        st.error(st.session_state.history_error)
        return

    history = st.session_state.get("workout_history") or []
    if not history:
        st.info("No saved workouts yet. Save your first co-piloted session to build history.")
        return

    if st.session_state.get("feedback_error"):
        st.error(st.session_state.feedback_error)
    if st.session_state.get("feedback_success"):
        st.success(st.session_state.feedback_success)
    if st.session_state.get("coaching_error"):
        st.error(st.session_state.coaching_error)
    if st.session_state.get("coaching_success"):
        st.success(st.session_state.coaching_success)

    st.subheader("Saved Weeks")
    for saved_week in history:
        week_status = "Completed" if saved_week.get("is_completed") else "In Progress"
        feedback_status = (
            "Feedback Submitted" if saved_week.get("feedback_submitted") else "Feedback Pending"
        )
        with st.expander(
            f"Week {saved_week['week_index']}: {saved_week['title']} | {week_status}",
            expanded=False,
        ):
            st.caption(
                f"Created: {saved_week['created_date']} | "
                f"Week Status: {week_status} | {feedback_status}"
            )

            for saved_day in saved_week.get("days", []):
                day_status = "Completed" if saved_day.get("is_completed") else "Ready to Train"
                row_col_1, row_col_2 = st.columns([3.4, 1.2])
                with row_col_1:
                    st.markdown(
                        f"**Day {saved_day['day_order']}: {saved_day['day_name']}**  \n"
                        f"Status: {day_status}"
                    )
                with row_col_2:
                    st.button(
                        "\U0001F680 Start Workout",
                        key=f"start_workout_{saved_week['week_id']}_{saved_day['day_id']}",
                        use_container_width=True,
                        on_click=_handle_start_workout,
                        args=(saved_week["week_id"], saved_day["day_id"]),
                    )

                for exercise in saved_day.get("exercises", []):
                    st.markdown(
                        (
                            f"**{exercise['name']}**  \n"
                            f"Target: {exercise['target_sub_muscle']}  \n"
                            f"Planned Sets/Reps: {exercise['sets']} x {exercise['reps_goal']}  \n"
                            f"Recommended Rest: {exercise.get('recommended_rest', 'Not specified')}  \n"
                            f"Reason: {exercise['biomechanical_reason']}"
                        )
                    )
                    st.markdown(_build_set_log_table(exercise.get("set_logs", [])))
                st.divider()

            if saved_week.get("is_completed") and not saved_week.get("feedback_submitted"):
                feedback_key = f"weekly_feedback_text_{saved_week['week_id']}"
                st.text_area(
                    "Weekly Feedback",
                    key=feedback_key,
                    placeholder=(
                        "Example: The workout load was too high, or I completed the "
                        "weights easily and may be ready for more next week."
                    ),
                )
                st.button(
                    "Submit Weekly Feedback",
                    key=f"submit_weekly_feedback_{saved_week['week_id']}",
                    use_container_width=True,
                    on_click=_handle_submit_weekly_feedback,
                    args=(saved_week["week_id"],),
                )
            elif saved_week.get("weekly_feedback"):
                st.info(
                    f"Weekly Feedback: {saved_week['weekly_feedback']['feedback_text']}"
                )
                st.button(
                    "Generate Next Week",
                    key=f"generate_next_week_{saved_week['week_id']}",
                    use_container_width=True,
                    on_click=_handle_generate_next_week,
                    args=(saved_week["week_id"],),
                )


def _render_active_workout_screen() -> None:
    """Render the focused active-workout logging experience."""

    active_day = _get_active_day()
    if active_day is None:
        st.error("No active workout day is loaded.")
        if st.button("Return to Dashboard", key="return_from_missing_active_day"):
            st.session_state.app_mode = APP_MODE_MAIN
            st.session_state.active_week_id = None
            st.session_state.active_day_id = None
        return

    active_week = _get_active_week()
    week_title = active_week["title"] if active_week is not None else "Workout Week"
    st.header(active_day["day_name"])
    st.caption(f"Active Workout Mode | {week_title}")

    action_col_1, action_col_2 = st.columns([1.2, 1.2])
    with action_col_1:
        st.button(
            "Back to Saved Week",
            key="back_to_saved_week",
            use_container_width=True,
            on_click=_handle_back_to_saved_week,
        )
    with action_col_2:
        st.markdown(
            f"**Week Day:** Day {active_day.get('day_order', '-')}  \n"
            f"**Status:** {'Completed' if active_day.get('is_completed') else 'In Progress'}"
        )

    if st.session_state.get("active_mode_error"):
        st.error(st.session_state.active_mode_error)
    if st.session_state.get("active_mode_success"):
        st.success(st.session_state.active_mode_success)

    for exercise in active_day.get("exercises", []):
        with st.container():
            st.markdown(f"### {exercise['name']}")
            st.caption(
                "Target: "
                f"{exercise['target_sub_muscle']} | Planned Sets: {exercise['sets']} | "
                f"Planned Reps: {exercise['reps_goal']} | "
                f"Rest: {exercise.get('recommended_rest', 'Not specified')}"
            )

            _render_rest_timer(
                exercise["exercise_id"],
                exercise.get("recommended_rest", "60 seconds"),
            )

            input_col_1, input_col_2, input_col_3 = st.columns([1.3, 1.1, 1.2])
            with input_col_1:
                st.number_input(
                    "Weight (kg)",
                    min_value=0.0,
                    value=0.0,
                    step=0.5,
                    key=f"active_weight_{exercise['exercise_id']}",
                )
            with input_col_2:
                st.number_input(
                    "Reps",
                    min_value=0,
                    value=0,
                    step=1,
                    key=f"active_reps_{exercise['exercise_id']}",
                )
            with input_col_3:
                next_set_number = len(exercise.get("set_logs", [])) + 1
                st.write("")
                st.button(
                    f"Log Set {next_set_number}",
                    key=f"log_set_{exercise['exercise_id']}",
                    use_container_width=True,
                    on_click=_handle_log_set,
                    args=(exercise["exercise_id"],),
                )

            st.markdown(_build_set_log_table(exercise.get("set_logs", [])))
            st.divider()

    st.button(
        "\U0001F3C1 Finish Workout",
        key="finish_active_workout",
        use_container_width=True,
        on_click=_handle_finish_active_workout,
    )


def _render_main_screen() -> None:
    """Render the main application dashboard after onboarding/login."""

    if st.session_state.get("app_mode") == APP_MODE_ACTIVE_WORKOUT:
        _render_active_workout_screen()
        return

    _render_main_sidebar()

    if st.session_state.get("main_navigation") == NAV_HISTORY:
        _render_saved_workouts()
    else:
        _render_workout_dashboard()


def _initialize_session_state() -> None:
    """Initialize stable session-state defaults for the app."""

    st.session_state.setdefault("screen", SCREEN_LOGIN)
    st.session_state.setdefault("logged_in_username", None)
    st.session_state.setdefault("current_user_profile", None)
    st.session_state.setdefault("main_navigation", NAV_WORKOUT)
    st.session_state.setdefault("app_mode", APP_MODE_MAIN)
    st.session_state.setdefault("active_week_id", None)
    st.session_state.setdefault("active_day_id", None)
    st.session_state.setdefault("active_mode_error", None)
    st.session_state.setdefault("active_mode_success", None)
    st.session_state.setdefault("workout_plan", None)
    st.session_state.setdefault("workout_history", None)
    st.session_state.setdefault("history_error", None)
    st.session_state.setdefault("api_error", None)
    st.session_state.setdefault("save_error", None)
    st.session_state.setdefault("save_success", None)
    st.session_state.setdefault("last_payload", None)
    st.session_state.setdefault("feedback_error", None)
    st.session_state.setdefault("feedback_success", None)
    st.session_state.setdefault("coaching_error", None)
    st.session_state.setdefault("coaching_success", None)
    st.session_state.setdefault("login_error", None)
    st.session_state.setdefault("login_message", None)
    st.session_state.setdefault("onboarding_error", None)

    st.session_state.setdefault("onboarding_username", "")
    st.session_state.setdefault("onboarding_gender", "Male")
    st.session_state.setdefault("onboarding_age", 30)
    st.session_state.setdefault("onboarding_height_cm", 175)
    st.session_state.setdefault("onboarding_weight_kg", 75.0)
    st.session_state.setdefault("onboarding_body_proportion", "Balanced")
    st.session_state.setdefault("onboarding_dietary_goal", "Maintenance")
    st.session_state.setdefault("onboarding_recovery_capacity", 3)
    st.session_state.setdefault("onboarding_experience_level", "Intermediate")
    st.session_state.setdefault("onboarding_days_per_week", 4)
    st.session_state.setdefault("onboarding_session_length_mins", 60)
    st.session_state.setdefault("onboarding_primary_goal", "Hypertrophy")
    st.session_state.setdefault("onboarding_focus_areas", [])
    st.session_state.setdefault("onboarding_custom_focus_areas", "")
    st.session_state.setdefault("onboarding_injuries_limitations", "None")
    st.session_state.setdefault("onboarding_equipment_access", "Full Commercial Gym")


def main() -> None:
    """Run the Streamlit application."""

    st.set_page_config(
        page_title=TITLE,
        page_icon="\U0001F9E0",
        layout="wide",
    )
    _initialize_session_state()

    st.title(TITLE)
    st.caption(SUBTITLE)
    st.warning(
        "Delete `fitness_app.db` before running this phase. The schema changed "
        "substantially and the existing SQLite file will not migrate automatically."
    )

    if st.session_state.screen == SCREEN_LOGIN:
        _render_login_screen()
    elif st.session_state.screen == SCREEN_ONBOARDING:
        _render_onboarding_screen()
    else:
        _render_main_screen()


if __name__ == "__main__":
    main()
