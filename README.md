# TaskFlow

A small task tracker for a single team. Express and MongoDB on the back, React on the front, TypeScript on both sides.

**Live:** https://task-flow-ten-teal.vercel.app
**API:** https://task-flow-ewms.onrender.com/api/health

Sign in with any of the seeded accounts. Password for all four is `TaskFlow123!`

| Email | Role |
|---|---|
| sarah@taskflow.dev | Admin |
| marcus@taskflow.dev | Engineer |
| priya@taskflow.dev | Designer |
| nina@taskflow.dev | Product Manager |

The API is on Render's free plan, which sleeps after 15 minutes of no traffic. First request after a quiet spell takes a while to wake up. I measured 71 seconds. After that it's normal.

---

## Running it locally

You need Node 24 and a MongoDB you can connect to. A free Atlas cluster works; so does a local `mongod`.

```bash
git clone https://github.com/santhoshkumar-io/task-flow.git
cd task-flow

cd server && npm install
cp .env.example .env        # fill in MONGODB_URI and JWT_SECRET
npm run seed                # 4 users, 30 tasks, comments, activity
npm run dev                 # http://localhost:4000

cd ../web && npm install
cp .env.example .env
npm run dev                 # http://localhost:5173
```

`npm run seed` deletes every user, task and comment before it writes. It refuses to run when `NODE_ENV=production`, but point it at a database you care about and it will happily empty it.

## Environment variables

Both `.env.example` files list everything with comments. The short version:

**server/.env** — only three are required.

| | |
|---|---|
| `MONGODB_URI` | required |
| `JWT_SECRET` | required, 32+ characters |
| `CORS_ORIGIN` | required, the address the browser loads the app from |
| `PORT` | 4000 |
| `JWT_EXPIRES_IN` | 7d |
| `SEAT_LIMIT` | 7. The Team footer reads it and an invite is refused when it hits zero |
| `TRUST_PROXY_HOPS` | 0 locally. See "behind a proxy" below |
| `RATE_LIMIT_*` | window 15 min, 5 on login/register, 300 elsewhere |
| `SMTP_*` | optional. Without them password reset links print to the server log |

**web/.env** — one variable.

`VITE_API_URL` is `http://localhost:4000/api` locally and `/api` in production, because production proxies the API through the same domain.

### Behind a proxy

`TRUST_PROXY_HOPS` caught me out and is worth explaining. Express reads the caller's address off the socket, and behind a load balancer that socket belongs to the balancer. Every request then looks like it came from one place, so the login limit of five attempts per address becomes five attempts for everybody, and the sixth person to sign in that quarter hour gets refused.

It's a setting rather than a constant because it describes the hosting, not the app. Zero on a laptop, one behind a single proxy, two in production here (Vercel's edge, then Render's balancer). It is never `true`, because trusting the whole forwarded-for chain lets anyone extend it by sending the header themselves.

## Testing

```bash
cd server && npm test        # 196 tests, real Mongo in memory
cd web    && npm test        # 7 tests, jsdom
cd web    && npm run test:e2e # 26 Playwright tests, real browser
```

The end-to-end tests need Chromium once: `npx playwright install chromium`.

They start their own API against a throwaway in-memory MongoDB, so a run can't touch a real database. 19 run at 1440x900 and 7 at 390x844, because the app mounts the desktop table and the mobile card stack at the same time and hides one with CSS. One width would be blind to half the UI.

---

## Architecture

Two apps, one repo, no workspace tooling. `server/` and `web/` each have their own `package.json` and are installed and run separately.

```
browser ──► Vercel (static React build)
                │  /api/* rewritten
                ▼
            Render (Express) ──► MongoDB Atlas
```

**Server.** Feature folders under `src/modules`, each with routes, a controller, a service and a Zod schema. Controllers handle HTTP and nothing else. Services hold the rules and never see a request object, which is what makes them straightforward to test. Every route that touches task or comment data goes through `requireAuth`.

Settings are parsed with Zod at startup and the process exits if anything is missing. Better to fail in the first second than on someone's first login.

**Web.** TanStack Query owns server state, so there's no store duplicating what the API already knows. React Hook Form plus the same Zod rules as the server for forms. Tailwind 4 keeps its config in CSS, so `web/src/index.css` is the only file allowed to contain a colour code.

Filters, sorting and the page number live in the URL. Refresh, bookmark and the back button all work without any extra code.

**Auth.** JWT in an httpOnly cookie. JavaScript on the page can't read it, so an injected script can act as you while you're there but can't steal the token for later. That's the trade against localStorage.

In production the browser talks to Vercel, and Vercel forwards `/api` to Render. One origin as far as the browser is concerned, so the cookie stays first-party and `sameSite: lax` keeps working. Pointing the browser straight at Render would have meant `sameSite: none`, which throws away the cross-site request forgery protection that made the cookie worth using.

## API

Everything is under `/api`. All routes need the auth cookie except register, login, the password reset pair, invite acceptance and health.

**Auth** `/api/auth`

```
POST   /register  /login  /logout
POST   /forgot-password  /reset-password  /accept-invite
POST   /sign-out-others
GET    /me
PATCH  /password
```

**Tasks** `/api/tasks`

```
GET    /            list, filtered and paged
POST   /            create
GET    /stats       counts for the dashboard cards
GET    /:id         one task plus its comment count
PATCH  /:id         changed fields only
DELETE /:id
```

`GET /` takes `q`, `status`, `priority`, `assigneeId`, `sort`, `order`, `page`, `limit` and answers `{ items, page, limit, total, totalPages, hasMore }`.

**Comments and activity** nested under a task

```
GET    /api/tasks/:id/comments
POST   /api/tasks/:id/comments
PATCH  /api/tasks/:id/comments/:commentId
DELETE /api/tasks/:id/comments/:commentId
GET    /api/tasks/:id/activity
```

**Users** `/api/users`

```
GET    /            the team, with assigned-task counts
GET    /stats       your own counts, for the sidebar badge
GET    /workspace   member count and seats remaining
PATCH  /me          your profile
POST   /invite      admin only
PATCH  /:id/role    admin only
DELETE /:id         admin only
```

**Health** `GET /api/health` reports the database connection too, so "listening" and "actually working" are different answers.

Errors come back as `{ error: { message, code, requestId, fields? } }`. The request id is in the response header as well, so a screenshot of a failure is enough to find it in the logs.

---

## Known limitations

Honest list. Some are deliberate, some are things I ran out of room for.

**Anyone who signs in can read and edit every task.** Only the creator (or an admin) can delete. There are no private tasks and no per-task permissions. Registration is open, and the seat limit is only checked when inviting somebody, not when they register themselves. On a public URL that means anyone who finds it can make an account and see everything.

**Last write wins.** Two people editing the same task at the same time, and the first one's change disappears with no warning. The fix is a version number on the task and a 409 when it doesn't match, which is maybe an hour of work. I chose to spend it elsewhere for a tool this size.

**Rate limits live in one process's memory.** Two instances would each allow the full amount, and a restart forgets everything. A shared store is the real answer and it's a piece of infrastructure this project doesn't have.

**Pagination uses skip.** Fine at 30 tasks, slower as the page number grows, because the database walks past the rows it's skipping. Cursors would fix it and can't produce the "Showing 1-10 of 42" the design asks for.

**Descriptions and comments aren't rendered as markdown.** The compose box says "Markdown supported" because the server stores it fine, but turning user text into HTML needs a sanitiser, and that's a dependency and a decision nobody asked for. Line breaks are kept, everything else is literal.

**Three controls are drawn and deliberately dead.** The notification bell, Settings, and the "acceptable use policy" phrase on the login screen. Each is visibly disabled and says why on hover. The design shows them; building them wasn't in scope. A control that looks alive and silently does nothing is worse than either.

**Password reset needs SMTP.** Without it the reset link is written to the server log with a warning, which is enough to test the flow but obviously not a product.

**End-to-end tests only run Chromium**, at two fixed widths, against the dev server. A WebKit-only bug or one that appears only after `vite build` walks straight through.

**Between 768 and 1023px the sidebar stays full width** instead of collapsing to a slide-over. The design asks for the slide-over there. It's a real gap, it isn't in any of the phone frames I was given, and I left it.

**The frontend deploy is manual.** Render rebuilds on push; Vercel was deployed from my machine. Connecting Vercel's git integration is a five-minute job I haven't done.
