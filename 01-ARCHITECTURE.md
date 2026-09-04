# Project architecture

The shape of the code, and the reason for each part.

The goal here is **simple enough to explain in an interview, solid enough
to be called production work.** Every folder below earns its place. If a
folder cannot be justified in one sentence, it is not in this plan.

---

## 1. One repository, two apps

```
taskflow/
├── server/          the backend  — Node + Express + MongoDB
├── web/             the frontend — React + Vite + Tailwind
├── docs/            your private working notes (NOT committed)
├── README.md        submission doc — committed
├── DECISIONS.md     submission doc — committed
├── AI_USAGE.md      submission doc — committed
├── AGENTS.md        the rules for every build session — committed
└── .gitignore
```

**Why one repository and not two?**

Two repositories means two clones, two setups, two sets of instructions,
and a reviewer who has to switch between browser tabs to read your code.
For a small project with one author it costs more than it gives.

One repository with two clearly separated folders gives the reviewer a
single `git clone` and a single README, while the two apps still start,
build and deploy on their own.

**Why not a monorepo tool** (a manager like Turborepo or Nx that links
packages together)? Because there is nothing shared between the two apps
except a handful of type definitions, and those can be copied in twenty
lines. A monorepo tool would be a whole extra system to explain, with no
payoff at this size.

---

## 2. The backend — `server/`

```
server/
├── src/
│   ├── config/
│   │   ├── env.ts              reads and checks settings from .env
│   │   └── db.ts               opens the database connection
│   │
│   ├── models/                 the shape of data on disk
│   │   ├── user.model.ts
│   │   ├── task.model.ts
│   │   └── comment.model.ts
│   │
│   ├── modules/                one folder per feature
│   │   ├── auth/
│   │   │   ├── auth.routes.ts      which URLs exist
│   │   │   ├── auth.controller.ts  reads request, sends response
│   │   │   ├── auth.service.ts     the actual rules and logic
│   │   │   └── auth.schema.ts      what valid input looks like
│   │   ├── users/
│   │   ├── tasks/
│   │   └── comments/
│   │
│   ├── middleware/             code that runs between request and handler
│   │   ├── requireAuth.ts      rejects anyone not logged in
│   │   ├── validate.ts         rejects bad input before it reaches logic
│   │   └── errorHandler.ts     turns any thrown error into a clean JSON reply
│   │
│   ├── lib/
│   │   ├── AppError.ts         our own error type, with an HTTP status on it
│   │   ├── password.ts         hashing and checking passwords
│   │   └── token.ts            creating and reading login tokens
│   │
│   ├── app.ts                  builds the Express application
│   └── index.ts                starts the server listening on a port
│
├── tests/
│   ├── setup.ts
│   ├── auth.test.ts
│   ├── tasks.test.ts
│   └── comments.test.ts
│
├── .env                        real settings — NOT committed
├── .env.example                fake settings showing which keys exist — committed
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### How one request travels through it

Say the frontend asks for a list of tasks. Follow the arrow:

```
Browser
  │  GET /api/tasks?status=todo&page=2
  ▼
app.ts               puts on the safety layers (see §4)
  ▼
auth.routes / tasks.routes   matches the URL, picks the handler
  ▼
requireAuth          reads the login token; no token → stop here with 401
  ▼
validate             checks status=todo is a real status; bad → stop with 400
  ▼
tasks.controller     pulls page and status out of the request
  ▼
tasks.service        the real work: builds the database query, applies rules
  ▼
task.model           Mongoose talks to MongoDB
  ▼
back up the same path, as JSON
```

If anything throws an error at any point, `errorHandler` catches it at
the bottom and turns it into one consistent JSON reply. That is the
whole point of having it — no route needs its own try/catch ceremony.

### Why controller and service are separate

This is the one split worth defending in an interview.

- The **controller** knows about HTTP. It knows there is a request, a
  query string, a status code, a response body. It knows nothing about
  business rules.
- The **service** knows the rules. "Only the creator can delete a task."
  "A task cannot be assigned to a user who does not exist." It knows
  nothing about HTTP.

Two things fall out of that. First, you can test the rules without
pretending to be a browser. Second, if you ever add a second way in — a
scheduled job, a command line tool — it calls the service directly and
none of the rules get copy-pasted.

The honest tradeoff: for a route that just reads one record, the
controller and service look like pointless duplication. That is true.
It becomes worth it the moment a route has more than one rule, and
having one consistent shape everywhere is worth more than saving four
lines on the easy routes.

### Why feature folders, not type folders

The common alternative is `controllers/`, `services/`, `routes/` — one
folder per *kind* of file. It looks tidy at first and gets worse fast:
changing one feature means editing files in four distant folders.

Grouping by feature (`modules/tasks/` holds everything about tasks)
means the code you change together lives together. `models/` stays
separate on purpose, because a model is shared across features — tasks
and comments both need to know about users.

---

## 3. The frontend — `web/`

```
web/
├── src/
│   ├── api/
│   │   ├── client.ts           one place that talks to the backend
│   │   ├── auth.api.ts
│   │   ├── tasks.api.ts
│   │   └── comments.api.ts
│   │
│   ├── components/
│   │   ├── ui/                 plain building blocks: Button, Input, Badge…
│   │   └── ...                 blocks made of those: TaskCard, FilterBar…
│   │
│   ├── features/               one folder per screen area
│   │   ├── auth/
│   │   ├── tasks/
│   │   └── comments/
│   │
│   ├── pages/                  one file per URL
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── TaskListPage.tsx
│   │   └── TaskDetailPage.tsx
│   │
│   ├── hooks/                  reusable bits of behaviour
│   ├── lib/                    small helpers: dates, class names
│   ├── types/                  shared TypeScript shapes
│   ├── routes.tsx              the URL map
│   └── main.tsx                the starting point
│
├── tests/
├── .env                        NOT committed
├── .env.example                committed
├── index.html
├── package.json
└── vite.config.ts
```

Tailwind 4 has no `tailwind.config.ts`. The colours, fonts and sizes are
written straight into `src/index.css` in an `@theme` block, and the Vite
plugin reads them from there. So `index.css` is the single place a colour
code may appear — see `docs/decisions/0000-tailwind-v4.md`.

### The two-layer component rule

`components/ui/` holds pieces with **no knowledge of your app**. A
Button does not know what a task is. You could copy that folder into
another project unchanged.

`components/` (the level above) and `features/` hold pieces that **do**
know about your app. `TaskCard` knows a task has a priority and shows a
coloured badge for it.

This one line is what stops a component folder turning into a junk
drawer of 60 files.

### Why Vite and not Next.js

Next.js is a React framework that also runs code on the server. It is
excellent, and it is the wrong tool here.

This project already has a server — the Express backend. Adding Next.js
means a second server, and then a real question every reviewer will ask:
which server does this piece of logic belong to? That is a good question
with no cheap answer.

Vite builds a plain set of files that the browser downloads and runs. One
backend, one frontend, one clear line between them. The assessment asks
for "ReactJS", not for a React framework.

### The four libraries, and what each replaces

| Library | Plain description | What it saves you writing |
|---|---|---|
| **React Router** | Decides which screen shows for which URL | Hand-rolled URL matching |
| **TanStack Query** | Fetches data and remembers it | Loading / error / empty state bookkeeping in every component |
| **React Hook Form** | Tracks what the user typed in a form | Twenty lines of `useState` per form |
| **Zod** | Describes what valid data looks like, and checks it | Hand-written `if (!email.includes("@"))` chains |

TanStack Query is the one that pays for itself immediately here. The
assessment explicitly asks for loading, empty and error states on the
task list. Query gives you `isLoading`, `isError` and `data` for free on
every request, so those states are consistent everywhere instead of
being reinvented per screen.

Zod is used on **both** sides — the same rules describe a valid task in
the browser and on the server. The server still checks independently,
because anyone can send a request without using your frontend at all.

---

## 4. The safety layers

Five pieces sit in front of every request in `app.ts`. Each is one line
of setup and each blocks a real, named attack.

| Layer | Plain description | What it stops |
|---|---|---|
| **helmet** | Sets protective response headers | Browsers guessing file types, pages being framed by other sites |
| **cors** | Says which website is allowed to call this API | Any random site calling your API from a logged-in user's browser |
| **express-rate-limit** | Counts requests per user and blocks floods | Someone guessing thousands of passwords per minute |
| **express.json({ limit })** | Refuses giant request bodies | A 500 MB body eating all your server memory |
| **errorHandler** | Turns every error into the same JSON shape | Stack traces and database details leaking to strangers |

Two more that are not middleware but belong in the same conversation:

- **Passwords are hashed with bcrypt.** Hashing is a one-way scramble —
  you can check whether a password matches, but you can never turn the
  stored value back into the password. Even with a full copy of your
  database, an attacker does not have anyone's password.
- **Every query for a task is scoped.** No route ever reads a record by
  id alone without also checking that the logged-in user is allowed to
  see it.

---

## 5. Settings and secrets

A **.env** file is a plain list of `KEY=value` lines. It holds anything
that changes between your laptop and a real server, and anything secret.

`server/.env`:

```
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/taskflow
JWT_SECRET=<a long random string you generate>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

`web/.env`:

```
VITE_API_URL=http://localhost:4000/api
```

Two rules that are not optional:

1. **`.env` is never committed.** It has the secret that signs your login
   tokens. Anyone with it can log in as anyone.
2. **`.env.example` is always committed**, with the same keys and fake
   values. It is how a reviewer knows what to fill in. A missing
   `.env.example` is the most common reason a submission does not start
   on someone else's machine.

`config/env.ts` reads these at startup and checks them with Zod. If
`JWT_SECRET` is missing, the server refuses to start with a clear
message — instead of starting fine and failing mysteriously on the first
login.

---

## 6. What goes to git, and what does not

This is the split you asked for, and it matters.

### Committed — the submission

Everything the assessment asks for:

```
server/                 all source and tests
web/                    all source and tests
README.md               setup, how to run, architecture overview, API list, limits
DECISIONS.md            technical decisions, assumptions, alternatives, tradeoffs
AI_USAGE.md             tools used, what for, examples reviewed and changed
AGENTS.md               the rules the build followed
00-SETUP-GUIDE.md       how to get a machine ready
01-ARCHITECTURE.md      this file
02-PRODUCT-PLAN.md      the versions
03-DESIGN-REFERENCE.md  the design tokens and screen breakdown
.env.example  (both)    which settings exist
.gitignore
```

### Not committed — your private working record

```
docs/
├── decisions/          one file per decision, written when you make it
│   ├── 0001-auth-token-storage.md
│   └── 0002-pagination-style.md
└── notes/              one file per version, written when you finish it
    ├── v0.md
    ├── v1.md
    └── ...
```

**Why keep them at all if they are private?**

Because `DECISIONS.md` and `AI_USAGE.md` are due at the end, and nobody
can accurately remember, on day six, what they decided on day one and
what they rejected. These notes are the raw material. At the end you
read them and write the two public documents from them.

They are also your interview preparation. The assessment says plainly:
*"we may ask you to explain, modify, debug, or extend any part of your
implementation."* A build note that records the exact command you ran,
the real output, and the thing that broke first is worth more the week
after you finish than the day you wrote it.

**Why keep them out of git?**

They contain rough thinking, dead ends, half-formed opinions and notes
to yourself. That is exactly what makes them useful and exactly what you
do not want a reviewer reading as if it were a finished argument. The
finished argument is `DECISIONS.md`.

### `.gitignore`

```gitignore
node_modules/
dist/
build/
coverage/

.env
.env.local
.env.*.local

# private working record — see AGENTS.md
docs/

.DS_Store
*.log
npm-debug.log*

.vscode/
.idea/
```

Do this in **V0, before the first commit.** If `docs/` or `.env` is
committed once, removing it later leaves it in the history forever, and
a leaked `JWT_SECRET` stays leaked.

---

## 7. The data, in three collections

A **collection** in MongoDB is roughly what a table is in SQL — a
labelled box of records.

```
users
  _id, name, email (unique), passwordHash, createdAt, updatedAt

tasks
  _id, key (unique, "TF-118"), title, description,
  status   (todo | in_progress | in_review | done | blocked)
  priority (low | medium | high | urgent)
  dueDate  (may be empty)
  assigneeId → users._id  (may be empty)
  creatorId  → users._id  (never empty)
  createdAt, updatedAt

comments
  _id, taskId → tasks._id, authorId → users._id, body, createdAt

activity
  _id, taskId → tasks._id, actorId → users._id,
  type, from, to, createdAt

counters
  _id ("taskKey"), seq
```

Five statuses and four priorities, not three and three — the design file
is the source of truth and the brief calls its own list "suggested". See
`03-DESIGN-REFERENCE.md`.

`counters` is a single record holding the last task number. It exists so
two people creating a task at the same moment cannot both get `TF-118`:
one atomic `findOneAndUpdate` with `$inc` both adds one and returns the
new value, so nothing can slip between the read and the write. Counting
the existing tasks and adding one would race.

### One decision to make consciously: where comments live

MongoDB lets you put comments **inside** the task document, as a list.
That reads in one query and feels natural.

It has a hard ceiling: a single MongoDB document cannot exceed 16 MB, and
you cannot page through a list inside a document without loading the
whole document.

Comments are the classic unbounded list — one busy task can collect
hundreds. So they get their own collection, with an index on `taskId`.

This is exactly the kind of thing that belongs in `DECISIONS.md`, with
the rejected option and the reason kept.

### The indexes, and why

An **index** is a sorted lookup list the database keeps beside your data,
so it can jump straight to matching records instead of reading every one.

| Index | Why |
|---|---|
| `users.email` unique | Makes duplicate signups impossible at the database level, not just in code |
| `tasks.key` unique | The short id must never repeat, even if the counter is ever reset by hand |
| `tasks: { status, priority, updatedAt }` | The filter combination the list screen uses most, with the design's default sort |
| `tasks.assigneeId` | "My Tasks" is the most common filter |
| `tasks.dueDate` | Sorting and filtering by due date |
| `comments.taskId` | Loading one task's comments |
| `activity.taskId` | Loading one task's history |

Enforcing uniqueness in code alone does not work: two signups arriving at
the same moment can both check "is this email free?", both get yes, and
both insert. The database index is the only place that check is real.

---

## 8. What this architecture deliberately does not have

Written down so it is a decision, not an oversight. Each of these is a
fair interview answer.

- **No dependency injection container.** Services are plain functions.
  Injection frameworks earn their keep when you have many
  interchangeable implementations. Here there is one of everything.
- **No repository layer between service and model.** Mongoose already is
  that layer. Adding another one would be a wrapper around a wrapper.
- **No GraphQL.** The assessment asks for REST.
- **No state manager like Redux or Zustand.** Almost all state in this
  app is server data, which TanStack Query already holds. The little
  that is left — the open modal, the current filter — lives in the URL
  or in one `useState`.
- **No websockets or live updates.** Real value, real cost, not asked
  for. It goes in the "what I would do next" section of the README.
- **No Docker.** Local Node and local MongoDB, with clear setup steps.
  A reviewer with Node and MongoDB installed can run this in two
  commands.

---

Next: `02-PRODUCT-PLAN.md` — the versions, in order, with what to
understand before building each one.
