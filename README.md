# Kairos

### Time well spent.

Kairos is a personal productivity workspace built around a simple idea: **if something matters, give it time, track that time, and watch your consistency add up.**

It combines flexible project organization, frictionless time tracking, independent time-based goals, habit streaks, Pomodoro focus blocks, a weekly time-blocking calendar, and calm analytics into one polished workspace — dark by default.

**[Live demo →](https://kairos-lime-three.vercel.app)** · `demo@kairos.app` / `demo1234`

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" />
</p>

![Kairos dashboard](docs/screenshots/dashboard.png)

## Why Kairos

Most time trackers answer “how many hours did I work?” Kairos tries to answer better questions:

- How much time did I invest in my startup this week?
- Which project has been getting neglected?
- Am I actually reading every day, or only intending to?
- Is my time aligned with the priorities I chose?
- How has my allocation changed over the last six months?

Time is the unit of progress here — not task checkboxes or vague productivity scores.

## Screenshots

### Track your week, block by block

A weekly Google Calendar–style view of every time entry, with overlapping sessions, overnight splitting, a live current-time line, and click-to-edit blocks.

![Weekly timer calendar](docs/screenshots/timer.png)

### Goals that stay independent at every level

Daily, weekly, monthly, and custom targets on any item. Parent and child goals never constrain each other, and every day of the month is visible in a spreadsheet-style grid.

![Goals and habits](docs/screenshots/goals.png)

### Analytics that explain where the hours went

Time distribution, daily/weekly/monthly trends, weekday rhythm, time-of-day patterns, goal health, and habit consistency.

![Analytics](docs/screenshots/analytics.png)

## Features

### Flexible hierarchy
- Unlimited-depth items — areas, projects, custom items, or unclassified
- Create, edit, nest, move, reorder, archive, restore, and safely delete
- Table-style Projects page with weekly totals, goal counts, and sub-item counts
- Drag one item onto another to nest it
- Parent totals automatically include every descendant, counted exactly once

### Time tracking
- One server-authoritative timer per user
- Start immediately with no project, then assign or change the project later
- Pause, resume, stop, and edit the running project
- Timestamps are authoritative — timing stays accurate across navigation, refreshes, and browser restarts
- Manual entries with date, optional start time, duration, and description
- Unassigned time is preserved rather than silently discarded
- Table-based history plus a calendar view
- Edit or delete any entry, with totals and goals recalculated immediately

### Goals, habits, and streaks
- Independent goals on any item at any depth
- Daily, weekly, monthly, and custom date-range periods
- Scheduled weekdays, reminders, and preserved target history
- Progress, pace, remaining time, completion status, streaks, and consistency
- GitHub-style habit history with distinct shades for completion and missed periods
- Spreadsheet view for reviewing every day of a month

### Pomodoro
- Focus, short-break, and long-break phases
- Configurable durations, rounds before a long break, auto-start options, and sound cues
- Starts instantly from the sidebar or workspace
- Live timer in the sidebar, navbar, and a draggable floating widget
- Movable, resizable floating window with a 60-minute regular timer dial too
- Focus-only time saved to history as Pomodoro sessions
- Custom duration editing mid-session

### Weekly timer calendar
- Google Calendar–style weekly time-blocking grid
- Time entries placed by actual start/end time
- Side-by-side layout for overlaps
- Overnight entries split across days
- Week navigation and current-time indicator
- Automatically uses the browser’s current timezone — no GPS permission

### Dashboard and analytics
- Today’s time, weekly trend, goal-directed percentage, and best streak
- Compact all-goals table with expansion
- Expandable Areas & Projects tree
- Table-style recent sessions and a habit-history grid
- Time distribution, trends, weekday rhythm, time-of-day patterns
- Goal completion health and habit consistency
- Item-level analytics with drill-down

### Platform
- **Dark mode by default**, with light and system themes
- Responsive layouts for desktop, tablet, and mobile
- Command palette (`⌘K` / `Ctrl+K`)
- Accessible dialogs and menus with Radix UI
- JSON data export
- In-app reminders and clear empty states

## Quick start

### Prerequisites

- Node.js **20.9+**
- pnpm **10+**
- PostgreSQL running locally

### Setup

```bash
pnpm install
cp .env.example .env
```

Create a database and configure `.env`:

```bash
createdb timetracker
```

```env
DATABASE_URL="postgresql://YOUR_USER@localhost:5432/timetracker?schema=public"
SESSION_SECRET="run: openssl rand -base64 32"
```

Apply migrations and seed the demo workspace:

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Live demo

**https://kairos-lime-three.vercel.app**

```text
Email:    demo@kairos.app
Password: demo1234
```

The login screen also has an **Open the demo workspace** button.

## Architecture

- **Next.js 16** App Router, React Server Components, Server Actions
- **TypeScript**
- **Tailwind CSS 4** with a custom token-based design system
- **PostgreSQL + Prisma 6**
- **jose** JWT sessions in HTTP-only cookies
- **bcryptjs** password hashing
- **Recharts** for charts
- **Radix UI** for accessible primitives
- **date-fns / date-fns-tz** for timezone-aware periods and attribution

### Project structure

```text
prisma/
  schema.prisma        # User, Workspace, Item, Goal, TimeSession, TimerState
  seed.ts              # Realistic demo workspace

src/
  app/
    (auth)/            # Login and signup
    (app)/
      dashboard/       # Daily overview
      workspace/       # Projects hierarchy
      timer/           # Weekly time-blocking calendar
      goals/           # Goals & habits spreadsheet
      pomodoro/        # Full Pomodoro experience
      analytics/       # Reports and insights
      history/         # Session table and calendar
      items/[id]/      # Item detail + item analytics
      settings/        # Profile, workspace, preferences, security
    actions/           # Server Actions
    api/export/        # JSON export
  components/          # UI, charts, dialogs, timer, calendar, dashboards
  lib/                 # Auth, timezone/time math, goals, analytics, Prisma
```

### Time attribution

A session belongs to exactly one item. For aggregates, its time rolls up through every ancestor. Goals attached anywhere on that path include it. A parent total never double-counts its children, but the same session can legitimately contribute to independent goals at multiple levels.

```text
Startup Work                     20h / 20h target
  Habit Tracker       8h          ← this time also counts toward Startup Work
  Time Tracking App   7h
  House Rental App    5h
```

### Data model

```text
User ─── Workspace ─── Item (self-referencing, unlimited depth)
               │          ├── TimeSession
               │          └── Goal (target history preserved)
               └── TimeSession
User ─── TimerState (one active timer per user)
```

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Production build |
| `pnpm start` | Start the production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:migrate` | Create/apply a development migration |
| `pnpm db:push` | Push the schema without a migration |
| `pnpm db:seed` | Reset and seed the demo workspace |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:generate` | Regenerate Prisma Client |

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | HS256 signing key for session cookies |

## Notes

- The MVP is designed for one personal workspace per user.
- Timer state and completed sessions are persisted in PostgreSQL.
- Pomodoro run state is persisted locally and reconciled against timestamps; completed focus blocks are saved to the database.
- The web app is structured so mobile and desktop clients can share the same API and data model later.
