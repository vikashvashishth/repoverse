# RepoVerse 3D

RepoVerse is a full-stack application for static analysis of public GitHub repositories and ZIP archives. It visualizes file dependencies and documented APIs, tracks findings over time, and supports manual and GitHub webhook-triggered re-analysis.

## Features

- Account signup and login with bcrypt password hashes and JWT sessions.
- Import public GitHub repositories or ZIP archives identified by a public GitHub URL.
- Static dependency analysis, selected ESLint checks, JS/TS parser diagnostics, API discovery, and documented API inspection.
- Interactive file explorer, dependency graph, API visualization, impact map, and JSON/HTML reports.
- Repository-scoped error history using SHA-256 fingerprints. Successful complete scans update matching findings, reopen findings that reappear, and resolve open findings absent from the scan.
- Manual repository synchronization and optional GitHub push webhooks. Importing a repository does not enable automatic updates or grant GitHub permission to configure a webhook.
- Optional Gemini-powered assistant and issue explanations.

Imported code is not executed. Repository files are temporarily downloaded or extracted for static analysis and then removed. Analysis results and bounded source excerpts are cached on the server for up to one hour. If an AI feature is used, relevant source excerpts are sent to Google Gemini; review Google's data controls before enabling AI features.

## Requirements

- Node.js 20 or later
- MongoDB (local or MongoDB Atlas)
- Internet access for public GitHub imports and public API inspection
- Gemini API key for AI features (optional)

## Local development

1. Copy `.env.example` to `server/.env`. Set `MONGO_URI`, `JWT_SECRET`, and `CLIENT_URL`. Set `GITHUB_WEBHOOK_ENCRYPTION_KEY` to a separate long random secret. Set `GEMINI_API_KEY` only if you want AI features.
2. Install dependencies:

   ```bash
   npm run install:all
   npm install
   ```

3. Start the server and Vite development server:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173`. The server listens on port `5000` by default, and Vite proxies `/api` requests to it.

## Deploying

Deploy the client as a static site and the server as a Node.js service. The browser uses a relative `/api` base path, so configure your hosting or reverse proxy to send `/api/*` requests to the backend and serve the client application for frontend routes. Keep the frontend and API on the same origin when possible; if they use separate origins, configure `CLIENT_URL` to the exact frontend origin(s), and configure the frontend host to proxy `/api` to the backend.

### Backend service

- Install production dependencies from `server/package.json` and start with `npm start` from the project root (or `npm start` from `server`).
- Configure these environment variables in the hosting provider's secret/environment settings; do not commit real values:
  - `MONGO_URI`: production MongoDB connection string. Configure database network access and credentials for the deployed backend.
  - `JWT_SECRET`: a strong, unique random value.
  - `GITHUB_WEBHOOK_ENCRYPTION_KEY`: a separate strong random value used to encrypt webhook secrets at rest. Keep it stable and backed up; changing it makes existing webhook secrets unreadable.
  - `CLIENT_URL`: comma-separated allowed browser origin(s), without paths.
  - `PORT`: set this only if required by the host; the service defaults to `5000`.
  - `JWT_EXPIRES_IN`: optional, defaults according to the authentication configuration.
  - `GEMINI_API_KEY` and `GEMINI_MODEL`: optional; only configure if enabling AI.
- Provide persistent storage if you need analysis cache files to survive restarts. The cache is temporary and is not required for account or error-history persistence.
- Expose `/api/health` as the service health-check path.
- Use HTTPS for the public site and backend. Keep the MongoDB service and backend credentials private.

### Frontend

Build the static site with:

```bash
npm run build --prefix client
```

Publish `client/dist`. Configure SPA fallback so browser routes such as `/analysis/...` load `index.html`, and configure `/api/*` to be forwarded to the backend before the SPA fallback. The Vite proxy in `client/vite.config.js` is for local development only.

For a Vercel frontend and Render backend, set these environment variables:

- In Vercel: set `VITE_API_URL` to `https://repoverse-wig8.onrender.com`, or redeploy after keeping `client/.env.production` in the repository.
- In Render: set `CLIENT_URL` to `https://repoverse-rosy.vercel.app` so the backend accepts requests from the deployed frontend.

### GitHub webhook setup

Automatic synchronization is optional and must be configured for each repository:

1. Import the public repository in RepoVerse.
2. Provide a webhook secret of at least 16 characters in the optional field during import, or configure the secret through the authenticated repository webhook API.
3. In GitHub, open the repository's **Settings → Webhooks → Add webhook**. Set the **Payload URL** to `https://<your-backend-host>/api/webhooks/github`, **Content type** to `application/json`, enter the same secret, and select **Just the push event**.
4. GitHub must be able to reach the HTTPS backend URL. RepoVerse marks a connection verified after receiving a valid signed push event. Until a valid webhook is received, the dashboard must not be interpreted as proof that automatic synchronization is active; use **Sync Now** for manual synchronization.

Configuring a webhook secret in RepoVerse does not create the webhook in GitHub. Public repository import does not grant permission to create webhooks. Private repositories are not supported yet.

## Tests and builds

```bash
npm test
npm run build --prefix client
```

## Scope and limitations

Analysis reports static evidence and cannot fully model runtime behavior. The API analyzer performs bounded public URL inspection; it rejects internal/private network targets and does not retain full response bodies. AI output is advisory. Commit impact uses public GitHub data and the cached static dependency graph. Private-repository support can be added later with GitHub OAuth or an appropriately scoped GitHub App.
