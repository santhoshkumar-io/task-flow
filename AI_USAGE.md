# AI usage

## What I used

**Claude Code**, in the terminal and inside VS Code. That was the only AI tool.

## What I used it for

Most of the code. I worked in versions, one slice at a time (auth, then the task list, then detail, then the dashboard and team screens, then hardening, then tests). For each one I described what I wanted, reviewed what came back, and ran it.

Where it earned its keep:

- **Boilerplate with a shape.** Routes, controllers, services and Zod schemas follow the same pattern in every module. Describing the pattern once and applying it was much faster than typing it eight times.
- **Tests.** 196 server tests and 26 end-to-end tests is more coverage than I'd have written by hand in the time.
- **Explaining things back.** I'd ask why a choice was better than the alternative before accepting it. A few times the answer didn't hold up and I changed the plan.
- **Debugging with evidence.** The most useful sessions were the ones where it went and checked rather than guessed. More on that below.

Where I didn't use it: the product decisions. What to build, what to leave out, what "done" meant. Those came from the plan I wrote first.

## How I kept it honest

I put a file called `AGENTS.md` in the repo with working agreements and pointed the tool at it every session. A few of the rules that did real work:

- No number on screen that didn't come from an API response.
- Never a six-digit colour code outside `web/src/index.css`. Greppable, so I could check it in one command.
- A visible control that silently does nothing is the worst option. Either make it work or make it visibly dead and say so.
- Write down anything that constrains later work, including what was rejected.

Rules you can check beat rules you can't. The colour one caught things twice.

---

## Things it got wrong

### 1. A refactor that would have deleted my database

Unsafe, and the one that would have hurt most.

The end-to-end tests needed to seed a throwaway database, so the seeding logic was pulled out of `seed.ts` into an exported `seedData()` function. Looked like pure extraction. Nothing else changed.

Except `seed.ts` called `seed()` at the bottom of the file, the way a command-line script does. So `import { seedData } from "./seed.js"` would have run the entire command-line seed as a side effect of the import: connect to whatever `server/.env` points at, delete every user, task and comment, and rebuild them.

My development database. Every time the tests started.

The fix is the standard entry-point check:

```ts
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed().catch(...);
}
```

What makes this one worth recording is that the diff looked completely safe. Moving code into a function is the least suspicious change there is. I only caught it because I asked what happens when the new file imports the old one, rather than reading the diff and nodding.

### 2. Two `<h1>` elements on every page

Incorrect, caught by a test rather than by me.

Making the phone screens match the design, the top bar got a page title. It was written as an `<h1>`. Every page already has an `<h1>` inside the main content, so now there were two, and a screen reader would have had two answers to "what is this page".

A Playwright test failed:

```
strict mode violation: getByRole('heading', { level: 1 }) resolved to 2 elements
```

Changed to a `<p>`. The desktop breadcrumb sitting next to it isn't a heading either, so it was inconsistent as well as wrong.

I mention it because the fix was easy and noticing it wasn't. It's the kind of thing that looks perfect in a screenshot.

### 3. Changing more than I asked for

I asked for one thing: the signed-in person's own avatar should be tinted, so you can pick yourself out of a list. What came back tinted every avatar, which made the tint mean nothing.

I said so. The second attempt tinted the right one, but applied the rule by hand in four places and missed four others, so the same person was blue on the Team page and grey on a task card.

The fix that stuck was a single `PersonAvatar` component that decides the tint itself by comparing ids. One place to be wrong instead of eight.

There's a pattern here. The first answer is usually the one that satisfies the sentence I typed. Whether it's the right shape is my job.

---

## One it got right that I want to record

Not everything was a correction.

Before the first deploy it flagged that the login cookie is `sameSite: lax`, and that Render and Vercel are different sites, so the browser would refuse to send it. Sign-in would have returned 200 and then every request would have come back 401, which is a miserable thing to debug from the outside.

It offered two options with the cost of each: change the cookie to `sameSite: none` (one line, throws away the CSRF protection that made the cookie worth choosing), or proxy `/api` through the frontend domain so the browser sees one site (one extra network hop, keeps everything).

I picked the proxy. That's the kind of use I'd defend: it found a problem I wouldn't have hit until it was live, laid out the trade honestly, and let me choose.

---

## Where I ended up

Roughly: it wrote most of the lines, I decided what the lines should do and checked they did it.

The checking is not optional. Two of the three problems above were found by running something, not by reading code, and the worst one looked completely harmless in a diff. Reviewing generated code the way you'd review a colleague's is not enough, because a colleague wouldn't hand you a two-line function move that empties a database.
