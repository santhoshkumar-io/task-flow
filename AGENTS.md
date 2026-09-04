# Working agreements

Rules that apply to **every** version. Claude Code reads this file at the
start of every session, before touching any code.

Keep this file to one page. A rule nobody remembers is not a rule.

---

## Scope

- Build only the version named in the request, from `02-PRODUCT-PLAN.md`.
- Do not start the next version. Do not add features that "will be needed
  later".
- No version may exceed five implementation steps. If it needs more, stop
  and say the version was scoped wrong.
- Prefer the smallest implementation that passes the exit check. No
  refactoring of code the version did not touch.

## Before writing any code

- State back, in plain English: what is being built, why, how the data
  moves, and which files will change. Wait for a yes.
- Ask only when a missing answer would change the implementation. Do not
  ask about things this file or the plan already answers.
- Before adding any new library, say in one sentence why the standard
  library or an already-installed library is not enough.

## How things must be explained

The engineer building this is not a native English speaker and is being
assessed on whether he can **explain** every part of the result.

- Use the everyday word as the main word, and put the technical word in
  brackets after it. Write "a scrambled one-way version of the password
  (called a hash)", then keep saying "the scrambled password".
- Never introduce a term in one paragraph and then rely on it for the
  rest of the answer.
- No jargon in headings or summaries at all.
- Prefer concrete numbers over abstract nouns. "Three of the eight routes
  have no login check" beats "authentication coverage is inconsistent".
- Exact values — pixel sizes, colour codes, library version numbers —
  belong in a clearly marked reference block, not in explanation prose.

## After implementing

- Walk through every changed file, line by line, in plain English.
- Write `docs/notes/vN.md` with the exact commands run, the **real**
  output pasted in, and evidence for each exit-check line. "Tests pass"
  is not evidence. `41 passed, 2 skipped` with the reason for each skip
  is evidence.
- Write `docs/decisions/NNNN-slug.md` for any choice that constrains
  later work. Record what was chosen, what was rejected, why, and what
  would make you change your mind.
- Comments in source code only where the reason is not obvious from the
  code itself.
- Do not call a version done until every exit-check line has been
  verified by running something, not by reading the code.

## Git

- Commit only what section 6 of `01-ARCHITECTURE.md` lists as committed.
- `docs/` and every `.env` file stay out of git. Both are in
  `.gitignore` from V0, before the first commit.
- One commit per meaningful unit of work. Message format:
  `type(scope): what changed` — for example `feat(tasks): add status filter`.
- Do not commit unless asked. Do not push unless asked.

## Safety

- Never commit a secret, a real password, or a real connection string.
- Do not deploy, do not buy services, do not change anything outside this
  folder.

## Product rules that must never be broken

These are the four things that would make me revert a change. They are
checkable, not aspirations.

1. **No password is ever stored or logged in readable form.** Only the
   scrambled one-way version (the hash) reaches the database.
2. **Every route that touches task or comment data requires a valid
   login token.** There are no exceptions and no "temporary" open routes.
3. **Only the person who created a task may delete it.** Anyone logged in
   may read and edit; only the creator may delete. A stranger's task id
   returns 404, never 403 — a 403 tells an attacker the id was real.
4. **Every input that reaches the database is checked on the server
   first.** Checks in the browser are for helpfulness, not for safety.

## Documentation

- If a version makes any document untrue — README, `.env.example`, this
  file, the plan — fix it in the same version.
- `README.md`, `DECISIONS.md` and `AI_USAGE.md` are written from
  `docs/notes/` and `docs/decisions/` at the end, in V11. Do not try to
  keep them current before then.

## The design is the source of truth

- Where `03-DESIGN-REFERENCE.md` and the assessment brief disagree, the
  design wins. The brief calls its own lists "suggested".
- Never write a six-digit colour code outside `web/src/index.css`. That
  file is the only place, because Tailwind 4 keeps its settings in CSS
  and there is no `tailwind.config.ts`.
- Never put a number on screen that did not come from an API response.
  A screen that looks finished and is untrue is worse than one that is
  visibly incomplete.
