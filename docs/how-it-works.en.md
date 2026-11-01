# Functionality report — Lot Processing Checklist

## Purpose

This independent, unofficial OBMEP project helps a team see which exam lots have already been processed. It addresses a practical problem: without a shared record, someone may process the same lot twice while other lots wait. The dashboard displays each lot's current state and next required step.

## Lot workflow

| Step | Confirmation | Rule |
| --- | --- | --- |
| 1 | Exam papers processed | Available on an active lot whose papers are still pending. |
| 2 | Graders and reviewers | One click confirms both groups together after the papers. |
| 3 | Student grades entered | Available after the first two steps. |

To undo an earlier step, undo later steps first: grades, then the joint team confirmation, then papers. The server enforces this order even for direct API requests. An event log stores the action, lot, and time. Because there are no accounts, it cannot identify the operator.

## Levels and views

Level 1 uses yellow, level 2 pink, and level 3 blue. Completed lots appear green. A fresh database receives 81 empty lots in each of the initial ranges 100–180, 200–280, and 300–380. Users may add an unused integer from 1 to 999999 to any level. Numbers are unique within 2026, including soft deleted lots, and the current limit is 1000 lots.

Users can select a level, search by lot number, and filter for all, pending papers, pending graders/reviewers, pending grades, completed, or deleted lots. On mobile, the lot number and status remain visible while the action controls expand on tap.

## Counts and refresh

All indicators use the lots that are **currently active in the database**. Deletion lowers the active total; restoration raises it. The app does not assume a fixed count of 180 lots per level.

- **Papers remaining:** active lots without a papers confirmation.
- **Graders and reviewers remaining:** active lots without the joint confirmation and without recorded grades.
- **Grades remaining:** active lots without a grades confirmation, including lots still waiting for earlier steps.
- **Papers/grades percentage:** confirmed active lots divided by active lots in the selected scope, rounded to a whole percent.
- **Completed:** active lots with papers and grades confirmed. A lot finished before the joint step existed may show that step as unrecorded; the app does not fabricate history.
- **Bottleneck:** the earliest incomplete stage in the papers → team → grades sequence.

The browser refreshes every three seconds and when the tab becomes active again, so another user's change may take a few seconds to appear.

## Adding, deleting, and restoring

Users choose a level and unused number when adding a lot. Incomplete lots can be soft deleted one at a time or in groups of up to 100, after confirmation. Their state and event history remain in the database. The **Deleted** filter provides a restore action. A deleted number must be restored, rather than registered again.

## Data and security boundaries

The repository contains neither live operational data nor a database password. Each installation needs its own PostgreSQL database. There is no built-in login: anyone who can reach an instance can change its lots. Request limits, input validation, and parameterized SQL queries do not replace authentication where operator accountability matters. Read [SECURITY.md](../SECURITY.md) before exposing an instance to the internet.

## Technology and scope

Next.js 15, React 19, TypeScript, and PostgreSQL. The Next.js API accesses the database; the connection string stays on the server. The schema enables row level security without declaring public policies. The current implementation targets 2026; supporting other years requires code and schema changes. This is not an official OBMEP system.
