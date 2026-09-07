# Decisions

The choices that shaped this, what I turned down, and what each one costs.

I kept a longer record while building (one file per decision, 27 of them). This is the short version of the ones that actually constrain the code.

---

## Assumptions I worked from

One team sharing one list. No projects, no workspaces, no multi-tenancy. The seat limit is 7.

The people using it trust each other. That's why anyone signed in can edit anyone's task. In a tool for one team that's usually right, and it's the wrong call the moment there's more than one team.

Small scale. Thirty tasks in the seed, a few hundred at most. Several decisions below would be different at a hundred thousand.

It's a code submission, not a running product. That framed how much I spent on operational concerns.

---

## Auth

**The login token goes in an httpOnly cookie, not localStorage.**

localStorage is easier: you read the token, you attach a header, and CSRF isn't a thing you have to think about. But any injected script can read it and take a copy that keeps working after the person has closed the tab.

The cookie can't be read by JavaScript at all. A script on the page can still act as the user while they're on it, but it can't take the pass away and reuse it. That's a real reduction in the blast radius, and it's why `sameSite: lax` matters below.

**Trade:** cookies bring CSRF, which localStorage doesn't have. `sameSite: lax` is the answer, and it's the reason the deployment is shaped the way it is.

**"Keep me signed in" unticked means a session cookie**, no `maxAge`, gone when the browser closes. If a checkbox is going to be there it should do something.

---

## Tasks and permissions

**Anyone can edit, only the creator can delete.**

Editing is the whole point of a shared list. Deleting is the one thing you can't undo, so it belongs to the person who made it. Admins can delete anything, which I added later when the Team screen made roles real.

**A stranger's task id returns 404, not 403.** A 403 confirms the id exists, which tells an attacker their guess was right. 404 tells them nothing.

**The server is the guard, the UI is a kindness.** Delete is hidden for people who can't use it, but hiding it isn't the protection. Curl the endpoint as the wrong user and you still get 404.

---

## Data

**MongoDB, one document per task.** A task is naturally a document, and the filters the design needs are all single-collection queries. Nothing here wanted joins.

**Comments are their own collection, not an array inside the task.** An array is simpler until you want to page through them, edit one, or count them without loading the task. Deleting a task deletes its comments explicitly, which is a line of code I have to remember instead of something the database does for me. Worth it.

**Short readable ids (`TF-118`) come from a counter document.** People say "TF-118" out loud. Nobody says a 24-character hex string. The counter is a separate atomic increment, which is a second write on create.

**Page numbers, not cursors.** The design draws "Showing 1-10 of 42" and numbered page buttons. Both need a total and a current page, and cursor paging can't answer either question. It only knows whether there's more after this one, which gives you infinite scroll.

**Trade:** `skip` gets slower as the page number grows, because the database walks past the rows it's throwing away. At 42 tasks that's nothing. At page 500 of a large collection it's real, and it grows linearly.

---

## Frontend

**Filters, sort and page live in the URL.** Refresh keeps them, the back button works, and you can send someone a link to what you're looking at. All of that comes free, and none of it does if the state sits in a component.

**TanStack Query owns everything that came from the server.** No second copy in a store to drift out of date. Mutations invalidate, the list refetches, the screen catches up on its own.

**Tailwind 4 with the config in CSS.** Version 4 dropped `tailwind.config.ts` in favour of a `@theme` block, so `web/src/index.css` holds every colour, size and font. That gave me a rule worth having: no six-digit colour code anywhere else in `web/src`. It's greppable, and I grepped it before every submission.

**No number reaches the screen unless it came from a response.** The dashboard draws grey blocks while loading and an error panel on failure, never a zero. A zero looks like a real count saying there's no work, which is worse than an obvious error. The `1-10 of 42` under the list is arithmetic on `page`, `limit` and `total` from the response, never a count of what's on screen, because that breaks the moment the last page is short.

---

## Testing

**196 server tests against a real MongoDB in memory**, not a mocked driver. Mocking Mongoose tests my mock. The in-memory server is the same engine, so an index or a query that doesn't work fails here rather than in production.

**26 end-to-end tests in a real browser.** The server tests call Express in-process and the web tests run in jsdom with the network mocked, so between them they can't see a missing cookie, a CORS header, a route guard letting someone through, or a form that submits and never arrives. That gap is exactly where the expensive bugs live.

They run against an API with its own throwaway database. `npm run seed` deletes everything it can see, so pointing the tests at a real database would mean wiping it every run, and a suite that destroys what it tests is one people stop running.

**Two widths, not one.** The app mounts the desktop table and the mobile card stack together and hides one with CSS. Testing one width is blind to half the interface.

---

## Deployment

**The frontend proxies `/api` through to the backend rather than the browser calling it directly.**

Render and Vercel are different sites. A `sameSite: lax` cookie doesn't get sent on a cross-site request, so login would have appeared to work and then every request would have come back 401.

Two ways out. Change the cookie to `sameSite: none`, which is one line and throws away the CSRF protection that made the cookie worth choosing. Or put the API on the same domain with a rewrite, which costs one network hop and keeps everything.

I took the hop. Verified after deploying: the cookie's domain is the Vercel address, not Render's.

**`TRUST_PROXY_HOPS` is a setting, not a constant.** Behind a proxy, every request looks like it came from the balancer, so a per-address rate limit becomes a global one and the sixth person to sign in that quarter hour is refused. The right number describes the hosting, not the app, so it belongs in config. It's a number and never `true`, because trusting the whole forwarded-for chain lets anyone extend it by hand.

**Rate limit counts live in one process's memory.** Two instances would each allow the full amount and a restart forgets everything. Redis is the real answer and it's infrastructure this doesn't have. I'd rather write that down than pretend.
