# Current MySQL schema reference

The executable definitions live in `backend/models/`. Sequelize uses frozen singular table names and the timestamp columns `createDate` and `updateDate`.

## Core identity

- `User`: users, trainees, coaches, and role-based admins. `userRole` remains the authorization source of truth.
- `Admin`: optional one-to-one administrative profile linked by unique `userId`.
- `TraineeProfile`: one-to-one fitness profile for a User.
- `AiSpecialist`: reusable training or nutrition AI specialist configuration.

## Workout domain

- `WorkoutPlan`: belongs to User.
- `Exercise`: exercise library.
- `WorkoutPlanExercise`: junction table connecting WorkoutPlan and Exercise. It also stores `dayLabel`, `orderIndex`, `targetSets`, and `targetReps`.
- `WorkoutSession`: belongs to User and WorkoutPlan.
- `SetLog`: belongs to User, WorkoutPlan, Exercise, and optionally WorkoutSession.
- `WorkoutIssue`: belongs to WorkoutSession, User, and WorkoutPlan.

## Nutrition domain

- `NutritionProfile`: belongs to User.
- `NutritionLogItem`: belongs to User.
- `NutritionFavorite`: belongs to User and is unique by user and barcode.
- `MealPlan`: belongs to User and NutritionProfile.
- `FoodProduct`: persisted product catalog.
- `ProductEvaluation`: belongs to User, FoodProduct, and NutritionProfile.

## Required relationship examples

- One-to-many: User -> WorkoutPlan.
- One-to-many: WorkoutSession -> SetLog.
- One-to-one: User -> TraineeProfile.
- One-to-one: User -> Admin.
- Many-to-many: WorkoutPlan <-> Exercise through WorkoutPlanExercise.

Relational queries are implemented with Sequelize `include` in the workout-session, workout-plan, admin-dashboard, coach, trainee-profile, and nutrition controllers.
