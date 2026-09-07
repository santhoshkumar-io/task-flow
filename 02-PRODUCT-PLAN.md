# Product plan — TaskFlow

A small task manager for a team, built as twelve versions.

Build them **in order, one at a time.** Do not start the next one until
the current one's exit check passes.

**Read `03-DESIGN-REFERENCE.md` before V3.** The design shows five
statuses, four priorities, a due date and a short readable task id
(`TF-118`) that the assessment brief never mentions. Where the brief and
the design disagree, the design wins — the brief calls its own list
"suggested", and the design file calls itself the source of truth.

---

## What this document is for

Two jobs, and the second one is the one that gets you the offer.

**Job one:** tell you what to build next.

**Job two:** make sure you can explain it. The assessment says plainly
that they may ask you to explain, change, debug or extend any part of
what you submit. So every version below has a section called *Concepts
you must be able to explain* and one called *Review questions*. Read them
**before** you run the build prompt. If a concept is still fuzzy after
the version is built, that is the version to go back to.

Building is the easy half. Owning it is the assessed half.

---

## The one-sentence outcome

> A logged-in team member can create a task, assign it to a teammate,
> find it again later using search and filters, change its status, and
> discuss it in comments — and nobody who is not logged in can see any
> of it.

## Who this is for

One reviewer, reading the code on a machine with Node and MongoDB
installed, with maybe forty minutes to spend. They will clone it, follow
the README, and expect it to run. Then they will open three or four files
at random.

That reviewer shapes several decisions in this plan, most of all: **the
README must be correct, and the project must start in two commands.**

## The ship gate

**V11 is the ship gate.** That is the version where the three submission
documents get written and the project is sent.

V0 to V10 are the build. V11 is the submission. Nothing after V11 exists.

## Time budget

The assessment expects roughly 6–10 hours of real work over 5–7 days.

| Versions | Rough time |
|---|---|
| V0 – V1 (foundation) | 2 h |
| V2 – V5 (backend) | 5.5 h |
| V6 – V8 (the required screens) | 6 h |
| V9 (dashboard and team) | 1.5 h — **optional** |
| V10 – V11 (hardening, docs) | 2.5 h |

That is about 17 hours of estimate for a 6–10 hour budget. Estimates are
optimistic and this one is padded, and V9 is marked optional for exactly
this reason.

**If you run short on time, cut in this order:**

1. **V9 entirely** — the dashboard and team screens. Not asked for in
   the brief.
2. The activity trail in V5 (steps 4 and 5).
3. Frontend tests in V10.
4. Optimistic updates in V8.

Write everything you cut into the README under "what I would do next".
The assessment says explicitly that this is fine. Cutting silently is
not.

---

## What is deliberately NOT being built

Write this list into `README.md` at the end. An exclusion list is what
stops every version quietly growing.

- **The Settings screen**, even though the design has it. Four tabs of
  profile editing, notification preferences and device sessions — none
  of it asked for, all of it expensive
- **Editing or deleting a comment**, even though the design shows a `⋯`
  on each one. Render the menu, or leave it out and say so
- **The Duplicate action** in the task `⋯` menu
- **`@` mentions** in comments — the design shows the hint text only
- **The notification bell** — drawn in the top bar, wired to nothing
- Password reset and email verification — needs an email service, adds
  no engineering signal
- User roles beyond creator-can-delete. The Team screen shows Admin,
  Engineer, Designer, Product Manager, but nothing in the app behaves
  differently because of them
- Inviting members, seat counts, or "Invited" status
- Workspaces or projects grouping tasks — one shared list is enough to
  show assignment works
- File attachments on tasks
- Live updates when someone else changes a task (websockets)
- Dark mode — the design has no dark frames
- Deployment to a live server — this is a code submission, not a running
  product
- Docker

Where the design draws something you are not building — the bell, the
comment `⋯` — **draw it and make it inert, or leave it out entirely, but
say which in the README.** A visible control that silently does nothing
is the worst of the three.

**The rule that gives this teeth:** if you build something on this list,
that is not a small thing. Either the exclusion was wrong or the version
was wrong. Write a decision record saying which.

---

## Decisions a human must make

Three points in this plan stop and wait for you. A build agent cannot
guess these correctly, and the wrong guess is expensive to unpick.

| # | Decision | Needed before | Record it in |
|---|---|---|---|
| 1 | Where the login token is kept in the browser | V2 | `docs/decisions/0001-token-storage.md` |
| 2 | Page-number paging or cursor paging | V4 | `docs/decisions/0002-pagination.md` |
| 3 | The exact colours, spacing and fonts from the design reference | V6 | `docs/decisions/0003-design-tokens.md` |

Gate 3 is **already answered** — section 8 of `03-DESIGN-REFERENCE.md`
is the record. Copy it to `docs/decisions/0003-design-tokens.md` in V6,
after confirming the three values it flags as unclear.

Each version below that has a gate says: **if the record is empty, stop
and ask. Do not choose.**

---

## The shape of every version

Same seven headings every time, so you always know where to look.

- **Outcome** — one sentence about the state of the world when it is done
- **Why now** — why here in the order and not three versions later
- **Concepts** — what you must be able to explain, in plain English
- **Steps** — at most five
- **Exit check** — things someone else could verify without reading code
- **Review questions** — what they may ask, and the short answer
- **Build prompt** — paste this into Claude Code

### How to run one version with Claude Code

Same five moves every time. The value is in moves 2 and 4 — those are
the ones that make you able to explain it afterwards.

1. Open a terminal in the repo, run `claude`, and start a **fresh
   session** for each version. Old context makes it drift into the next
   version's work.
2. Paste the version's **Build prompt**. It will explain what it plans to
   do and stop. **Read that explanation properly.** If any word in it is
   unfamiliar, ask "explain that in simple English with the technical
   word in brackets" before saying yes. This is the cheapest possible
   moment to catch a wrong assumption.
3. Say yes. Let it build.
4. Ask it to walk you through every changed file, line by line. Then run
   the exit check **yourself**, in a browser or with `curl` — not by
   reading the code and not by trusting the summary.
5. When every exit-check line passes, commit, then close the session.

If an exit check fails, do not move on and do not start patching by
hand. Say which line failed and what you actually saw, in the same
session.

### Two rules about exit checks

**Check the claim, not the code.** "The delete route has an owner check"
is weak. "Logged in as user B, deleting user A's task returns 404 and the
task still exists" is strong, because you had to actually do it.

**Force the guard to fire.** If a version adds a limit, the exit check
sets that limit artificially low and hits it. A guard that has never
fired is a guess.

---
---

# V0 — Get both apps running and empty

**Time:** ~45 min

### Outcome

`npm run dev` in `server/` prints "listening on 4000", `npm run dev` in
`web/` opens a blank React page on 5173, and the first commit contains
no secrets.

### Why now

Everything else assumes these two commands work. Also, `.gitignore` has
to be right **before** the first commit. If `.env` or `docs/` gets
committed once, it stays in the history forever, and a leaked signing
secret stays leaked.

### Concepts you must be able to explain

**`package.json`** — the list of a project's libraries and its shortcut
commands. `npm run dev` looks up `dev` in that file and runs whatever it
says.

**Normal libraries and build-only libraries** (called `dependencies` and
`devDependencies`). Express is needed while the app runs, so it is a
normal one. TypeScript only turns your code into JavaScript before it
runs, so it is build-only. Getting this split right is a small, visible
sign of care.

**TypeScript** — JavaScript with labels on the data. You write
`title: string`, and if you pass a number the editor complains before you
ever run it. The browser and Node never see TypeScript; a build step
strips the labels out first.

**Two apps, two door numbers** (called **ports**). The backend listens on
4000, the frontend on 5173. They are separate programs. That is why the
frontend needs a setting telling it where the backend is, and why the
backend needs a setting saying which website is allowed to call it.

### Steps

1. Create the folder, run `git init`, and write `.gitignore` exactly as
   it appears in section 6 of `01-ARCHITECTURE.md`. Do this first.
2. Create `server/`: `npm init -y`, install Express and TypeScript, add
   `tsconfig.json`, add a `dev` script using `tsx watch`, and make
   `src/index.ts` start a server that answers `GET /` with
   `{ "ok": true }`.
3. Create `web/`: `npm create vite@latest` with the React + TypeScript
   template, then add Tailwind CSS following the current Tailwind
   install steps.
4. Create `.env` and `.env.example` in both folders, with the keys listed
   in section 5 of `01-ARCHITECTURE.md`. Generate a real random
   `JWT_SECRET` with `openssl rand -base64 32`.
5. Copy `AGENTS.md`, `01-ARCHITECTURE.md` and this plan into the repo
   root. Make the first commit.

### Exit check

- `npm run dev` in `server/` prints the port, and `curl localhost:4000`
  returns `{"ok":true}`.
- `npm run dev` in `web/` opens a page in the browser with no errors in
  the browser console.
- `git status` shows nothing about `.env`, `node_modules/` or `docs/`.
- `git show --stat HEAD` lists no `.env` file. This is the adversarial
  check — confirm by looking at the commit, not at `.gitignore`.
- Both `.env.example` files exist and are committed.

### Review questions

**"Why is TypeScript a devDependency and not a dependency?"**
Because it never runs in production. It converts my code to JavaScript
before deployment; the running server only sees the JavaScript.

**"Why two ports instead of one?"**
They are two separate programs during development. Vite runs its own
server so it can reload the page instantly when I save a file. In
production the frontend becomes plain files that any web server can
serve.

**"What is in .gitignore and why?"**
`node_modules` because it is 200 MB of other people's code that `npm
install` rebuilds. `.env` because it holds the token signing secret.
`docs/` because those are my private working notes, not part of the
submission.

### Build prompt

```text
Read AGENTS.md and 01-ARCHITECTURE.md. Build V0 from 02-PRODUCT-PLAN.md only.

Before writing any code, list the exact files you will create and the exact
libraries you will install, splitting them into dependencies and
devDependencies with one line of reason each. Wait for my yes.

Then do the five V0 steps. Write .gitignore first, before anything else.
Do not build any route beyond GET /. Do not add a database connection —
that is V1. Do not install any library not on the list you showed me.

When done, create docs/notes/v0.md with every command you ran and its real
output, plus the output of `git show --stat HEAD`. Walk me through each file
you created in plain English. Do not start V1.
```

---
---

# V1 — Connect to the database, and fail loudly when settings are wrong

**Time:** ~1 h

### Outcome

The server refuses to start when a required setting is missing, and when
it does start it is connected to MongoDB, with one automated test proving
it.

### Why now

Every later version writes to the database. Two things get much more
expensive if they are added later: the settings check and the shared
error format.

The settings check matters more than it sounds. Without it, a missing
`JWT_SECRET` does not break anything at startup — it breaks on the first
login attempt, three versions later, with a confusing message. The
reviewer running your project for the first time will hit exactly this.

### Concepts you must be able to explain

**Environment variables** — settings that live outside the code, so the
same code can run on your laptop and on a server with different values.
Read once at startup.

**Fail fast** — checking every setting at startup and refusing to run if
one is missing, instead of starting successfully and breaking later. The
cost of a bad setting should be paid in the first second, not the first
hour.

**A pool of open connections to the database** (called a **connection
pool**). Opening a connection takes time, so the driver opens a handful
and reuses them. This is why you connect once at startup, not on every
request.

**Middleware** — small functions that run in order between the request
arriving and the answer going out. Order matters: the error handler must
be registered **last**, because it only catches things thrown by
whatever was registered before it.

**One error shape.** Every failure leaves the API looking the same:

```json
{ "error": { "code": "NOT_FOUND", "message": "Task not found" } }
```

A frontend that can rely on that shape needs one piece of error handling,
not one per screen.

**An in-memory database for tests** (`mongodb-memory-server`). It starts
a real MongoDB in your computer's memory, runs the tests against it, and
throws it away. Tests never touch your real data and never need
anything installed on the machine running them.

### Steps

1. Write `src/config/env.ts`: read `process.env`, check it with a Zod
   schema, and throw a clear message naming the missing key. Import it
   at the very top of `index.ts` so it runs before anything else.
2. Write `src/config/db.ts` with `connectDb()` and `disconnectDb()` using
   Mongoose. Log a clear line on success and exit the process on failure.
3. Split `src/app.ts` (builds the Express app, no listening) from
   `src/index.ts` (connects to the database, then listens). Tests need
   the app without the listening part.
4. Add `src/lib/AppError.ts` and `src/middleware/errorHandler.ts`.
   Register the handler last. In development include the stack trace; in
   production never.
5. Add `GET /api/health` returning `{ status, db: "connected" | "disconnected" }`,
   and one Vitest + Supertest test that asserts it returns 200.

### Exit check

- Removing `JWT_SECRET` from `.env` makes the server exit immediately
  with a message naming `JWT_SECRET`. Verified by actually removing it,
  not by reading the code.
- `GET /api/health` returns `"db": "connected"` while MongoDB is
  running, and the server starts and reports `"disconnected"` — or exits
  with a clear message — when MongoDB is stopped.
- Requesting a URL that does not exist returns the standard error shape
  with a 404, not an HTML error page.
- `npm test` passes. Paste the real count into `docs/notes/v1.md`.

### Review questions

**"Why does app.ts not call listen()?"**
So tests can import the app and send requests to it without opening a
real network port. Supertest needs the app object, not a running server.

**"What happens if the database goes down while the app is running?"**
Mongoose buffers commands briefly and retries the connection. Requests
that need the database fail and go through my error handler as a 503. It
does not crash the process.

**"Why check settings with Zod instead of just reading process.env?"**
`process.env` values are always strings or undefined. Zod converts
`PORT` to a number and refuses to continue if a required key is missing,
so a whole class of runtime surprise becomes a startup failure.

### Build prompt

```text
Read AGENTS.md, 01-ARCHITECTURE.md and docs/notes/v0.md. Build V1 only.

Before coding, explain in plain English: what happens between the moment a
request arrives and the moment the error handler sees an error, and why the
error handler must be registered last. Wait for my yes.

Do the five V1 steps. Do not create any model, route or feature beyond
health. No authentication yet — that is V2.

Then: stop MongoDB, start the server, and record what happens. Remove
JWT_SECRET from .env, start the server, and record what happens. Put both
real outputs in docs/notes/v1.md along with the test output. Do not start V2.
```

---
---

# V2 — Register, log in, and lock every other route

**Time:** ~1.5 h

### Outcome

A person can create an account and log in, passwords are never stored
readably, and any request without a valid login is refused.

### Why now

This is the "truth and safety first" rule. Every route built after this
one will need a logged-in user attached to the request. Building four
open routes now and adding login later means editing all four, plus
retro-fitting the tests, plus a real chance of leaving one open.

The assessment lists this first for the same reason.

### Decision gate

**`docs/decisions/0001-token-storage.md` must exist before you start.**

The question: where does the browser keep the login ticket?

Two real options.

**In a cookie the browser code cannot read** (an **httpOnly cookie**).
The browser stores it and attaches it automatically. JavaScript on the
page cannot read it, so a script injected into your page cannot steal
it. The cost: you must set `sameSite` and enable credentials on both
sides, and think about cross-site request forgery — someone else's site
making a request that rides on your cookie.

**In browser storage** (`localStorage`). Simpler: you read the value and
put it in an `Authorization` header yourself. The cost: any script
running on your page can read it, so one injection is a full account
takeover.

**Recommendation: the httpOnly cookie**, with `sameSite: "lax"`,
`httpOnly: true`, and `secure` on in production. It is the answer a
reviewer wants to hear, and because your frontend and backend are both
on `localhost` in development, `sameSite: "lax"` works without extra
setup.

Write which you chose, what you rejected, why, and what would make you
change. Then build.

**If the record is empty, stop and ask. Do not choose.**

### Concepts you must be able to explain

**Scrambling a password one way** (called **hashing**). You cannot turn
the stored value back into the password. To check a login you scramble
what the user typed and compare the two scrambled values. Even a full
copy of your database gives an attacker nobody's password.

**Not the same as encryption.** Encryption can be undone with a key.
Hashing cannot be undone at all. Passwords are hashed, never encrypted.

**A random extra ingredient per password** (called a **salt**). Two
people with the password `hunter2` get different stored values, so a
pre-computed lookup table of common passwords is useless. bcrypt
generates and stores the salt for you inside the result string.

**Deliberately slow** (the **cost factor**, 10 or 12). bcrypt is designed
to take about a tenth of a second. That is invisible to a real user and
catastrophic for someone trying a million guesses.

**A signed ticket** (called a **JWT**, JSON Web Token). It contains the
user id and an expiry date, and a signature made with your secret.
Anyone can read what is inside it — **it is not encrypted** — but nobody
can change it without the secret. So never put anything secret in it.

**Why a ticket instead of a server-side session?** A ticket needs no
database lookup on every request. The cost: you cannot revoke one before
it expires. For a seven-day expiry on an internal tool, that is an
acceptable trade — and it belongs in `DECISIONS.md`.

**401 and 403.** 401 means "I do not know who you are" — no ticket, or a
bad one. 403 means "I know who you are and you still may not". Mixing
them up is a common interview trap.

**Do not say which field was wrong.** A failed login returns "invalid
email or password" for both cases. Saying "no such email" hands an
attacker a way to find out which of your users exist.

### Steps

1. `models/user.model.ts` — name, email (lowercase, unique index),
   passwordHash, timestamps. Add a `toJSON` transform that strips
   `passwordHash` so it can never leak through a response by accident.
2. `lib/password.ts` (hash and compare) and `lib/token.ts` (sign and
   verify).
3. `modules/auth/` — `POST /api/auth/register`, `POST /api/auth/login`,
   `POST /api/auth/logout`, `GET /api/auth/me`. Zod schemas for the
   inputs. Register and login both return the user object without the
   hash.
4. `middleware/requireAuth.ts` — read the ticket, verify it, load the
   user, attach it to `req.user`. Any failure is a 401 in the standard
   error shape.
5. `modules/users/` — `GET /api/users` behind `requireAuth`, returning
   id, name and email only. The task assignment dropdown needs this.
   Write tests for register, duplicate email, login, wrong password, and
   a protected route with no ticket.

### Exit check

- Registering twice with the same email returns 409 and creates only one
  user. Confirm the count in `mongosh`.
- Reading the `users` collection in Compass shows no readable password
  anywhere — only a string starting `$2b$`.
- `GET /api/users` with no ticket returns 401 in the standard error
  shape. With a valid ticket it returns the list.
- A ticket with one character changed returns 401, not a 500. **Force
  this** — copy a real token, change a character, and send it.
- Logging in with a real email and a wrong password returns the same
  message as logging in with an email that does not exist.
- Tests pass. Real count in `docs/notes/v2.md`.

### Review questions

**"Why bcrypt and not SHA-256?"**
SHA-256 is built to be fast, which is exactly wrong for passwords — fast
means billions of guesses per second on a GPU. bcrypt is deliberately
slow and salts each password. Argon2 is the modern alternative and I
would use it in a greenfield production system; bcrypt is chosen here
for maturity and zero build issues.

**"Anyone can decode a JWT. Is that a problem?"**
Only if you put secrets in it. Mine holds the user id and an expiry.
The signature is what matters: without my secret nobody can change the
user id and have the server accept it.

**"How do you log someone out if the token cannot be revoked?"**
I clear the cookie, so the browser stops sending it. The token is
technically still valid until it expires — which is the real trade of
this design. If revocation mattered I would add a short-lived access
token plus a refresh token stored in the database, and that is written
up in DECISIONS.md.

**"Why 404 instead of 403 for someone else's task?"**
403 confirms the id exists. Repeatedly probing ids with a 403 response
tells an attacker how many tasks you have and which ids are real. 404
tells them nothing.

### Build prompt

```text
Read AGENTS.md, docs/decisions/0001-token-storage.md and docs/notes/v1.md.
Build V2 only.

If 0001-token-storage.md does not exist or is empty, STOP and give me the
exact questions. Do not choose for me.

Before coding, explain in plain English: what exactly is stored when a user
registers, what travels back to the browser, and what the server does with
each incoming request to know who is asking. Wait for my yes.

Do the five V2 steps. Do not build tasks or comments. Do not add rate
limiting — that is V10. Do not add password reset.

Verify by: registering the same email twice, tampering with a real token,
and opening the users collection in Compass. Paste real output into
docs/notes/v2.md. Do not start V3.
```

---
---

# V3 — Tasks: create, read, edit, delete

**Time:** ~1.5 h

### Outcome

A logged-in user can create a task, read it, change any of its fields,
and delete their own — and cannot delete anyone else's.

### Why now

This is the centre of the product. The list, the filters, the comments
and every screen all sit on top of it. Nothing above it can be built
until the shape of a task is settled.

### Concepts you must be able to explain

**A model** — the description of what one record looks like, and the
object you use to read and write those records. Mongoose gives you both
in one.

**MongoDB's id** (an **ObjectId**) — a 12-byte value the database
generates. It is not random: the first four bytes are the creation time,
which is why sorting by `_id` roughly sorts by age.

**Storing a link to another record.** A task holds the assignee's id, not
a copy of the assignee. One place holds the truth about a user's name;
if it changes, every task shows the new name automatically.

**Filling in the linked record** (Mongoose calls it **populate**). When
the API returns a task, the frontend needs the assignee's *name*, not
just an id. `populate` fetches those users and swaps them in. Behind the
scenes it is a second query — worth knowing, because doing it wrongly is
how you end up making one query per task in a list.

**The methods, honestly.** `POST` creates. `GET` reads and changes
nothing. `PATCH` changes some fields. `DELETE` removes. `PUT` replaces
the whole record — which is why `PATCH` is the right choice for "change
just the status".

**Status codes that mean something.** 201 for created, 200 for
read/updated, 204 for deleted with no body, 400 for bad input, 401 not
logged in, 403 not allowed, 404 not found, 409 conflict, 422 for input
that is well-formed but invalid.

**Checking input on the server even though the browser already checked.**
Anyone can send a request with `curl`. Browser checks are for
helpfulness. Server checks are the only real ones.

**Only allow the fields you meant to allow.** If you pass the whole
request body straight into an update, someone can send `creatorId` and
take over a task. Zod's schema does this for you: it drops anything not
listed.

**Counting up safely.** The design gives every task a short readable id
— `TF-118`, `TF-117`. To make the next one you cannot count the existing
tasks and add one: two people creating a task at the same moment both
count 117 and both get `TF-118`. Instead you keep a single counter
record and ask the database to add one **and** tell you the new value in
the same operation (`findOneAndUpdate` with `$inc` and
`returnDocument: "after"`). One operation, so nothing can slip between
the read and the write.

This is a small feature and a very good interview answer. It is the
clearest example in the whole project of a race — two things happening
at once — and how the database solves it.

### Steps

1. `models/task.model.ts` — `key` (unique, e.g. `TF-118`), title
   (required, trimmed, 1–200 chars), description (optional, up to 5000),
   `status` (`todo` / `in_progress` / `in_review` / `done` / `blocked`,
   default `todo`), `priority` (`low` / `medium` / `high` / `urgent`,
   default `medium`), `dueDate` (optional date), assigneeId (optional),
   creatorId (required), timestamps.
   **Five statuses and four priorities — check `03-DESIGN-REFERENCE.md`.**
2. `modules/tasks/task.schema.ts` — a create schema and an update schema
   where every field is optional. The update schema must reject an empty
   body and must not accept `creatorId` or `key`. On create only, a
   `dueDate` in the past is rejected with the design's exact wording:
   *"Due date can't be in the past."*
3. `models/counter.model.ts` plus a `nextTaskKey()` helper using one
   atomic `findOneAndUpdate` with `$inc`. Then
   `modules/tasks/task.service.ts` — create, getById, update, remove.
   Rules live here: the creator is always the logged-in user; an
   assigneeId must belong to a real user or the request fails with 422;
   only the creator may delete.
4. `modules/tasks/task.controller.ts` and `task.routes.ts` — mount at
   `/api/tasks`, whole router behind `requireAuth`. Populate assignee and
   creator with name and email on every response.
5. Tests: create, read, update by a non-creator (allowed), delete by a
   non-creator (404), assign to an id that does not exist (422), a
   malformed id (400 not 500), a past due date (400), and **twenty tasks
   created at once all get different keys**.

### Exit check

- Creating a task with no title returns 400 and the message names
  `title`.
- Creating a task with `{"title":"x","creatorId":"<someone else's id>"}`
  saves your own id as creator, not theirs. **Force this** — send it with
  `curl` and read the saved record.
- As user B, `DELETE` on user A's task returns 404, and the task still
  exists in the database.
- As user B, `PATCH` on user A's task to change the status succeeds —
  editing is open to the team by design, and that is written in
  DECISIONS.md.
- `GET /api/tasks/:id` with the id `not-a-real-id` returns 400 in the
  standard error shape, not a 500.
- The task response contains the assignee's name, not just an id.
- Creating a task with `"status":"in_review"` and `"priority":"urgent"`
  succeeds. Creating one with `"status":"done_ish"` returns 400.
- Creating a task with yesterday's `dueDate` returns 400 with the
  message *"Due date can't be in the past."*
- **Creating twenty tasks in one `Promise.all` produces twenty different
  keys.** Run it, then check with
  `db.tasks.distinct("key").length` in `mongosh`. This is the
  adversarial one — it is the only check that proves the counter is
  atomic.
- Tests pass. Real count in `docs/notes/v3.md`.

### Review questions

**"Why can anyone edit but only the creator delete?"**
It is a small team tool. Editing status and priority is the daily work
and blocking it would be annoying. Deleting is destructive and cannot be
undone, so it stays with the creator. It is an assumption, and it is
written in DECISIONS.md so a reviewer can disagree with the decision
rather than wonder if it was accidental.

**"What happens if the assignee is deleted later?"**
Nothing breaks — MongoDB has no automatic link enforcement. The task
keeps an id pointing at nothing, and `populate` returns null. My
frontend shows "Unassigned". I did not build user deletion, so this
cannot happen today, which is why I did not add cleanup for it.

**"Why not PUT for updating a task?"**
PUT means replace the whole record, so a client that leaves a field out
would wipe it. Every real edit in the UI touches one or two fields, so
PATCH matches what actually happens.

**"How do you stop someone changing creatorId?"**
The update schema does not contain `creatorId`, and Zod strips unknown
keys. So the field never reaches the update call. There is a test for
exactly this.

**"How do you generate TF-118 without two tasks getting the same one?"**
A single counter record, incremented with one atomic
`findOneAndUpdate` that both adds one and returns the new value.
Counting the tasks and adding one would race — two simultaneous creates
would both read 117. I proved it by creating twenty tasks at once and
checking all twenty keys are different.

**"Why are the statuses in the design different from the brief?"**
The brief lists three and calls them "suggested". The design file has
five and calls itself the source of truth, and the assessment asks me to
reproduce the design. So I built five and wrote the reasoning in
DECISIONS.md, rather than silently picking one.

### Build prompt

```text
Read AGENTS.md, 01-ARCHITECTURE.md, 03-DESIGN-REFERENCE.md and
docs/notes/v2.md. Build V3 only.

Before coding, write out the full task schema with every field, its type,
whether it is required, and its default. Then explain in plain English two
things: what stops a logged-in user changing who created a task, and why
counting existing tasks to make the next TF- key would be wrong.
Wait for my yes.

Do the five V3 steps. Use the five statuses and four priorities from
03-DESIGN-REFERENCE.md, not the three from the brief. Do not build listing,
search, filters or pagination — that is V4. No comments — that is V5. Do not
touch the frontend.

Verify with curl, not by reading code: send a body containing creatorId, try
to delete another user's task from a second account, and create twenty tasks
in one Promise.all then count distinct keys in mongosh. Paste the real
requests and responses into docs/notes/v3.md. Do not start V4.
```

---
---

# V4 — Find tasks: list, search, filter, sort, page

**Time:** ~1 h

### Outcome

`GET /api/tasks` returns one page of tasks, narrowed by search text,
status, priority and assignee, sorted by a field the caller picks, with
the total count for the pager.

### Why now

The list screen in V7 is the main screen of the app and cannot be built
against a route that does not exist. Doing it now, separately from V3,
keeps both versions inside five steps and gives each a clean exit check.

### Decision gate

**`docs/decisions/0002-pagination.md` must exist before you start.**

**Page numbers** (`?page=2&limit=20`). The database skips 20 records and
returns the next 20. Simple, gives you a total count and real page
buttons. The cost: `skip` gets slower as the number grows, because the
database still walks past everything it skips. Fine to about 10,000
records.

**Cursor paging** (`?after=<id>`). "Give me the 20 after this one." Stays
fast at any size, and does not skip or repeat items when data changes
mid-scroll. The cost: no page numbers, no total, and no jumping to page 7.

**Recommendation: page numbers.** The design has a pager, the reviewer
expects a total, and this app will never hold 10,000 tasks. Write the
limitation and the switch point in the record — knowing *when* your
choice stops working is the part that scores.

**If the record is empty, stop and ask. Do not choose.**

### Concepts you must be able to explain

**An index** — a sorted lookup list the database keeps beside the data,
so it can jump straight to matches instead of reading every record. Ten
records without an index is fine. Ten thousand is not.

**Which index to build.** An index on several fields works left to
right, like a phone book sorted by surname then first name. You can look
up "everyone called Kumar" and "Kumar, A" fast; you cannot look up
"everyone called A" fast. That is why field order in a combined index
matters.

**Searching text two ways.** A **text index** lets MongoDB do real word
search — fast, but whole words only, so "log" will not find "login". A
**regular expression** (`/log/i`) matches partial words but has to check
every record unless the pattern is anchored to the start.
For a task list where people type part of a title, partial matching wins.
Say that out loud, and say you would move to a proper search engine if
the data grew.

**Escaping what the user typed.** If someone searches for `a.*b` and you
drop it straight into a regular expression, it becomes a pattern, not
text — and a slow one. Escape the special characters first.

**Passing an object where a string was expected** (this is the NoSQL
version of injection). If a URL contains `?status[$ne]=done`, Express
turns `status` into an **object**, and passing it into a query changes
the query's meaning. Zod's `z.enum([...])` refuses anything that is not
one of your three exact strings, which closes this.

**Two queries per list.** One for the page of records, one for the total
count. Run them at the same time with `Promise.all`, not one after the
other.

### Steps

1. Add the indexes from section 7 of `01-ARCHITECTURE.md` to the task
   model.
2. `task.schema.ts` — a query schema: `page` (min 1, default 1), `limit`
   (min 1, max 100, default 20), `q` (string, max 100), `status`,
   `priority` (both enums — five and four values, from the design),
   `assigneeId` (a valid ObjectId or the exact word `unassigned`),
   `sort` (an enum of allowed fields only: `updatedAt`, `createdAt`,
   `priority`, `dueDate`, `title`), `order` (`asc` / `desc`). Default
   sort is `updatedAt` descending — the design's "Last updated".
3. `task.service.ts` — build the filter object, run the find and the
   count together, return
   `{ items, page, limit, total, totalPages, hasMore }`. Add
   `getStats()` returning the four dashboard numbers (total, todo,
   inProgress, done) with one `$group` aggregation, exposed as
   `GET /api/tasks/stats`. Mount it **above** `/api/tasks/:id`, or
   Express will read the word `stats` as an id.
4. Escape the search text before it becomes a regular expression, and
   apply it to title, description and the short key — so typing `TF-118`
   finds that task.
5. Add `npm run seed` — two demo users with known passwords and 25
   varied tasks spread across all five statuses and all four
   priorities, some unassigned, some with due dates. The reviewer needs
   it to see anything at all, the brief asks for "at least two users so
   task assignment can be demonstrated", and your own exit checks below
   need the data. Then the tests: filter by status, filter by priority,
   search a partial word, search by key, `assigneeId=unassigned`, page 2
   does not repeat page 1, `limit=500` is rejected, and
   `?status[$ne]=done` is rejected.

### Exit check

- With 25 tasks seeded, `?page=1&limit=10` and `?page=2&limit=10` return
  ten each with no overlap, and `total` is 25 on both.
- `?q=log` finds a task titled "Fix login bug" — proving partial match
  works. `?q=TF-118` finds exactly that task.
- `?status=todo&priority=high` returns only tasks matching both, and
  `?status=in_review&priority=urgent` works too — all five statuses and
  all four priorities are accepted.
- `GET /api/tasks/stats` returns four numbers that match what
  `db.tasks.countDocuments()` says in `mongosh`. **Check both, do not
  trust one.**
- `?limit=500` returns 400, not 500 items. **Force the guard.**
- `?status=nonsense` returns 400 naming `status`.
- `?status[$ne]=done` returns 400. **This is the adversarial one — send
  it with curl.**
- `mongosh` → `db.tasks.find({status:"todo"}).explain("executionStats")`
  shows an index scan (`IXSCAN`), not a full collection scan
  (`COLLSCAN`). Paste the relevant lines into `docs/notes/v4.md`.
- Tests pass. Real count recorded.

### Review questions

**"How do you know your index is actually used?"**
I ran `explain("executionStats")` on the filter the list screen uses and
checked the winning plan is IXSCAN, not COLLSCAN. The output is in my
build notes.

**"Your search uses a regex — what is wrong with that?"**
An unanchored regex cannot use an index, so it scans every task. At this
size that is milliseconds and partial matching is what users expect. Past
roughly ten thousand tasks I would move to MongoDB's text index and
accept whole-word matching, or to a dedicated search engine.

**"What is the problem with skip-based pagination?"**
`skip(n)` still walks past n documents, so deep pages get slower. It also
repeats or drops items if data changes while you page. I chose it because
the design needs a total and page numbers, and this dataset is small. The
switch point is written in my decision record.

**"Someone sends `?status[$ne]=done`. What happens?"**
Express parses that into an object, and if I passed it into the query it
would invert my filter. My Zod schema only accepts the three exact status
strings, so the request is rejected with a 400 before it reaches the
database. There is a test for it.

### Build prompt

```text
Read AGENTS.md, docs/decisions/0002-pagination.md and docs/notes/v3.md.
Build V4 only.

If 0002-pagination.md is empty, STOP and give me the exact questions.

Before coding, explain in plain English how a URL like
/api/tasks?q=login&status=todo&page=2&sort=priority becomes a database query,
and where an attacker could interfere. Wait for my yes.

Do the five V4 steps. Do not touch the frontend. Do not add comments.

Verify by seeding 25 tasks and running each exit-check request with curl,
including ?limit=500 and ?status[$ne]=done. Run explain() on the main filter
and paste the winning plan. All real output into docs/notes/v4.md.
Do not start V5.
```

---
---

# V5 — Comments on a task

**Time:** ~45 min

### Outcome

Anyone logged in can post a comment on a task and read the comments in
the order they were written.

### Why now

It is the last backend piece. Doing it before the frontend means every
screen in V6 to V8 has a real API behind it from the first minute — no
screen is ever built against fake data.

That matters more than it sounds. A UI built against sample data almost
always ships with some of that sample data still in it.

### Concepts you must be able to explain

**Why comments are a separate collection, not a list inside the task.**
Putting them inside is tempting — one query, no join. But one MongoDB
document can never exceed 16 MB, and you cannot page a list that lives
inside a document without loading the whole document. Comments are the
classic list with no natural end. Separate collection, index on
`taskId`.

**Nested URLs.** `POST /api/tasks/:taskId/comments` reads as "a comment
belonging to this task". The alternative, `POST /api/comments` with the
task id in the body, works too but hides the relationship.

**Check the parent exists first.** Posting to a task id that does not
exist must return 404, not create an orphan comment pointing at nothing.

**What happens when the task is deleted.** MongoDB will not clean up the
comments for you. You either delete them in the same operation or you
leave rows nobody can reach. Delete them, and note it — leaving them is
a defensible choice too, but only if it is a choice.

### Steps

1. `models/comment.model.ts` — taskId (indexed), authorId, body
   (required, 1–2000 chars), timestamps.
2. `modules/comments/` — `GET /api/tasks/:taskId/comments` (oldest
   first, populate author name) and `POST /api/tasks/:taskId/comments`.
   Both behind `requireAuth`. Both check the task exists first and
   return 404 if not.
3. In `task.service.remove`, delete that task's comments **and** its
   activity in the same call. Return the comment count from
   `getById`, because the delete dialog says *"and its 4 comments"*.
4. *(cuttable)* `models/activity.model.ts` — taskId, actorId, `type`
   (`created` / `status_changed` / `priority_changed` /
   `assignee_changed`), `from`, `to`, createdAt. Write one whenever
   `task.service.update` changes one of those three fields. Expose
   `GET /api/tasks/:taskId/activity`, newest first, limit 20.
5. Tests: post and read back, post to a task that does not exist (404),
   post an empty body (400), delete a task and confirm its comments are
   gone, and changing a status writes exactly one activity record with
   the old and new value.

### Exit check

- Posting a comment then reading the list returns it with the author's
  name filled in.
- Posting to `/api/tasks/000000000000000000000000/comments` returns 404
  and creates nothing. Confirm the collection count in `mongosh`.
- Posting `{"body":""}` returns 400.
- Deleting a task with three comments leaves zero comments **and zero
  activity** for that id. **Check in `mongosh`, not in code.**
- `GET /api/tasks/:id` returns a comment count, so the delete dialog can
  say "and its 4 comments".
- Changing a task's status from `todo` to `in_progress` adds exactly one
  activity record holding both values. Changing the title adds none.
- Tests pass. Real count in `docs/notes/v5.md`.

### Review questions

**"Why not embed comments in the task document?"**
The 16 MB document limit and the inability to page an embedded array.
Comments have no natural upper bound, so they get their own collection.
If it were a fixed list like "three approval steps", embedding would be
the better choice.

**"MongoDB has no foreign keys. How do you keep this consistent?"**
I check the parent exists before inserting, and I delete a task's
comments in the same operation as the task. Both are enforced in the
service layer, and both have tests. It is application-level consistency,
and I would say so plainly rather than pretend the database is doing it.

### Build prompt

```text
Read AGENTS.md and docs/notes/v4.md. Build V5 only.

Before coding, explain in plain English why comments are their own
collection here, and what would go wrong if I put them inside the task.
Wait for my yes.

Do the five V5 steps. No editing or deleting of comments — that is on the
exclusion list. Do not touch the frontend.

Verify by deleting a task that has comments and showing the comment count
before and after in mongosh. Real output into docs/notes/v5.md.
Do not start V6.
```

---
---

# V6 — The frame, the building blocks, and login working end to end

**Time:** ~2.5 h

### Outcome

You can open the app in a browser, register, log in, land inside the
app frame — left strip, top bar, your name at the bottom — refresh the
page and still be logged in, and log out.

### Why now

This is the first version where a person can *use* something. It also
settles the design foundations — colours, spacing, fonts, base
components — once, so V7 and V8 assemble screens instead of inventing
styles.

Get this wrong and every later screen carries the mistake.

### Decision gate

**`docs/decisions/0003-design-tokens.md` must exist before you start.**

**Good news: it is already written.** Section 8 of
`03-DESIGN-REFERENCE.md` is the record — every colour, font, size and
radius, read out of the design's own foundations panel.

Two things to do before you copy it across:

1. Open the artifact and zoom into the "Controls & metrics" panel.
   Confirm the three values that file flags as unclear: the top bar
   height, the content padding, and the muted text grey.
2. Confirm the pale badge backgrounds for the five statuses. The
   foundations panel gives the dot colours; the pale fills are read from
   the table.

Then copy section 8 into `docs/decisions/0003-design-tokens.md`, put the
values into `web/src/index.css` as CSS variables and into the Tailwind
config, and **never write a raw colour code in a screen file again.**

**Why this is a gate and not a step:** if V7 and V8 each pick their own
grey, the result looks wrong in a way that is hard to point at and
expensive to fix. The assessment marks "consistent spacing, typography,
colors and component styling" explicitly.

**If the record is empty, stop and ask. Do not choose colours.**

### Concepts you must be able to explain

**A single-page app.** The browser downloads one page and the JavaScript
swaps the content when the URL changes. No full reload between screens.
That is why the router lives in the browser, and why a refresh on
`/tasks/123` needs the server to still return the same page.

**One place that talks to the backend** (`api/client.ts`). Every request
goes through it. So "send the cookie with every request", "if the answer
is 401, go to login", and "turn an error response into an Error object"
are each written once, not on every screen.

**Who is logged in, available everywhere** (a **context**). Instead of
passing the user down through six layers of components, one provider
holds it and any component asks for it directly.

**How the app knows you are logged in after a refresh.** JavaScript
memory is wiped by a refresh. So on startup the app calls
`GET /api/auth/me`. If it returns a user, you are in. If it returns 401,
you are out. There are three states here, not two — *checking*, *logged
in*, *logged out* — and forgetting the first is what causes the login
screen to flash for a moment before the real screen appears.

**A gate on a route** (a **protected route**). A small wrapper: while
checking, show a spinner; if logged out, redirect to login; otherwise
show the screen.

**A cache for server data** (TanStack Query). It stores answers under a
key, hands the same answer to every component that asks, and gives you
`isLoading` and `isError` without writing them yourself. A **query key**
is just the label for a cached answer — `["tasks", filters]` — and when
the filters change the key changes, so it fetches again automatically.

**Building blocks that know nothing about tasks.** Button, Input, Select,
Badge, Card, Spinner. If a component mentions the word "task", it does
not belong in `components/ui/`.

**One frame around every screen** (a **layout route**). The left strip
and top bar are drawn once, and React Router puts whichever screen
matches the URL inside them. So the sidebar does not flicker or reload
when you move between screens, and the breadcrumb is the one thing that
changes.

**One design, two arrangements.** The design gives desktop frames at
1440×900 and phone frames at 390×844. Build the phone one by hiding the
left strip behind a slide-over and adding the bottom bar — same
components, different arrangement. Do it now, in the frame, so no later
screen has to solve it again.

### Steps

1. Confirm the three unclear values, copy section 8 of
   `03-DESIGN-REFERENCE.md` into `docs/decisions/0003-design-tokens.md`,
   and put every value into the `@theme` block in `web/src/index.css`
   (Tailwind 4 has no separate config file).
   Load the Outfit and Geist fonts, with a real fallback stack.
2. Build `components/ui/`: Button (primary, secondary, destructive,
   destructive-outline, ghost — plus a loading state), Input, Textarea,
   Select, Badge, Avatar, Card, Dialog, Drawer, DropdownMenu, Toast,
   Skeleton, Tooltip. Nothing in here knows the word "task".
3. `api/client.ts` — a small wrapper over `fetch` that sends
   credentials, parses the standard error shape into a real Error
   **carrying the request id**, and sends 401 responses to the login
   screen. Then `auth.api.ts`, `AuthProvider` with the three states
   above, `ProtectedRoute`, and `routes.tsx` covering `/login`,
   `/register`, `/tasks`, `/tasks/:id` and a not-found page.
4. Build the login and register screens from the design — centred card,
   logo above, `Welcome back`, email, password with a show/hide eye,
   `Keep me signed in`, black full-width button, and the link to the
   other screen. React Hook Form with the same Zod rules as the server.
   Register copies the same card exactly; the design has no register
   frame, so matching login is the judgement call — write it down.
5. Build the app frame: 216px left strip with the `WORKSPACE` heading and
   the four links, Settings and the signed-in person pinned at the
   bottom, and a top bar with a breadcrumb on the left and search, bell
   and avatar on the right. Under 768px the strip becomes a slide-over
   behind a hamburger, plus the bottom tab bar. Put a placeholder page
   inside it.

### Exit check

- Register a new account in the browser, get sent inside the app frame.
- Refresh the page. You are still logged in and the login screen does
  **not** flash first.
- Log out, then type `/tasks` in the address bar. You land on login.
- Submit login with a wrong password. The error from the server appears
  on the form and the button becomes usable again.
- Submit register with a password that is too short. The error appears
  **before** any request is sent — check the browser network tab.
- Move between two screens. The left strip does not flash or re-render;
  only the breadcrumb changes.
- Search `web/src` for `#` followed by six hex characters. Only
  `index.css` should match. **This is the adversarial one.**
- At 390px wide: the strip is hidden, the hamburger opens it over a
  dimmed page, the bottom bar is visible, and nothing scrolls sideways.
- Put the login screen and the design frame side by side. Anything you
  did differently goes in `docs/notes/v6.md` with the reason.

### Review questions

**"Why one API client instead of calling fetch in each component?"**
So that cross-cutting behaviour is written once. Sending credentials,
parsing my standard error shape, and redirecting on 401 all live in one
file. When I changed the error shape I changed one place.

**"How does the app know you are logged in after a refresh?"**
It asks the server. On startup it calls `/api/auth/me` with the cookie
the browser sends automatically. I keep three states — checking, in, out
— because treating "checking" as "out" makes the login screen flash on
every refresh.

**"Why validate in the browser if the server already does?"**
Speed and kindness, not safety. The browser check tells the user
immediately without a round trip. The server check is the one that
protects the data, because anyone can send a request without my UI. Both
use the same Zod rules so they cannot drift apart.

**"Your protected route redirects — does that make the app secure?"**
No. It is a convenience so people do not see a broken screen. The
security is entirely on the server: every task route requires a valid
token. Anyone can edit the JavaScript in their browser; nobody can forge
my token.

### Build prompt

```text
Read AGENTS.md, 01-ARCHITECTURE.md, 03-DESIGN-REFERENCE.md and
docs/notes/v5.md. Build V6 only.

If docs/decisions/0003-design-tokens.md does not exist, STOP and ask me.
Do not invent colours, fonts or spacing — every value comes from section 8
of 03-DESIGN-REFERENCE.md.

Before coding, list every ui component you will create with its props, and
explain in plain English the three states of "am I logged in" and what the
user sees in each. Wait for my yes.

Do the five V6 steps. Do not build the task list, the filters, the create
drawer or the detail screen — those are V7 and V8. The sidebar links may
navigate to empty placeholder pages. Do not use any six-digit hex colour
outside index.css.

Verify in a real browser at 1440px and at 390px: refresh while logged in,
visit /tasks while logged out, and submit both forms with bad input. Grep
web/src for hex colours and paste the result. All of it into
docs/notes/v6.md. Do not start V7.
```

---
---

# V7 — The task list screen

**Time:** ~2 h

### Outcome

The main screen shows a page of tasks matching the search box and the
filter controls, with correct loading, empty and error states, and the
filters survive a page refresh.

### Why now

This is the screen the reviewer will spend the most time on. It is also
the one that proves V4 was built correctly — every filter and every page
boundary gets exercised by a human clicking, which finds things tests
miss.

### Concepts you must be able to explain

**Filters live in the URL, not in component state.** `?status=todo&page=2`
in the address bar means the back button works, a refresh keeps your
filters, and you can send someone a link to exactly what you are looking
at. Keeping them in `useState` throws all three away for no gain.

**Waiting until typing stops** (called **debounce**). Firing a request on
every keystroke means eight requests for "login". Wait 300 milliseconds
after the last key, then send one.

**Why the cache key includes the filters.** The key `["tasks", filters]`
means a different filter set is a different cached answer. Change the
status and the key changes, so it fetches; go back and the old answer is
still there instantly.

**Showing yesterday's answer while fetching today's** (**stale while
revalidate**). The list keeps the previous page visible and marks itself
as refreshing, instead of blanking out. That is what makes paging feel
smooth instead of flickering.

**Three empty states, not one.** "You have no tasks yet" with a create
button is a different screen from "no tasks match these filters" with a
clear-filters button — and both are different from an error. Collapsing
them into one message is the most common thing that gets marked down
here.

**A grey outline of the screen while loading** (a **skeleton**). It holds
the same shape as the real content, so nothing jumps when the data
arrives.

### Steps

1. `tasks.api.ts` and a `useTasks(filters)` hook wrapping TanStack
   Query, plus a `useTaskFilters` hook that reads and writes every
   filter through the URL search params, with the search box debounced
   by 300ms.
2. `FilterBar` — search box, `Status : All`, `Priority : All`,
   `Assignee : Anyone` dropdowns (the last fed by `GET /api/users`), and
   the `↑↓ Last updated` sort control pushed to the right. Active
   filters appear underneath as removable chips with an `×`, plus a blue
   `Clear all` link.
3. `TaskTable` for desktop: the seven columns from
   `03-DESIGN-REFERENCE.md` §4, with the two-line task cell (title, then
   the short key), the status **pill**, the priority **dot and plain
   text** (not a pill), the assignee initials badge, an absolute created
   date, a relative updated time, and the `⋯` menu. Under 768px the same
   data renders as `TaskCard` stacked.
4. `Pagination` — `Showing 1–10 of 42 tasks` on the left, page buttons
   on the right with the current page filled black. On mobile, a
   full-width `Load more` instead. Then the three states, exactly as
   drawn in §7: `TaskTableSkeleton` (same 56px row height as the real
   table), `EmptyState` with both buttons, and `ErrorState` with the
   `Try Again` button, the request id line, and the corner toast.
5. `CreateTaskDrawer` — a 480px right drawer over a dimmed page, with
   the field order from §5, `Markdown supported` and a live `0 / 2000`
   counter, the pinned Cancel / Create Task footer, and inline field
   errors in the design's red style. On mobile it is a full-screen sheet
   with priority as four segmented buttons.

### Exit check

- Set a status filter and go to page 2. Refresh. Both survive. The URL
  shows them. The chips above the table show both, and `Clear all`
  removes them.
- Press the browser back button. The previous filter comes back.
- Type "log" in the search box. Watch the network tab: **one** request,
  not four.
- Filter to something that matches nothing. You see the magnifier,
  `No tasks found`, and both buttons — **not** the same screen a
  brand-new account with zero tasks sees.
- Stop the backend, then reload the list. You see the retry panel **and**
  the corner toast, and the request id line is filled in from the real
  error, not hardcoded. Start the backend, press retry, the list loads.
  **Force this — actually stop the server.**
- Take a screenshot of the loading state and measure a skeleton row. It
  is the same 56px as a real row, so nothing jumps when data arrives.
- Submit the create drawer with an empty title. The red border and
  *"Task title is required"* appear and no request is sent. Then create a
  real task — it appears without a manual refresh.
- At 390px wide: the table is cards, the pager is `Load more`, the
  drawer is a full-screen sheet, and nothing scrolls sideways.
- Put your screen and the design frame side by side at 1440px. Every
  deliberate difference goes in `docs/notes/v7.md` with the reason.

### Review questions

**"Why put filters in the URL?"**
Three things come free: the back button works, a refresh keeps your view,
and the view is shareable as a link. In component state, all three break.

**"What does TanStack Query give you that useEffect plus fetch does not?"**
Loading and error states without writing them, caching so going back is
instant, keeping the old page visible while the next one loads, and one
line to refetch the list after a create. With useEffect I would write all
of that by hand on every screen and get it slightly different each time.

**"Why debounce the search?"**
Without it, typing "login" sends five requests and the answers can arrive
out of order, so the screen may end up showing results for "logi". One
request after typing stops fixes both.

**"How do you handle the backend being down?"**
The query fails, my API client turns the failure into an Error, Query
exposes `isError`, and the screen shows a retry state. I tested it by
stopping the server, not by mocking it.

### Build prompt

```text
Read AGENTS.md, 03-DESIGN-REFERENCE.md sections 4, 5 and 7, and
docs/notes/v6.md. Build V7 only.

Before coding, list every UI state this screen can be in — including the two
different empty states — and say what the user sees in each. Wait for my yes.

Do the five V7 steps. Filters must live in the URL search params, not in
useState. Priority renders as a coloured dot plus plain text, NOT a pill —
that difference is deliberate in the design. Skeleton rows must be the same
height as real rows. Do not build the task detail screen — that is V8. Do not
add optimistic updates yet. Do not wire the notification bell.

Verify in a real browser at 1440px and 390px: refresh with filters set, press
back, watch the network tab while typing, submit the drawer with an empty
title, and stop the backend to see the error state and toast. Screenshot each
of the four states into docs/notes/v7.md alongside the real observations, and
list every place you deviated from the design frame and why.
Do not start V8.
```

---
---

# V8 — The task detail screen and comments

**Time:** ~2 h

### Outcome

Opening a task shows all of its fields and its comments, every field can
be changed and saved, and a new comment appears immediately.

### Why now

It is the last feature screen. Every API route now has a screen using it,
so nothing built in V3 to V5 is dead code.

### Concepts you must be able to explain

**Telling the cache an answer is out of date** (**invalidation**). After
saving a change you tell Query that `["task", id]` and `["tasks"]` are
stale. It refetches them. Without this, you save a change, go back to
the list, and see the old value.

**Showing the change before the server confirms** (an **optimistic
update**). For a status dropdown, waiting 200ms for a round trip feels
sluggish. You update the cache immediately, send the request, and put the
old value back if it fails. It is genuinely better and it is genuinely
more code — say both.

**Two people editing at once.** If A and B both open a task and both
save, the second save wins and the first is silently lost. Real
solutions: keep an `updatedAt` on the client and reject a save whose
`updatedAt` is older than the stored one (**optimistic concurrency**), or
merge per field. Not building it is fine. **Not knowing about it is
not.** Write it in DECISIONS.md and in "what I would do next".

**Relative time** ("2 hours ago"). Store the exact moment in UTC, show it
relative, and put the exact date in a hover tooltip. Never store a
formatted string.

**Forms the app controls.** React Hook Form holds the values, tracks
which fields changed, and only sends those to `PATCH`.

**Showing what you changed.** The design's edit screen has an *Unsaved
changes* card listing `Priority · High → Urgent`. This is nearly free:
React Hook Form already tracks which fields are dirty, so you compare
each dirty field's current value with the one it loaded with. It looks
like a lot of work and is about fifteen lines — a good thing to point at
in the review.

**A confirm dialog that knows what it is deleting.** The design's dialog
names the task and counts its comments: *"Fix payment webhook issue" and
its 4 comments will be permanently removed.* That count comes from the
API, which is why V5 added it. Generic confirm text would be an obvious
miss against the design.

### Steps

1. `useTask(id)`, `useUpdateTask(id)`, `useDeleteTask(id)` and
   `useActivity(id)` hooks, invalidating both the single task and the
   list on every success.
2. The detail screen, two columns as in §6: back link, short key, title,
   badge row with *"Updated 2 hours ago by …"*, the Edit button and the
   `⋯` menu on the right; Description and Comments cards on the left;
   **Task information** and **Activity** cards in the right rail. Times
   are relative with the exact date in a tooltip.
3. The edit view: the same left column replaced by a form, and the right
   rail replaced by the **Unsaved changes** card (live diff list,
   disabled Save while any field is invalid) and the pale red **Danger
   zone** card. `PATCH` sends only the changed fields.
4. `CommentList` and `CommentForm` — oldest first, initials badge,
   author name, relative time, the `Use @ to mention a teammate` hint
   and the black `Comment` button. On mobile the compose box docks to
   the bottom with a round send button.
5. Delete, behind the design's confirm dialog naming the task and its
   comment count, returning to the list. The Edit and Delete controls
   are hidden for anyone who is not the creator. Plus the loading
   skeleton, the not-found screen for a bad id, and the error state.

### Exit check

- Change the status on the detail screen, go back to the list. The list
  shows the new status without a manual refresh. The **Activity** card
  shows the change.
- In edit view, change priority from High to Urgent. The Unsaved changes
  card says `Priority · High → Urgent`. Change it back — the line
  disappears. **Watch the network tab: no request is sent until Save.**
- Set the due date to yesterday. The inline error appears and the Save
  button goes disabled. **Force this.**
- Open `/tasks/000000000000000000000000`. You get a clean "not found"
  screen, not a crash and not a blank page.
- Post a comment. It appears without a reload, and it is still there
  after a refresh.
- Post an empty comment. The button is disabled or the form shows an
  error, and no request is sent.
- Open the delete dialog on a task with comments. It names **that** task
  and shows the **real** comment count. Change the count in the database
  and reopen — the number follows.
- Log in as user B and open user A's task. There is no Edit or Delete.
  Then send the delete with `curl` as user B — it returns 404. **The
  server is the real guard; prove it.**
- Delete your own task. You return to the list, it is gone, and its
  comments are gone from the database too.
- At 390px wide the layout is one column, the comment box is docked to
  the bottom, and nothing scrolls sideways.

### Review questions

**"What happens if two people edit the same task at the same time?"**
Last write wins, and the first person's change is silently lost. I did
not solve it because this is a small internal tool, but the fix is
optimistic concurrency — send the `updatedAt` I loaded and let the server
reject the save if it has moved. It is in DECISIONS.md and in "what I
would do next".

**"Why hide the delete button if the server already blocks it?"**
The hidden button is for the user, so they do not click something that
will fail. The server check is the security. If the two ever disagree,
the server wins — and I proved that with curl.

**"Why invalidate the list as well as the task?"**
Because the list holds its own copy of that task. Without invalidating
it, going back shows the old status and the app looks broken even though
the save worked.

### Build prompt

```text
Read AGENTS.md, 03-DESIGN-REFERENCE.md section 6, and docs/notes/v7.md.
Build V8 only.

Before coding, explain in plain English what happens to the cached list when
I change a task's status on the detail screen, and what the user sees if I
skip that step. Wait for my yes.

Do the five V8 steps. The delete dialog must name the task and show its real
comment count from the API, not a hardcoded number. Do not add comment
editing or deleting — those are on the exclusion list; render the ⋯ as inert
or leave it out, and say which. Do not add @ mentions. Do not add websockets.

Verify in a real browser at 1440px and 390px: change a status and go back,
watch the Unsaved changes card while editing, set a past due date, open a bad
id, post an empty comment, and try to delete another user's task with curl
from a second account. Real output and screenshots into docs/notes/v8.md.
Do not start V9.
```

---
---

# V9 — Dashboard and Team  *(optional — cut this first)*

**Time:** ~1.5 h

### Outcome

The two remaining screens in the design exist: a dashboard with four
counts and a recent-tasks table, and a read-only team list.

### Why now

Because it is optional, and everything required is already done. If you
are at hour nine, **skip this version and go to V10.** That is not a
failure — it is the plan working.

If you do build it, build it now rather than earlier, because both
screens reuse components that V7 and V8 already made. The dashboard's
recent-tasks table is the V7 table with a smaller page size and no
filters. The team list is the same table shell with different columns.

### Concepts you must be able to explain

**Counting in the database, not in the app.** The four dashboard numbers
come from one aggregation that groups by status and counts, not from
fetching every task and counting in JavaScript. One small answer over
the network instead of the whole table.

**Reusing a component versus copying it.** The recent-tasks table should
be the same component as the list table, with different props. If you
find yourself copying it, the first version was not general enough —
fix that instead of duplicating.

**Building only what the data supports.** The design's team screen shows
a Role column, an assigned-task count, and Active/Invited status. You
have no roles and no invitations. So: show the assigned count (you can
compute that), and either drop the other two columns or show them as
clearly static. **Do not invent data on screen** — an interface showing
a number nobody computed is the single most common thing that gets
marked down, and the assessment's design brief calls itself "unverified"
for the same reason.

### Steps

1. `GET /api/tasks/stats` already exists from V4. Add a `useStats()`
   hook and the four stat cards, matching the design: label, big number,
   small trend line, icon top-right.
2. The Recent Tasks card — the V7 table component with `limit=6`, no
   filters, and a `View all tasks →` link.
3. The Team screen — the member table with initials badge, name, email
   and a real assigned-task count from a small aggregation. Drop or
   freeze the Role and Status columns, and say which in the README.
4. Wire the sidebar links, and make `My Tasks` a link to
   `/tasks?assigneeId=<me>` with a real count badge.
5. Mobile versions of both, following the phone frames in the design.

### Exit check

- The four dashboard numbers match `db.tasks.countDocuments(...)` for
  each status in `mongosh`. **Check both.**
- Every number and name on both screens came from an API response.
  Search the two screen files for a hardcoded digit — there should be
  none. **This is the adversarial one.**
- `My Tasks` in the sidebar opens the task list already filtered to you,
  and the badge count matches the number of rows.
- The recent-tasks table is the same component as the list table, not a
  copy. Show the import.
- Any column you kept but could not fill with real data is listed in the
  README as static.

### Review questions

**"Where do the dashboard numbers come from?"**
One aggregation that groups tasks by status and counts each group. I do
not fetch tasks and count them in the browser — that would send the
whole table over the network to produce four numbers.

**"The design's team screen has roles. Where are they?"**
I did not build roles, so I did not display them. Showing a Role column
filled with invented values would make the screen look finished while
being untrue. It is in the README under known limitations.

### Build prompt

```text
Read AGENTS.md, 03-DESIGN-REFERENCE.md and docs/notes/v8.md. Build V9 only.

V9 is optional. If I have said I am short on time, STOP and tell me to go
to V10 instead.

Before coding, list every number and label that will appear on these two
screens and say which API field each one comes from. If any has no source,
say so — we will drop it, not invent it. Wait for my yes.

Do the five V9 steps. Reuse the V7 table component; do not copy it. Do not
build the Settings screen. Do not add roles or invitations.

Verify by comparing every dashboard number against mongosh, and by grepping
both screen files for hardcoded numbers. Real output into docs/notes/v9.md.
Do not start V10.
```

---
---

# V10 — Make it safe, and prove the guards fire

**Time:** ~1 h

### Outcome

Every protective layer is in place, and each one has been made to fire on
purpose at least once.

### Why now

Doing it now rather than earlier means the guards go on a finished app
and you can see exactly what they block. Doing it now rather than never
is the difference between "I added helmet" and "I know what helmet
does".

The rule from the plan: **a guard nobody has ever seen fire is a guess.**

### Concepts you must be able to explain

**Counting requests and blocking floods** (**rate limiting**). Two
different limits: a strict one on login and register — say five attempts
per fifteen minutes per address — because that is where password
guessing happens, and a loose one everywhere else.

**Protective response headers** (**helmet**). One line that sets about a
dozen headers. The two worth naming: `X-Content-Type-Options: nosniff`
stops the browser guessing a file's type and running it as script, and
`X-Frame-Options` stops another site putting your app in an invisible
frame over their own buttons.

**Which website may call this API** (**CORS**). The browser asks your
server "is `http://localhost:5173` allowed?" before sending the real
request. Set exactly your frontend address — never `*`, and never `*`
together with credentials, which browsers refuse anyway.

**Refusing giant bodies.** `express.json({ limit: "100kb" })`. Without a
limit, one request can hold a large amount of your server's memory.

**Passing an object where a string was expected.** Already closed in V4
by Zod enums. Confirm it is closed everywhere, including the login route
— `{"email": {"$ne": null}}` is the classic login bypass and must return
400.

**Errors that say too little.** In production the error handler must
never send a stack trace or a database message. It sends a code and a
safe message, and logs the real thing on the server.

**Tests that use a real database, thrown away after**
(`mongodb-memory-server`). It starts a genuine MongoDB in memory, so your
tests exercise real indexes and real queries, and leave nothing behind.

### Steps

1. Add helmet, a configured cors, a 100kb json limit, and two rate
   limiters — strict on `/api/auth/login` and `/api/auth/register`, loose
   on everything else.
2. Make the error handler branch on `NODE_ENV`: stack traces in
   development, never in production. Log the full error server-side
   either way.
3. Write the adversarial tests: login with `{"email":{"$ne":null}}`,
   a tampered token, delete someone else's task, `?limit=500`,
   `?status[$ne]=done`, and a 200kb body.
4. Force each guard to fire once by hand. Temporarily set the login limit
   to 2, hit it three times, record the 429. Set the json limit to 1kb,
   send 2kb, record the 413. Then put the real values back.
5. Add two or three frontend tests with React Testing Library — the
   login form showing a server error, and the list showing its empty
   state — then run the whole suite and record coverage.

### Exit check

- Six wrong logins in a row: the sixth returns 429. **Recorded, with the
  real response.**
- A 200kb request body returns 413.
- `POST /api/auth/login` with `{"email":{"$ne":null},"password":"x"}`
  returns 400.
- `curl -H "Origin: http://evil.com"` on a task route is refused by
  CORS.
- With `NODE_ENV=production`, a deliberately thrown error returns a
  message with no stack trace and no database text. Check the response
  body, not the log.
- The full test suite passes. Record the exact count, the skip count, and
  the reason for every skip in `docs/notes/v10.md`.

### Review questions

**"What does helmet actually do?"**
It sets about a dozen protective response headers in one line. The two I
rely on are nosniff, which stops the browser guessing a response's type
and running it as script, and frame options, which stops my app being
loaded invisibly inside someone else's page.

**"Why a stricter limit on login than on everything else?"**
Login is where guessing happens, and a wrong guess is cheap for the
attacker. Five attempts per fifteen minutes makes a guessing attack
useless while never affecting a real person. The general limit exists for
abuse, not for guessing, so it is much looser.

**"How can a JSON body be a denial of service?"**
Express buffers the whole body in memory before parsing it. Without a
limit, a handful of large requests can consume the memory of the process.
The 100kb limit is far above any real request my app sends.

**"Show me a guard firing."**
I set the login limit to 2 and hit it three times; the third returned 429.
I set the body limit to 1kb and sent 2kb; it returned 413. Both responses
are pasted in my build notes.

### Build prompt

```text
Read AGENTS.md and the latest file in docs/notes/. Build V10 only.

Before coding, list every guard you will add, and for each one name the exact
attack it stops in one sentence. Wait for my yes.

Do the five V10 steps. Do not add new features. Do not refactor anything that
is already working.

Step 4 is not optional: temporarily lower each limit, make it fire, paste the
real 429 and 413 responses, then restore the real values and show the diff
proving they are restored. All of it into docs/notes/v10.md.
Do not start V11.
```

---
---

# V11 — Write the submission and check it from scratch

**Time:** ~1 h

### Outcome

Someone who has never seen this project can clone it, follow the README,
and have it running in under ten minutes — and the three required
documents are written from your real notes.

### Why now

This is the ship gate. Everything from here is polish, and polish is not
what is being assessed.

The riskiest thing in a submission is not a missing feature. It is a
README that does not work. A reviewer who cannot start your project
judges what they can see, and that is very little.

### Concepts you must be able to explain

**A README is a script, not a description.** Every command in it should
be copy-pasteable in order. Test it by following it yourself in a fresh
folder.

**`DECISIONS.md` is where a small project earns its grade.** For each
decision: what you chose, what you rejected, why, what it costs you, and
what would make you change. The rejected options are the part that shows
judgement. "I used JWT" says nothing; "I used JWT and accepted that I
cannot revoke a token before it expires, which is fine for a seven-day
internal tool and would not be for a banking app" says a lot.

**`AI_USAGE.md` is a trust document.** The assessment says AI use will
not count against you, and that not understanding your code will. So the
useful content is the *review*: what the AI suggested, what you changed,
and — required — one thing it got wrong.

**A known limitation written down is a strength.** An unwritten one that
the reviewer finds is a weakness. Same fact, opposite effect.

### Steps

1. Read every file in `docs/notes/` and `docs/decisions/`. Pull out the
   real decisions, the real dead ends, and the real AI corrections. These
   are your raw material — do not write the documents from memory.
2. `README.md` — what it is, what you need installed, setup step by step
   for both folders, every environment variable in a table with an
   example, how to run and how to test, a short architecture overview,
   the full API list as a table, how to create the two demo users,
   known limitations, and "what I would do next".
3. `DECISIONS.md` — one section per decision, using the shape above. At
   minimum: token storage, page-number paging, comments in their own
   collection, anyone-edits/creator-deletes, PATCH over PUT, Vite over
   Next.js, Express over NestJS, regex search over a text index, the
   atomic counter behind the `TF-` keys, **following the design's five
   statuses and four priorities instead of the brief's three and
   three**, and **which design screens you chose not to build and why**.
4. `AI_USAGE.md` — the tools, what each was used for, how you reviewed
   the output, two or three suggestions you changed with the before and
   after, at least one that was wrong or unsafe with what you did
   instead, and which parts you designed yourself.
5. Clone your own repository into a brand-new folder and follow the
   README with nothing memorised. Every place you had to think is a bug
   in the README. Fix it, then commit.

### Exit check

- A fresh clone into a new folder, following only the README, gets both
  apps running. Any step you had to work out yourself is now written
  down.
- `git ls-files` shows no `.env` and nothing under `docs/`. **Run it.**
- `git log --oneline` reads as a sensible story of the build.
- `DECISIONS.md` contains at least eight decisions, each with a rejected
  alternative and a stated cost.
- `AI_USAGE.md` contains at least one concrete example of an AI
  suggestion being wrong, with the code before and after.
- The README's API table matches the routes that actually exist. Check
  each one, do not trust the table.
- Every item on the exclusion list appears in the README under known
  limitations or "what I would do next".

### Review questions

This is the version where the review questions are the whole point. Before
you send it, out loud, without notes:

- Walk through what happens from typing a password to being logged in.
- Explain why a filtered list query is fast, and show the index.
- Name one thing you would change if this had a hundred thousand tasks.
- Name one thing an AI suggested that you rejected, and why.
- Name the biggest weakness in what you built, and what it would take to
  fix.

If any of those is shaky, go back to that version's Concepts section. That
is exactly what those sections are for.

### Build prompt

```text
Read AGENTS.md and every file in docs/notes/ and docs/decisions/. Build V11.

Before writing, list the decisions you found in my notes and tell me which
ones deserve a section in DECISIONS.md. Wait for my yes.

Do the five V11 steps. Write nothing from memory — every claim in the three
documents must trace back to something in docs/. Do not invent an AI mistake;
find the real one in my notes.

Then run `git ls-files` and paste the output, so I can see that docs/ and
.env are absent. Do not push.
```

---
---

## After V11

Nothing. Send it.

If you have spare time, spend it on the review questions, not on
features. The assessment says it directly: *"Please do not spend
excessive time polishing features beyond the requirements."*

The thing that will decide this is not how much you built. It is whether
you can explain the parts you built, and whether you can name what you
chose not to build and why.
