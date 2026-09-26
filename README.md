# AI Capsule — Assignment 3

A basic React + Express application for saving private AI prompt records. It uses SQLite, GitHub OAuth and an Express-issued JWT in a Secure HttpOnly cookie named `token`.

**Deployment status: not deployed yet.**
- Public URL: **TODO: insert your actual HTTPS URL after deployment.**
- Target cloud platform: Render Free Web Service.
- Real GitHub login and public-cloud tests: **TODO after configuring your OAuth app.**

## 1. Install and run

Use Node.js **24 LTS** and npm. SQLite is built into this Node version, so no database server, ORM or separate SQLite installation is needed. Node 24 may print an experimental SQLite warning; it does not prevent the app from running.

From the project folder:

```sh
npm install
```

Create a random secret locally:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Paste that value into `JWT_SECRET` in your private `.env`. Never paste it into the README, source files or a chat. Configure GitHub as described below, then:

```sh
npm run build
npm start
```

Open `http://localhost:3000` in Chrome or Firefox. The Express server serves both the built React frontend and API. There is no separate frontend server. After changing React files, run `npm run build` and refresh. `npm run dev` restarts the backend when backend files change; it does not rebuild React.

Cookies always retain `Secure`, including during local development. Chrome/Firefox normally allow Secure cookies on `http://localhost`; use exactly `localhost`, not a LAN IP. If your browser blocks these cookies, test using the deployed HTTPS application. Do not remove Secure to fix deployment login.

## 2. GitHub OAuth setup

Go to GitHub Settings → Developer settings → OAuth Apps → New OAuth App.

For local development:
- Application name: AI Capsule Local
- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/github/callback`

Copy the client ID and generated client secret into the corresponding `.env` variables. Restart the server. Use a separate OAuth app for deployment to avoid repeatedly changing the local callback.

The flow follows the Week 5 lab's authorization-code approach: redirect to GitHub, check random state on callback, exchange the code on the server, then fetch the GitHub profile. The implementation is written for this assignment. Unlike the lab's Express session/PostgreSQL demo, this project uses the assignment-required JWT and a single SQLite table. It does not request email access because only the GitHub ID and login are needed.

Express signs an HS256 application JWT with the GitHub ID as `sub`. The cookie lasts two hours and has `Secure`, `HttpOnly`, `SameSite=Lax` and `Path=/`. The GitHub access token is used only on the server during login; it is not the application JWT and is not stored. JavaScript never reads the JWT or stores it in localStorage. The random OAuth state is stored in a signed ten-minute HttpOnly cookie.

`requireAuth` verifies the JWT signature, expiry, issuer, audience, algorithm and user ID. It runs before all capsule routes. Expired sessions require login again. Logout clears the cookie; already copied JWTs remain valid until expiry (there is no revocation database).

## 3. Environment variables

| Name | Purpose |
| --- | --- |
| `PORT` | HTTP port; local default 3000, supplied by Render in cloud |
| `APP_URL` | Public origin, no path or trailing slash; must be HTTPS in production |
| `JWT_SECRET` | Random secret of at least 32 characters; also signs OAuth state cookies |
| `GITHUB_CLIENT_ID` | OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | OAuth app client secret |
| `DATABASE_PATH` | SQLite path; default `./data/capsules.sqlite` |
| `NODE_ENV` | `development` locally, `production` on Render |
| `NODE_VERSION` | Render runtime version: `24` |

`.env`, database files and dependencies are excluded by `.gitignore`. No frontend environment variable contains a secret.

## 4. Pages and API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | Public introduction |
| GET | `/login` | GitHub login page |
| GET | `/dashboard` | Protected React dashboard; unauthenticated users redirected to login |
| GET | `/api/health` | Public `{ "status": "ok" }` |
| GET | `/api/capsules` | List authenticated user's capsules |
| POST | `/api/capsules` | Create a capsule; returns 201 and the record |
| PUT | `/api/capsules/:id` | Replace editable fields in an owned capsule; returns the record |
| DELETE | `/api/capsules/:id` | Delete an owned capsule; returns 204 |
| GET | `/api/auth/github/start` | Start GitHub OAuth |
| GET | `/api/auth/github/callback` | Verify state, complete OAuth and issue JWT |
| GET | `/api/auth/me` | Return verified user ID and login |
| POST | `/api/auth/logout` | Clear session cookie |

React uses `fetch` with relative `/api/...` URLs and same-origin cookies. No CORS library is needed. Missing/invalid JWTs return 401. Updating or deleting a nonexistent or other user's record returns 404. Invalid field values return 400. Cross-origin browser writes return 403.

POST and PUT accept `project_name`, `prompt_title`, `prompt_version`, `prompt_text`, `response_summary`, `category`, `usefulness`, `reviewed`, `improved`, `screenshot_url`, and `notes`. Project, title and prompt text are required. Reviewed/improved accept booleans or 0/1. The browser does not send `user_id`; the server rejects it if supplied. IDs and timestamps are generated by SQLite. Screenshot evidence is a URL field, not an upload.

## 5. Database and ownership

`server/db.js` creates the directory and opens SQLite; `server/schema.sql` initializes the assignment's capsule table automatically. No manual migration command is needed. All input values use parameterized SQL.

CREATE sets `user_id` from `req.user.id`, obtained from the verified JWT. SELECT uses `WHERE user_id = ?`; UPDATE and DELETE use both `id = ? AND user_id = ?`. A record ID alone never authorizes a change.

Local data persists in `data/capsules.sqlite` between application restarts. **Render Free uses an ephemeral filesystem: SQLite data is lost on restart, redeployment or service spin-down.** The table is recreated automatically, and users can create new records. This limitation is accepted in the assignment guidance and should be explained in the video. This project intentionally does not add paid storage or a second database. Check current free-tier conditions before deploying.

## 6. Deploy to Render

1. Upload this project's source to your GitHub repository, keeping `package.json` at the repository root. Include `package-lock.json`; exclude `.env`, `node_modules`, `client/dist`, and local database files.
2. In Render choose **New → Web Service**, connect the repository and select the **Free** instance.
3. Use Node as the runtime, build command `npm ci --include=dev && npm run build`, start command `npm start`, and health check `/api/health`.
4. Set `NODE_VERSION=24`, `NODE_ENV=production`, `DATABASE_PATH=./data/capsules.sqlite`, a freshly generated `JWT_SECRET`, and `APP_URL=https://YOUR-APP.onrender.com` using the real URL assigned to your service. Render supplies `PORT`.
5. Create the deployment GitHub OAuth App. Homepage must match `APP_URL`; callback must be `https://YOUR-APP.onrender.com/api/auth/github/callback`.
6. Add its `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in Render's environment settings. Deploy/redeploy after changing settings. Do not include secret values in screenshots.
7. Visit the public URL and `/api/health`. Run the checks below, then log in and demonstrate CRUD. Test with a second GitHub account/browser profile to confirm records are separate.
8. Replace the TODO deployment fields in this README with your actual results. Keep the service available until marking finishes.

`render.yaml` is included as an alternative Render Blueprint configuration with the same settings. Manual Web Service creation is sufficient; do not create both.

Troubleshooting: a login loop usually means APP_URL/callback mismatch, blocked cookies or an old JWT after changing the secret. Use HTTPS in cloud, check the exact callback, clear old cookies and log in again. A blank frontend usually means the build command was omitted. An empty database after Render restarts is the documented ephemeral-storage limitation.

## 7. Required cURL evidence

```sh
npm run build
```

Run these commands against your deployed application:

```sh
curl -i https://YOUR-APP.onrender.com/api/health
curl -i https://YOUR-APP.onrender.com/api/capsules
curl -i -H "Cookie: token=fake-token-123" https://YOUR-APP.onrender.com/api/capsules
```

| Check | Expected | Actual deployed result |
| --- | --- | --- |
| Health | 200 and `{ "status": "ok" }` | TODO after deployment |
| No JWT | 401 Unauthorized | TODO after deployment |
| Fake JWT | 401 Unauthorized | TODO after deployment |
| Real GitHub login and CRUD | Successful login, create, read, update, delete | TODO after deployment |
| Two real GitHub users | Each sees only their own records | TODO after deployment |

Do not replace these TODOs with expected results until you have actually run the checks. Never display or submit your real JWT.

## 8. AI-assisted development

Tool used: OpenAI Codex generated this initial project, tests and documentation from the assignment specification. The student must review the code and be able to explain it.

Problem found and corrected in AI-generated code: the first generated dashboard guard wrapped a fake response object around the API authentication middleware to turn 401 into a redirect. This was unnecessarily confusing and fragile. It was replaced with an explicit `redirectToLogin` option in `requireAuth`, sharing the same JWT verification while returning a redirect for the page and 401 for APIs.

Verification: local browser testing confirmed GitHub authorization, authenticated CRUD, and logout. Real deployed HTTPS login and public cURL evidence must still be checked after account configuration.

Decision to understand: React and Express share one origin. The browser sends the HttpOnly cookie automatically, so the frontend never handles a JWT and no cross-origin cookie configuration is required. SQLite uses the assignment's one-table schema to keep the project small.

Before submission, add your own honest account of any additional problems you encountered and how you fixed them. Do not claim to have personally performed tests you have not run.

## 9. Submission and demonstration

Submit a source-code ZIP and a **3–5 minute MP4 with working audio** directly to LMS. Exclude dependencies, builds, databases and secrets from the ZIP; include the lockfile, schema, source, README and configuration example.

Suggested video order:
1. Public HTTPS homepage and `/api/health` (about 30 seconds).
2. Both required cURL checks returning 401 (30 seconds).
3. GitHub login and dashboard (30 seconds).
4. Create, read, update and delete a capsule (90 seconds).
5. Cloud settings and environment variable names, with secret values hidden; explain SQLite and one limitation (45 seconds).

This repository prepares the code, but the public deployment, actual cURL results and recorded demonstration must be completed before submission.

## References

- Assignment 3 — AI Capsule, Dr Shuo Ding, Semester 2 2026 (primary requirements and capsule schema).
- [Lecturer's Week 5 OAuth example](https://github.com/CSE3CWA-5006/CSE3CWA-5006-Week-05/tree/main/github_oauth_demo) — conceptual flow reference; session/database differences explained above.
- [Lecturer's deployment materials](https://github.com/CSE3CWA-5006/CSE3CWA-5006-Week-01).
- [GitHub OAuth web application flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps).
- [jsonwebtoken documentation](https://github.com/auth0/node-jsonwebtoken).
- [Render Express deployment](https://render.com/docs/deploy-node-express-app) and [free-tier storage limitations](https://render.com/docs/free).
