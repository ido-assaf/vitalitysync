# VitalitySync backend

Node.js, Express, Sequelize, MySQL, Socket.IO, and backend-only Groq services for VitalitySync.

See the root [`README.md`](../README.md) for complete setup, schema, API, WebSocket, AI, Postman, testing, and demonstration instructions.

Quick start:

```powershell
npm install
Copy-Item .env.example .env
npm start
```

The package entrypoint is `src/server.js`. Direct `node server.js` startup remains supported.

The Postman collection is at `docs/postman_collection.json`.
