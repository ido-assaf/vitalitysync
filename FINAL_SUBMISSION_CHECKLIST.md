# VitalitySync Final Submission Checklist

Use this file as a local tracker only. Do not commit real passwords, API keys, or private database credentials.

## Public Deployment Details

- Public website URL: `<Render frontend URL>`
- Backend URL: `<Render backend URL>`
- AWS RDS endpoint: `<RDS endpoint>`
- Database username: `<submit only in the official private submission field>`
- Database password: `<submit only in the official private submission field>`

## Render Frontend

- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Publish directory: `build`
- Environment variables:
  - `REACT_APP_API_BASE_URL=<Render backend URL>`
  - `REACT_APP_SOCKET_URL=<Render backend URL>`

## Render Backend

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables:
  - `NODE_ENV=production`
  - `PUBLIC_API_URL=<Render backend URL>`
  - `CORS_ORIGINS=<Render frontend URL>`
  - `DB_HOST=<AWS RDS endpoint>`
  - `DB_PORT=3306`
  - `DB_NAME=<database name>`
  - `DB_USER=<database username>`
  - `DB_PASSWORD=<database password>`
  - `DB_SSL=true` or `false`, matching the RDS setup
  - `DB_SYNC=false` after the production schema exists
  - `DB_ALTER=false`
  - `DB_SEED=false` after demo data exists
  - `GROQ_API_KEY=<Groq API key>`
  - `GROQ_MODEL=llama-3.3-70b-versatile`
  - `GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct`

## Verification Checklist

- [ ] Backend public URL returns the health JSON response.
- [ ] Render backend logs show successful database connection.
- [ ] Frontend public URL loads from an external computer.
- [ ] Register/login flow works in production.
- [ ] Settings page loads and saves in production.
- [ ] At least one DB-backed resource supports create, update, and delete.
- [ ] Backend connects to AWS RDS and persisted data survives restart.
- [ ] AWS RDS connects from MySQL Workbench 8.0 CE.
- [ ] Socket.IO live workout events work between admin and trainee clients.
- [ ] AI nutrition feature works through the deployed backend.
- [ ] Browser devtools show no localhost API or socket calls in production.
- [ ] GitHub/submission package does not contain real `.env` files or secrets.

