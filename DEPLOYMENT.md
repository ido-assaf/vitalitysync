# VitalitySync Deployment Notes

## Render Frontend

- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Publish directory: `build`
- Environment variables:
  - `REACT_APP_API_BASE_URL=https://your-backend.onrender.com`
  - `REACT_APP_SOCKET_URL=https://your-backend.onrender.com`

## Render Backend

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables:
  - `NODE_ENV=production`
  - `PORT` is provided by Render
  - `PUBLIC_API_URL=https://your-backend.onrender.com`
  - `CORS_ORIGINS=https://your-frontend.onrender.com`
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
  - `DB_SSL=true` if required by the AWS MySQL configuration
  - `DB_SYNC=false` for production after tables exist
  - `DB_SEED=false` for production unless loading demo data intentionally
  - `GROQ_API_KEY`
  - `GROQ_MODEL=llama-3.3-70b-versatile`

## AWS MySQL

- Create a MySQL database for the app.
- Keep inbound access limited to the deployment environment that needs it.
- Store all database connection values in Render backend environment variables.
- Do not commit real `.env` files or API keys.

## Local Development

- Copy `backend/.env.example` to `backend/.env`.
- Copy `frontend/.env.example` to `frontend/.env`.
- Set `DB_SEED=true` for the first local run if you want the existing demo records loaded into MySQL.
