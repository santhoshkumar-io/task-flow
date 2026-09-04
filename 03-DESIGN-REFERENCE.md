# Design reference — TaskFlow UI handoff

Everything read out of the design file, in one place.

**Written for two readers.** Sections 1 to 3 are for you, in plain
English. Section 8 is the exact-numbers block for the builder — it is
the only place raw colour codes and pixel values belong.

> **Three numbers to confirm.** I read this from a page capture, not the
> live file, so three values in the foundations panel are not fully
> sharp: the top bar height (46 or 56 px), the content padding (40 px),
> and the exact grey used for muted text. Open the artifact, zoom in on
> the "Controls & metrics" panel, and confirm before V6.

---

## 1. The three things that change the plan

Read this part first. The design does not match the assessment brief
exactly, and where they differ, **the design wins** — the brief calls its
list "suggested", the design calls itself "the source of truth".

### There are five statuses, not three

`To Do` · `In Progress` · `In Review` · `Done` · `Blocked`

The brief suggested three. The design shows five, with a colour each.
Build five.

### There are four priorities, not three

`Low` · `Medium` · `High` · `Urgent`

Same reason. Build four.

### There are three fields the brief never mentioned

- **Due date.** On the create form, the edit form, the detail rail and
  the mobile task card. It has its own rule: *"Due date can't be in the
  past."*
- **A short readable id** — `TF-118`, `TF-117`, `TF-116`. It appears
  under every task title and in the breadcrumb. It counts up, so it is
  not random.
- **An activity trail** — "Sarah Chen moved this to In Progress · 2h
  ago". A short history on the detail screen.

All three are visible in the design, so all three are part of
"reproduce the visual design".

---

## 2. The screens, and which ones you actually build

The design has nine screens. The brief asks for five of them.

| Screen | In the design | Build it? |
|---|---|---|
| Login | yes | **Yes** — required |
| Register | no — only a "Create an account" link | **Yes**, matching the login card |
| Task list | yes, marked "primary screen" | **Yes** — required |
| Create task (right drawer, 480px) | yes | **Yes** — required |
| Task detail | yes | **Yes** — required |
| Edit task (inline) | yes | **Yes** — required |
| Dashboard | yes | **Only if time remains** (V9) |
| Team | yes | **Only if time remains** (V9) |
| Settings (4 tabs) | yes | **No** — see below |

Settings is out. It needs profile editing, notification preferences and
a device session list — none of which the brief asks for, and all of
which cost more than they show. That goes in the README under known
limitations, as a deliberate choice.

**And four states, all of which are required:**

| State | What the design shows |
|---|---|
| Loading | Grey skeleton blocks at the same row height as the real table, so nothing jumps |
| Empty — filtered | Magnifier icon, "No tasks found", *Clear filters* and *Create Task* buttons |
| Error | Full-panel retry, plus a toast in the corner with a request id |
| Confirm delete | A red-icon dialog naming the task and its comment count |

The design draws these as separate frames. That is a strong hint they
will be checked.

---

## 3. The shell — the frame every screen sits inside

```
┌────────────┬──────────────────────────────────────────────┐
│  TaskFlow  │  TaskFlow › Tasks     [search]   🔔   (AM)   │ top bar
│            ├──────────────────────────────────────────────┤
│ WORKSPACE  │                                              │
│ ▢ Dashboard│         the screen goes here                 │
│ ▤ Tasks    │                                              │
│ ▤ My Tasks6│                                              │
│ ▤ Team     │                                              │
│            │                                              │
│ ⚙ Settings │                                              │
│ (AM) Alex  │                                              │
└────────────┴──────────────────────────────────────────────┘
   216px wide
```

- Left strip is 216px, never scrolls, and has a small grey heading
  `WORKSPACE` above the links.
- The selected link has a light grey pill behind it.
- "My Tasks" carries a count badge.
- Settings and the signed-in person sit pinned at the bottom.
- The top bar holds a breadcrumb on the left (`TaskFlow › Tasks ›
  TF-118`) and search, a bell and your avatar on the right.

**On a phone (390px wide)** the left strip disappears behind a hamburger
button and slides in over a dimmed page. The bottom of the screen gains
a two-tab bar plus a round black *Create Task* button.

---

## 4. The task list screen, in detail

**Table columns:** Task · Status · Priority · Assignee · Created ·
Updated · Actions

- The **Task** cell is two lines: the title in medium weight, the short
  id (`TF-118`) underneath in small grey.
- **Status** is a pill with a coloured dot and a matching pale
  background.
- **Priority** is a coloured dot and plain text — **no pill**. This
  difference is deliberate in the design; keep it.
- **Assignee** is a small round initials badge plus the name.
- **Created** is a date (`Aug 12`). **Updated** is relative (`2h ago`,
  `Yesterday`, `3d ago`).
- **Actions** is a `⋯` button opening a menu: *Edit task* · *Duplicate* ·
  *Delete task* (delete in red).

**Above the table:** a search box, three dropdowns (`Status : All`,
`Priority : All`, `Assignee : Anyone`) and a sort control on the far
right (`↑↓ Last updated`).

**Below the table:** `Showing 1–10 of 42 tasks` on the left, and page
buttons on the right — `‹ Previous  [1] 2 3 … 5  Next ›`, current page
filled black.

**When filters are active** they become removable chips with an `×`, and
a blue `Clear all` link appears beside them.

**On a phone** the table becomes a stack of cards. Each card is the
title, then `TF-118 · due Aug 29`, then the status pill and the priority
dot on one row with the assignee badge pushed right, and a `⋯` in the
corner. The pager is replaced by `Showing 1–8 of 42 tasks` and a full
width **Load more** button.

---

## 5. The create-task drawer

Slides in from the right, **480px wide**, over a dimmed page.

Fields, in order: **Task Title** (required), **Description** (a text
area with `Markdown supported` on the left and `0 / 2000` on the right),
then **Status** and **Priority** side by side, then **Assignee**.

The design shows it in its **error** state: the title box has a red
border and a red line under it reading *"Task title is required"*. It
also shows the priority dropdown open, with a tick beside the selected
option.

Footer, pinned to the bottom: `Cancel` (plain) and `Create Task`
(black).

**On a phone** this is a full screen sheet instead of a drawer, with
`Cancel` and `Create` in the header, and priority as four segmented
buttons instead of a dropdown.

---

## 6. The detail and edit screens

**Detail** is two columns: the wide left column and a 300px-ish right
rail.

Left column, top to bottom: `← Back to tasks`, the short id, the title
as a large heading, a row of badges plus *"Updated 2 hours ago by Sarah
Chen"*, and on the right an `Edit` button and a `⋯` menu.

Then two cards: **Description**, and **Comments** with a count. Each
comment is an initials badge, the author name in bold, a relative time,
the body underneath, and a `⋯` on the right. Below them a compose box
with your own avatar, the hint *"Use @ to mention a teammate"* on the
left and a black **Comment** button on the right.

Right rail, two cards: **Task information** (Assignee, Status, Priority,
Due date, Created by, Created, Updated — label left, value right) and
**Activity** (three lines of history, names in bold, time in grey).

**Edit** replaces the left column with a form and the right rail with
two new cards:

- **Unsaved changes** — a live list of what you changed
  (`Priority · High → Urgent`), a grey line reading *"Save is disabled
  until validation errors are resolved"*, and a **disabled** Save
  button. This is a lovely detail and it is cheap: you already know
  which fields changed.
- **Danger zone** — a pale red card, *"Deleting a task removes its
  comments and activity. This can't be undone."*, and a red-outline
  **Delete task** button.

The date field shows the past-date error inline: *"Due date can't be in
the past."*

---

## 7. The four states, exactly as drawn

**Loading.** Grey blocks where content will be. The design annotates its
own rule: *"Skeletons: #EDEDED blocks, 6px radius, 1.4s opacity pulse
(.55 → 1). Same row height as loaded table (56px) to avoid layout
shift."* Copy that literally — matching the row height is the whole
point.

**Empty with filters.** Filter chips still visible above, then a
centered magnifier in a circle, `No tasks found`, `Try changing your
filters or create a new task.`, and two buttons: `Clear filters`
(outline) and `Create Task` (black).

**Error.** The panel shows a retry area with a black `↻ Try Again`
button and a small grey line: `Request ID: b1f2fc4 · 500 from
/api/tasks`. A toast slides in bottom-right: a red circle icon,
`Couldn't load tasks`, `Network request failed. Retrying in 5s.`, and a
close ×.

That request id is worth copying. It means your API returns an id with
every error and the screen shows it — the sort of thing that reads as
production experience.

**Delete confirm.** A small centered dialog over a dim page. Red circle
with a bin icon, `Delete this task?`, then the specific text: *"Fix
payment webhook issue" and its 4 comments will be permanently removed.
This action can't be undone.* Buttons: `Cancel` and a red `Delete task`.

Note it names the task **and counts its comments**. Generic confirm text
would be a visible miss.

---
---

## 8. Reference block — exact values for the builder

Everything below goes into the `@theme` block in `web/src/index.css` in
V6. Tailwind 4 has no separate config file, so that one file is the whole
of it. After that, **no screen file contains a raw colour code.**

### 8.1 Colour

| Role | Hex |
|---|---|
| Ink / primary | `#0A0A0A` |
| Accent | `#3B82F6` |
| Success | `#16A34A` |
| Warning | `#CA8A04` |
| Destructive | `#DC2626` |
| App canvas | `#FCFCFC` |
| Sidebar / top bar | `#F9F9F9` |
| Border | `#E5E5E5` |
| Skeleton | `#EDEDED` |

### 8.2 Status and priority colours

Derived from the palette above — confirm the pale backgrounds against
the artifact.

| Status | Dot | Background |
|---|---|---|
| To Do | neutral grey | neutral 100 |
| In Progress | `#3B82F6` | blue 50 |
| In Review | `#CA8A04` | amber 50 |
| Done | `#16A34A` | green 50 |
| Blocked | `#DC2626` | red 50 |

| Priority | Dot | Rendering |
|---|---|---|
| Low | neutral grey | dot + plain text, **no pill** |
| Medium | `#3B82F6` | dot + plain text |
| High | `#CA8A04` | dot + plain text |
| Urgent | `#DC2626` | dot + plain text |

### 8.3 Type

Two families. `Outfit` for headings, `Geist` for everything else. Both
are on Google Fonts.

| Use | Font | Size | Weight | Extra |
|---|---|---|---|---|
| Page title | Outfit | 24 | 700 | letter-spacing `-0.02em` |
| Section heading | Outfit | 20 | 600 | |
| Table cell, emphasis | Geist | 14 | 500 | |
| Body copy | Geist | 14 | 400 | line-height 1.5 |
| Metadata, timestamps, helper | Geist | 12 | 400 | |

Fallback stack: `Outfit, ui-sans-serif, system-ui, sans-serif` and
`Geist, ui-sans-serif, system-ui, sans-serif`.

### 8.4 Sizes and spacing

| Thing | Value |
|---|---|
| Sidebar width | 216 px |
| Top bar height | 56 px *(confirm — may be 46)* |
| Table row height | 56 px |
| Content padding | 40 px *(confirm)* |
| Spacing grid | 8 pt — use 4, 8, 12, 16, 24, 32, 40 |
| Corner radius, default | 8 px |
| Corner radius, badges and skeletons | 6 px |
| Input height | 40 px |
| Badge height | 22 px |
| Create drawer width | 480 px |
| Desktop frame | 1440 × 900 |
| Mobile frame | 390 × 844 |
| Shadow | `xs` on cards, `md` on drawer, dialog and toast |

### 8.5 Buttons

| Variant | Look |
|---|---|
| Primary | `#0A0A0A` background, white text |
| Secondary | white background, `#E5E5E5` border, ink text |
| Destructive | `#DC2626` background, white text |
| Destructive outline | white background, red border, red text (danger zone) |
| Disabled | mid grey background, lighter text, no pointer |

### 8.6 Inputs

- 40 px tall, 8 px radius, `#E5E5E5` border.
- Focused: accent border plus a soft accent ring.
- Error: `#DC2626` border, message underneath at 12/400 in red with a
  small warning icon.

### 8.7 Badges

22 px tall, 6 px radius, label at 12/500, 1 px border, coloured dot
before the label.

### 8.8 Skeleton animation

```css
@keyframes tf-pulse { 0%,100% { opacity: 1 } 50% { opacity: .55 } }
.tf-skeleton {
  background: #EDEDED;
  border-radius: 6px;
  animation: tf-pulse 1.4s ease-in-out infinite;
}
```

### 8.9 Breakpoint behaviour

| Width | Behaviour |
|---|---|
| ≥ 1024 px | Sidebar fixed, table view, detail in two columns |
| 768 – 1023 px | Sidebar collapses to a slide-over, table keeps horizontal scroll |
| < 768 px | Cards instead of table rows, bottom tab bar, full-screen sheets, detail in one column, comment box docked to the bottom |

---

## 9. What this changes in the plan

Fold these into the versions:

- **V3** — five statuses, four priorities, a `dueDate` field, and the
  short readable id (`TF-118`).
- **V4** — a counts route for the dashboard cards, and the `Created` and
  `Updated` columns as separate values.
- **V5** — comments, plus a small activity trail written whenever a task
  changes.
- **V6** — this file becomes `docs/decisions/0003-design-tokens.md`. The
  UI kit is: Button (5 variants), Input, Textarea, Select, Badge, Avatar,
  Card, Dialog, Drawer, DropdownMenu, Toast, Skeleton, Tooltip.
- **V7** — the table, the filter chips, the pager, the drawer, and all
  four states drawn above.
- **V8** — detail, edit with the unsaved-changes rail, comments, and the
  delete dialog that names the task and counts its comments.
- **V9** — dashboard and team, only if time remains.
