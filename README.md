# AI Capsule

AI Capsule is a small project for saving private AI prompts. Users can sign in with a GitHub account and create, view, edit and delete prompt records.

## Deployment

- Public URL: https://api-capsule.onrender.com
- Platform: Render Free Web Service
- Runtime: Node.js 24

## Run locally

Requirements: Node.js 24 and npm.

Install and build:

```sh
npm install
npm run build
```

Create a private `.env` file in the project root:

```env
PORT=3000
APP_URL=http://localhost:3000
JWT_SECRET=your_random_secret_at_least_32_characters
GITHUB_CLIENT_ID=your_local_github_client_id
GITHUB_CLIENT_SECRET=your_local_github_client_secret
DATABASE_PATH=./data/capsules.sqlite
NODE_ENV=development
```

Start the application:

```sh
npm start
```

Open http://localhost:3000. Never commit `.env` or secret values.

## GitHub OAuth and JWT

The application uses GitHub OAuth. After successful login, the Express server creates its own JWT using the GitHub user ID. The JWT is stored in a `Secure`, `HttpOnly` cookie named `token` and is verified by the server on protected requests.

Local OAuth callback:

```text
http://localhost:3000/api/auth/github/callback
```

Deployment OAuth callback:

```text
https://api-capsule.onrender.com/api/auth/github/callback
```

The GitHub access token is used only during login and is not stored. The application does not use `localStorage` for authentication.

## Pages and API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | Public home page |
| GET | `/login` | GitHub login page |
| GET | `/dashboard` | Protected dashboard |
| GET | `/api/health` | Public health check |
| GET | `/api/capsules` | Read the user's capsules |
| POST | `/api/capsules` | Create a capsule |
| PUT | `/api/capsules/:id` | Update an owned capsule |
| DELETE | `/api/capsules/:id` | Delete an owned capsule |

The React frontend calls the Express API using relative `/api/...` URLs. The API gets `user_id` from the verified JWT, not from the browser. Database queries restrict read, update and delete operations to the authenticated user.

## Database

SQLite is created automatically from `server/schema.sql`. The database stores the prompt, project name, title, version, response summary, category, usefulness, review status, improvement status, screenshot URL, notes and owner ID.

Render's free filesystem is temporary, so SQLite data may be lost after a restart, redeployment or service spin-down. This is a limitation of the free deployment.

## Environment variables

The application uses these environment variables:

```text
PORT
APP_URL
JWT_SECRET
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
DATABASE_PATH
NODE_ENV
NODE_VERSION
```

Secret values are configured in Render and are not stored in this repository.

## Required cURL evidence

Health check:

```sh
curl -i https://api-capsule.onrender.com/api/health
```

Expected result: `200` and `{ "status": "ok" }`.

Without authentication:

```sh
curl -i https://api-capsule.onrender.com/api/capsules
```

Expected result: `401 Unauthorized`.

With an invalid JWT:

```sh
curl -i -H "Cookie: token=fake-token-123" https://api-capsule.onrender.com/api/capsules
```

Expected result: `401 Unauthorized`.

## AI-assisted development

OpenAI Codex was used to help create and debug the application. I reviewed the generated code and tested the deployed GitHub login, JWT-protected API and CRUD workflow.

One problem found and corrected was the local OAuth cookie configuration. Secure cookies were initially used on local HTTP, which caused the OAuth state cookie not to return in Safari. The application now uses Secure cookies for HTTPS deployment and allows local HTTP login during development.

One implementation decision was to serve the React frontend and Express API from the same application and origin. This avoids separate CORS and cookie configuration. SQLite was chosen because it is sufficient for the required single-table prompt library.

## Submission

The source-code ZIP should include the source files, `package.json`, `package-lock.json`, `README.md`, `render.yaml` and database schema. Exclude `.env`, `node_modules`, `client/dist`, `data` and SQLite files.

The video should show the public URL, health check, both unauthenticated cURL checks, GitHub login, complete CRUD, Render environment variable names without secret values, and the SQLite storage limitation.
