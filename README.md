# VitalitySync

## Project purpose

VitalitySync is a full-stack fitness and nutrition application. It combines personalized workout planning, active workout logging, progress tracking, nutrition logging, real-time workout monitoring, and backend-managed AI guidance.

The application is built as one integrated system:

- React frontend
- Node.js and Express backend
- MySQL persistence
- Sequelize ORM
- Socket.IO real-time communication
- Groq AI integration through the backend

## Architecture

```text
React frontend
  |-- Axios REST requests --------------|
  `-- Socket.IO workout events ---------|
                                       v
Node.js + Express backend
  |-- Controllers and services
  |-- Sequelize ORM -------------------- MySQL
  |-- Socket.IO server
  |-- Groq AI API
  `-- Open Food Facts API
```

The frontend never calls the AI provider directly. Provider keys and database credentials remain in the backend environment.

## Technology stack

### Frontend

- React 18
- React Router
- Axios
- Socket.IO Client
- Create React App

### Backend

- Node.js
- Express
- Sequelize
- MySQL through `mysql2`
- Socket.IO
- Multer for meal-photo uploads
- Groq chat and vision models

## Project structure

```text
frontend/
  src/                    React application source
  public/                 Static frontend files
backend/
  src/server.js           Assignment entrypoint wrapper
  server.js               Express app and server bootstrap
  config/                 MySQL and initialization configuration
  controllers/            Route handlers
  routes/                 Mounted Express routers
  models/                 Sequelize models and associations
  migrations/             Ordered schema documentation and SQL
  services/               AI, nutrition, food-data, and Socket.IO services
  seed/                   Optional demo data
  scripts/                Existing compatibility migrations and repair scripts
  tests/                  Backend unit tests
  docs/postman_collection.json
```

## Installation

Install backend and frontend dependencies separately with `npm install`, then configure each environment from its `.env.example` file. The detailed commands follow below.

## Backend setup

Requirements:

- A supported Node.js version with the built-in test runner
- MySQL 8 or compatible MySQL service

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm start
```

`npm start` launches `backend/src/server.js`. Direct startup remains supported:

```powershell
node server.js
```

The backend defaults to `http://localhost:3000`.

## Frontend setup

In a second terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm start
```

If the backend already occupies port 3000, set `PORT=3001` in `frontend/.env`. The frontend API and Socket.IO destinations come from `REACT_APP_API_BASE_URL` and `REACT_APP_SOCKET_URL`.

## MySQL database setup

Create an empty database:

```sql
CREATE DATABASE vitalitysync
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Configure the backend environment with the matching host, port, database, username, and password.

For first-time local setup:

```text
DB_SYNC=true
DB_ALTER=false
DB_SEED=true
```

After the schema and optional demo data exist, use:

```text
DB_SYNC=false
DB_SEED=false
```

Schema documentation is under `backend/migrations/`. Existing compatibility migrations remain under `backend/scripts/`. Do not run migration or repair commands against an important database without a backup.

## Environment variables

### Backend

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Runtime environment |
| `PORT` | Express and Socket.IO port |
| `PUBLIC_API_URL` | Public backend URL returned by the health endpoint |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `DB_HOST`, `DB_PORT` | MySQL server |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | MySQL credentials |
| `DB_SSL` | Enables MySQL TLS options |
| `DB_SYNC` | Enables Sequelize model synchronization |
| `DB_ALTER` | Allows Sequelize alter synchronization when explicitly enabled |
| `DB_SEED` | Loads optional demo records |
| `GROQ_API_KEY` | Backend-only Groq credential |
| `GROQ_MODEL` | Text model |
| `GROQ_VISION_MODEL` | Meal-photo model |
| `OPEN_FOOD_FACTS_*` | Food API identity, URLs, and timeout |

### Frontend

| Variable | Purpose |
|---|---|
| `PORT` | Local frontend development port |
| `REACT_APP_API_BASE_URL` | Express API base URL |
| `REACT_APP_SOCKET_URL` | Socket.IO server URL |

Never submit real `.env` files. Commit or distribute only `.env.example`.

## ORM models and relationships

Sequelize definitions are in `backend/models/`, with associations in `backend/models/index.js`.

Main models include:

- `User`
- `Admin`
- `TraineeProfile`
- `WorkoutPlan`
- `Exercise`
- `WorkoutPlanExercise`
- `WorkoutSession`
- `SetLog`
- `WorkoutIssue`
- `NutritionProfile`
- `NutritionLogItem`
- `NutritionFavorite`
- `MealPlan`
- `FoodProduct`
- `ProductEvaluation`
- `AiSpecialist`

`Admin` is a minimal one-to-one profile connected to `User`. Existing login and authorization intentionally continue to use:

```text
User.userRole === "admin"
```

Important relationship examples:

- User has many WorkoutPlans.
- User has one TraineeProfile.
- User has one optional Admin profile.
- WorkoutSession has many SetLogs.
- WorkoutPlan belongs to many Exercises through WorkoutPlanExercise.
- NutritionProfile has many MealPlans and ProductEvaluations.

`WorkoutPlanExercise` is the junction table and also stores workout-day ordering, target sets, and target reps.

## API response format

Successful JSON responses use:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

Errors use:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

CORS preflight requests intentionally return an empty HTTP 204 response.

## Mounted API overview

Only routes mounted by `backend/server.js` are listed here.

### Authentication and current user

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `GET /api/users/me`
- `GET /api/settings`
- `PUT /api/settings`

### CRUD resources

The resource routers support list, item lookup, creation, update, and deletion as applicable:

- `/users`
- `/workout-plans`
- `/exercises`
- `/set-logs`
- `/nutrition-profiles`
- `/meal-plans`
- `/food-products`
- `/product-evaluations`
- `/ai-specialists`

### Workout application routes

- `POST /workout-plans/suggest`
- `GET /workout-sessions`
- `GET /workout-sessions/active`
- `GET /trainee-profiles/:userId`
- `POST /trainee-profiles`
- `PUT /trainee-profiles/:userId`

### Nutrition routes

- `GET /nutrition/profile`
- `PUT /nutrition/profile`
- `GET /nutrition/target-suggestion`
- `GET /nutrition/recent-foods`
- `GET /nutrition/favorites`
- `POST /nutrition/favorites`
- `DELETE /nutrition/favorites/:barcode`
- `GET /nutrition/foods/search`
- `GET /nutrition/foods/:barcode`
- `POST /nutrition/evaluate`
- `POST /nutrition/estimate-meal`
- `GET /nutrition/today`
- `POST /nutrition/log-items`
- `DELETE /nutrition/log-items/:id`

### AI and admin routes

- `POST /ai/product-evaluations/generate`
- `GET /admin/ai-coaches`
- `POST /admin/ai-coaches`
- `PUT /admin/ai-coaches/:id`
- `DELETE /admin/ai-coaches/:id`
- `GET /admin/trainees`
- `PUT /admin/trainees/:userId/ai-specialist`
- `GET /admin/trainees/:userId/details`
- `GET /admin/live-sessions`
- `GET /admin/workout-history`

Admin routes require the project's existing `x-user-role: admin` header. Trainee nutrition routes require `x-user-role: trainee` and the current `x-user-id`.

## WebSocket feature

Socket.IO provides live workout logging and admin monitoring. The custom events are:

- `workout:started`
- `setLog:created`
- `workout:progressUpdated`
- `workout:issueReported`
- `workout:finished`

Workout sessions, set logs, and reported issues are saved through Sequelize. The admin dashboard receives events in real time and can display active sessions and progress.

### Two-client demonstration

Normal tabs share localStorage, so use separate browser profiles or one normal and one incognito window:

1. Start MySQL, backend, and frontend.
2. Log in as an admin in the first client and open `/admin`.
3. Log in as a trainee in the second client and open `/training`.
4. Start a workout.
5. Save a set, report an issue, and finish the workout.
6. Confirm each event appears without refreshing the admin client.
7. Refresh or query workout history to confirm the records were persisted.

## AI features

The backend uses Groq for:

- Personalized product suitability evaluations.
- Nutrition guidance based on verified product values and the user profile.
- Text-based meal nutrition estimates.
- Meal-photo nutrition estimates through a vision model.

AI output is parsed and validated before being returned or persisted. The frontend receives only the application response; it never receives the Groq key.

### AI demonstration

1. Configure `GROQ_API_KEY` in `backend/.env`.
2. Log in as a trainee and complete the fitness and nutrition profiles.
3. Open Nutrition.
4. Search for a product and request an evaluation, or provide a meal description/photo.
5. Review the AI explanation and normalized nutrition values.
6. Add the result to today's log.
7. Confirm the saved item appears after refreshing.

The older product-catalog demonstration is also available through `POST /ai/product-evaluations/generate` using valid persisted IDs.

## Postman

Import:

```text
backend/docs/postman_collection.json
```

The collection uses variables for the base URL and sample record IDs. Update those variables to match the local database, then run the folders in order. No real secrets are stored in the collection.

## Testing

Backend:

```powershell
cd backend
npm test
```

Frontend:

```powershell
cd frontend
npm test
npm run build
```

## Known limitations

- Authentication is intentionally simple and uses client-provided user and role headers; it is not JWT-based.
- Existing passwords are not yet migrated to secure password hashing.
- Socket.IO role and user information currently comes from the client handshake.
- Temporary AI evaluation and meal-estimate snapshots are held in memory and expire or disappear after a backend restart. Final saved records are stored in MySQL.
- Development startup may synchronize Sequelize models when `DB_SYNC=true`.
- Food search, barcode lookup, and AI features require external services and network connectivity.
- Older project-generation files remain in the repository but are not part of the active application.

## Manual demo checklist

- [ ] React frontend loads through React Router.
- [ ] Backend health endpoint returns the required response envelope.
- [ ] Login and current-user requests succeed.
- [ ] MySQL tables and Sequelize models are visible.
- [ ] Create, read, update, and delete an Exercise or other main resource.
- [ ] Show User -> WorkoutPlan one-to-many data.
- [ ] Show WorkoutPlan <-> Exercise through WorkoutPlanExercise.
- [ ] Restart the backend and confirm saved records remain.
- [ ] Start a workout and demonstrate all five Socket.IO events across two clients.
- [ ] Generate AI nutrition output through the backend.
- [ ] Save an AI-assisted nutrition result and confirm persistence.
- [ ] Run the Postman requests and show success and error envelopes.
