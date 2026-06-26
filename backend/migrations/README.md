# Database migrations and schema

VitalitySync uses Sequelize models with MySQL. The current application initializes the database in `config/initializeDatabase.js`:

1. Authenticate with MySQL.
2. Optionally synchronize Sequelize models when `DB_SYNC=true`.
3. Optionally load demo records when `DB_SEED=true`.
4. Apply the existing AI-coach and nutrition compatibility migrations.

For a new local database:

1. Create an empty MySQL database named by `DB_NAME`.
2. Copy `.env.example` to `.env` and configure the database connection.
3. Start once with `DB_SYNC=true` and, if wanted, `DB_SEED=true`.
4. After the schema exists, use `DB_SYNC=false` and `DB_SEED=false` for normal production-style startup.

Files in this directory are ordered schema evidence for Assignment 4. They are not run automatically and contain no destructive `DROP`, reset, or truncate operations.

- `001-create-admin-table.sql` documents the separate Admin table added for the required Admin ORM model.
- `002-current-schema-reference.md` documents the current tables and relationships.

Existing compatibility scripts remain in `backend/scripts/`:

- `migrateAiCoachArchitecture.js`
- `migrateNutritionArchitecture.js`
- `repairAssignment4Schema.js`

Run schema-changing scripts only against the intended database after taking a backup.
