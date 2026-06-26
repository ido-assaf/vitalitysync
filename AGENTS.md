# AGENTS.md

## Project
VitalitySync is currently a fitness-first web application.
The nutrition module is planned for later and is not implemented yet.

Main implemented focus:
- deep user onboarding
- AI-generated workout plans
- active workout logging
- exercise swap engine
- workout history and day completion flow

## Tech Stack
- Frontend: Streamlit
- Backend: FastAPI
- Database: SQLite currently, planned migration to MySQL
- ORM: SQLAlchemy
- Validation: Pydantic
- AI: Gemini / Cohere

## Repository Priorities
When working in this repository:
1. Preserve existing workout functionality.
2. Do not assume the nutrition module already exists.
3. Prefer minimal, focused changes over broad refactors.
4. Keep the frontend simple and compatible with existing Streamlit flow.
5. Maintain strict schema compatibility between backend, Pydantic models, and AI outputs.
6. Avoid SQLite-specific decisions when possible, to keep future MySQL migration easier.

## Current Product Truth
Implemented:
- login flow by username
- onboarding flow
- AI workout generation
- saving workout plans
- ACTIVE_WORKOUT mode
- set logging via API
- exercise swap flow
- workout history support

Partially planned / next steps:
- weekly feedback loop based on free-text review
- smarter adaptation of next week's workout plan

Not implemented yet:
- nutrition module
- barcode scanning flow
- AI nutrition chat
- gym partner finder

## Important Files
- `frontend.py` -> main Streamlit UI and session-state routing
- `app/main.py` -> FastAPI routes
- `app/models/db_models.py` -> SQLAlchemy database models
- `app/models/fitness_models.py` -> Pydantic request/response models
- `app/services/workout_service.py` -> AI workout generation and swap logic

## Rules for Changes
- Never break existing workout flows.
- Do not modify `db_models.py` or `fitness_models.py` unless explicitly required.
- Do not rename API fields unless all dependent code is updated.
- Do not introduce unnecessary dependencies.
- Keep code readable and production-style.
- Prefer reusing existing patterns before creating new abstractions.

## AI / Domain Rules
- Workout recommendations must remain personalized.
- Always use the real user profile context before generating workout output.
- Respect injuries, recovery limits, equipment access, and biomechanics.
- Exercise swaps should preserve the intended muscle or sub-muscle target when possible.
- Do not generate generic workout advice if user-specific data exists.
- Free-text user feedback should be treated as meaningful context when building future workout-adjustment features.

## Preferred Workflow
For non-trivial tasks:
1. First explain the plan briefly.
2. Then implement the smallest safe change.
3. Summarize exactly which files were changed.
4. Explain why each change was needed.
5. Mention how to test the result.

## Testing Expectations
After making changes:
- check that the relevant FastAPI route still works
- check that the Streamlit flow still matches session state expectations
- check that request/response models still align
- check that no existing workout feature is broken

## Style Preferences
- Be concise.
- Avoid overengineering.
- Prefer explicit code over clever code.
- Keep functions focused.
- Match the existing project structure and naming style.

## If Task Is Ambiguous
If the request is unclear:
- do not refactor broadly
- ask for a narrow clarification or propose a minimal safe interpretation