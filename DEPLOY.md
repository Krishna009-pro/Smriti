Deploying Smriti — Vercel (frontend) and Render (frontend + backend)

This document explains the recommended, minimal steps to deploy the frontend to Vercel and the backend (and optionally the frontend) to Render. It purposefully does NOT commit any secrets — set those in the Vercel or Render dashboards.

1) Frontend -> Vercel

- What this repo contains
  - frontend/ — Vite React app (build: npm run build -> output: dist)
  - backend/  — FastAPI app (served separately)

- Quick setup (Vercel dashboard)
  1. Create a new project on Vercel and connect your GitHub repository.
  2. In the Vercel project settings set the "Root Directory" to `frontend` so Vercel runs the frontend build from the nested folder.
  3. Environment variables to set in Vercel (Values depend on where your API will be hosted):
     - VITE_API_URL (or NEXT_PUBLIC_API_BASE_URL) — e.g. https://smriti-api.onrender.com
  4. Build & Output settings (if Vercel doesn't detect automatically):
     - Install Command: npm ci
     - Build Command: npm run build
     - Output Directory: dist
  5. Deploy. The static site will be served from Vercel's CDN.

- Notes
  - The repo includes vercel.json which instructs Vercel to build the frontend nested under `frontend/` and use `dist` as the publish directory.
  - Make sure VITE_API_URL is set to your production API URL so the frontend makes requests to the correct backend.

2) Backend -> Render

- Options: Render supports Docker-based web services (recommended here because the repo contains docker/Dockerfile.backend).

- Quick setup (Render dashboard or render.yaml)
  1. In Render create a new "Web Service".
  2. Choose "Docker" as the environment and point the service to this repository and the branch you want to deploy.
  3. Set the Dockerfile path to `docker/Dockerfile.backend` (already present in the repo).
  4. In Render's Environment variables, add the required secrets and configuration values (do NOT commit these to the repo):
     - HOST=0.0.0.0
     - PORT=8000
     - DATABASE_URL (or leave the default sqlite path)
     - GEMINI_API_KEY / ANTHROPIC_API_KEY / OPENROUTER_API_KEY (if used)
     - TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (optional)
     - JWT_SECRET_KEY (set a strong secret)
  5. Deploy. Render will build the Docker image and expose a public URL you can use in the frontend.

- Using render.yaml
  - This repo contains `render.yaml` as a blueprint that can be used to set up the API and a static frontend service. The blueprint contains comments and placeholders; replace placeholder values where needed and set secrets in the Render dashboard.

3) Frontend -> Render (optional alternative)

- Instead of Vercel you can host the frontend on Render as a Static Site.
  - Create a new Static Site in Render
  - Build Command: npm ci && npm run build
  - Publish Directory: dist
  - Set environment variable VITE_API_URL to the public API URL for the backend service.

4) Environment variables summary (do NOT commit secrets)
- VITE_API_URL (frontend) — public URL of your API (e.g., https://smriti-api.onrender.com)
- In backend (Render web service): GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENROUTER_API_KEY, JWT_SECRET_KEY, NEO4J credentials (if used), TELEGRAM_* tokens, etc.

5) Notes on local dev vs production
- Locally the frontend reads BASE from import.meta.env.VITE_API_URL (see frontend/src/lib/api.ts). If VITE_API_URL is empty the client uses relative paths which work for local dev when running the frontend and backend on the same host and port mapping.
- In production set VITE_API_URL to the absolute API URL so the frontend can call the API across origins.

6) Troubleshooting
- If the frontend can't reach the backend after deployment, check the public API URL in Vercel/Render and ensure CORS is allowed on the backend (FastAPI CORS middleware is present in the app but verify origins).
- For Render Docker services: check service logs in the Render dashboard if the container fails to start.

If you'd like, next actions I can take for you:
- Create & configure the Vercel project (requires Vercel API token and permission) and set VITE_API_URL in the project.
- Create Render services and set environment variables (requires Render API token or dashboard access).
- Build and verify a full end-to-end deploy using docker compose on a temporary host.

