# Dempo Learn LMS (Dempo Vidya)

## Task 1 — Orientation Brief

### Chronological Reading Order of Root `.md` Files (Oldest to Newest Last Commit)

Per `git log -1 --format="%ci | %h | %s" -- *.md`, the six root Markdown documents were last modified in this exact chronological sequence:

1. **`replit.md`** — `2026-07-20 21:28:32 +0530` (commit `662c4c0`, *"Unpack source from zip into repo root"*)
2. **`ARCHITECTURE.md`** — `2026-07-21 15:09:03 +0530` (commit `fa069f2`, *"Add architecture and build-plan documents"*)
3. **`DEPLOY.md`** — `2026-07-22 21:10:21 +0530` (commit `6e10196`, *"Wire object storage env for Cloudflare R2 deploy"*)
4. **`PLAN.md`** — `2026-07-23 20:11:39 +0530` (commit `51765e8`, *"Docs: drop Razorpay/payments — teaching-only tool, no in-app payments"*)
5. **`DEPLOY-VERCEL.md`** — `2026-07-24 10:01:05 +0530` (commit `983dea6`, *"Vercel: output SPA to root public/ so the deploy finds it reliably"*)
6. **`MIGRATE-SUPABASE.md`** — `2026-07-24 19:00:33 +0530` (commit `db21faa`, *"Add Neon -> Supabase (Mumbai) migration runbook"*)

---

### 1. What Does This Product Do?

**Dempo Vidya (Dempo Learn)** is an invite-only academic Learning Management System (LMS) built for an autonomous Indian college of ~2,000 students (`ARCHITECTURE.md`, lines 4, 11; `artifacts/dempo/src/pages/legal.tsx`, lines 6–8). Based on the actual route modules mounted in `artifacts/api-server/src/routes/index.ts` (lines 1–76) and database tables in `lib/db/src/schema/index.ts`, the platform performs eight core functions:

1. **Invite-Gated Onboarding & Cohort Management:** Administrators allow-list faculty and student emails (`lib/db/src/schema/appInvites.ts`, `artifacts/api-server/src/routes/invites.ts`) and organize students into cohorts (`lib/db/src/schema/cohorts.ts`, `artifacts/api-server/src/routes/cohorts.ts`) and course groups (`lib/db/src/schema/groups.ts`, `artifacts/api-server/src/routes/groups.ts`).
2. **Course Delivery & Session-Level Syllabus Planning:** Professors create courses (`artifacts/api-server/src/routes/courses.ts`), upload/link study materials with read-receipt tracking (`artifacts/api-server/src/routes/materials.ts`, `lib/db/src/schema/courses.ts`), schedule class sessions (`artifacts/api-server/src/routes/sessions.ts`), and author hour-by-hour course plans with pre-work, case studies, and post-work that can be locked by day (`artifacts/api-server/src/routes/plan.ts`) and exported as `.docx` or `.pdf` (`artifacts/api-server/src/routes/planExport.ts`).
3. **Mixed-Media Assignments & Group Submissions:** Professors create individual or group-targeted assignments (`lib/db/src/schema/assignments.ts`, `artifacts/api-server/src/routes/assignments.ts`) accepting text, presigned S3 file uploads (`artifacts/api-server/src/lib/objectStorage.ts`), external links, audio, and video, with per-member grading overrides (`artifacts/api-server/src/routes/memberGrades.ts`).
4. **Quizzes & Timed Assessments:** Professors publish multiple-choice and short-answer quizzes (`lib/db/src/schema/quizzes.ts`, `artifacts/api-server/src/routes/quizzes.ts`); students take them in `artifacts/dempo/src/pages/quiz-view.tsx` with auto-scored MCQs and optional AI-assisted short-answer draft scores.
5. **AI-Assisted Grading & Local Plagiarism Detection:** Text submissions and short answers can be pre-scored by an OpenAI-compatible Sarvam AI model (`sarvam-105b`) when `AI_GRADING_ENABLED=true` (`artifacts/api-server/src/lib/grading.ts`, lines 14–21), while lexical plagiarism is computed locally on the server using 3-word shingle Jaccard similarity (`artifacts/api-server/src/lib/grading.ts`, lines 172–213) and TF-IDF cosine similarity across courses (`artifacts/api-server/src/lib/similarity.ts`).
6. **Weighted Gradebook, Rubrics & Transcripts:** Professors attach multi-criteria rubrics (`lib/db/src/schema/rubrics.ts`, `artifacts/api-server/src/routes/rubrics.ts`), define weighted assessment categories (`lib/db/src/schema/gradebook.ts`, `artifacts/api-server/src/routes/gradebook.ts`), and export course or student-level CSV transcripts (`artifacts/api-server/src/routes/transcript.ts`).
7. **Attendance, Early Alerts & Student Productivity:** Professors record session attendance (`artifacts/api-server/src/routes/attendance.ts`) and flag at-risk students via Early Alerts (`lib/db/src/schema/earlyAlerts.ts`, `artifacts/api-server/src/routes/earlyAlerts.ts`); students manage personal tasks, study focus feeds, course notes (`lib/db/src/schema/studentPlan.ts`, `artifacts/api-server/src/routes/studentPlan.ts`, `artifacts/api-server/src/routes/studentNotes.ts`), and reflective journals (`lib/db/src/schema/journal.ts`, `artifacts/api-server/src/routes/journal.ts`).
8. **Communication & DPDP Compliance:** Supports course announcements (`artifacts/api-server/src/routes/announcements.ts`), threaded discussions (`artifacts/api-server/src/routes/discussions.ts`), direct messages (`artifacts/api-server/src/routes/messaging.ts`), in-app + MSG91 email notifications (`artifacts/api-server/src/lib/notifications.ts`, `artifacts/api-server/src/lib/email.ts`), and DPDP Act right-to-access JSON data exports (`GET /api/me/export` in `artifacts/api-server/src/routes/privacy.ts`).

---

### 2. Who Are Its Users?

Although `replit.md` (line 34) and `ARCHITECTURE.md` (line 180) claim there are only three roles (`teacher | student | unassigned`), inspecting `artifacts/api-server/src/lib/authz.ts` (lines 75–80, 228–256), `artifacts/api-server/src/middlewares/auth.ts` (lines 7–19, 96–135), and `artifacts/dempo/src/components/layout.tsx` (lines 69–119) proves there are **five user roles plus an orthogonal `isAdmin` privilege flag**:

1. **Students (`role = "student"`):** Pre-invited via `appInvitesTable` (`lib/db/src/schema/appInvites.ts`). Take courses, submit assignments/quizzes, write notes/journals, and download transcripts (`artifacts/dempo/src/pages/dashboard.tsx`).
2. **Professors / Teachers (`role = "teacher"`):** Pre-invited via `appInvitesTable` or `teacherInvitesTable` (`lib/db/src/schema/users.ts`, lines 24–32). Own courses, author session plans, grade submissions, and manage cohorts (`artifacts/api-server/src/routes/courses.ts`).
3. **Course Coordinators (`role = "course_coordinator"`):** Assigned specific courses via `coordinatorCourseAssignmentsTable` (`lib/db/src/schema/coordinatorAssignments.ts`, `artifacts/api-server/src/routes/admin.ts`, lines 277–350). Hold scoped read-only oversight over their assigned courses (`artifacts/api-server/src/lib/authz.ts`, lines 228–243; `artifacts/dempo/src/pages/coordinator.tsx`).
4. **Deans (`role = "dean"`):** Hold global read-only oversight across every course, gradebook, and faculty analytics view in the institution (`artifacts/api-server/src/lib/authz.ts`, line 253; `artifacts/dempo/src/pages/oversight.tsx`).
5. **Unassigned (`role = "unassigned"`):** Transitional default in `lib/db/src/schema/users.ts` (line 8), though `requireAuth` (`artifacts/api-server/src/middlewares/auth.ts`, lines 105–123) now assigns `student` or `teacher` immediately from `appInvitesTable` and rejects uninvited users with `403 { error: "not_invited" }`.
6. **Administrators (`isAdmin = true` on `usersTable`):** Seeded via the `ADMIN_EMAILS` environment variable (`artifacts/api-server/src/middlewares/auth.ts`, lines 10–19) or granted via `PATCH /api/admin/users/:id` (`artifacts/api-server/src/routes/admin.ts`, lines 426–538). Manage platform invites, users, coordinator mappings, and activity logs (`artifacts/dempo/src/pages/admin-users.tsx`, `admin-invites.tsx`, `admin-logs.tsx`).

---

### 3. What Is It Built With?

- **Monorepo & Package Manager:** `pnpm` workspaces (`pnpm-workspace.yaml`, lines 37–41) with supply-chain defense `minimumReleaseAge: 1440` (`pnpm-workspace.yaml`, line 28), TypeScript `~5.9.3` (`package.json`, line 25), and Node.js 22/24 (`.node-version` specifies `24`; `.github/workflows/ci.yml` line 49 runs Node `22`).
- **Frontend (`artifacts/dempo/package.json`):** React `19.1.0`, Vite `^7.3.2`, Tailwind CSS v4 (`@tailwindcss/vite: ^4.1.14`), `wouter: ^3.3.5` for routing, `@tanstack/react-query: ^5.90.21`, Radix UI / `shadcn/ui` primitives (`artifacts/dempo/src/components/ui/`), `recharts` for analytics, `@uppy/*` for S3 uploads, `lucide-react` icons, and `@vercel/analytics`.
- **Backend (`artifacts/api-server/package.json`):** Express `^5.2.1`, `helmet: ^8.3.0`, `express-rate-limit: ^8.6.0`, `pino` + `pino-http` logging, `docx: ^9.7.1` and `pdf-lib: ^1.17.1` for syllabus export, bundled with `esbuild: 0.27.3` (`artifacts/api-server/build.mjs`).
- **Database (`lib/db/package.json`):** PostgreSQL via `pg` (`Pool` in `lib/db/src/index.ts`) and `drizzle-orm: ^0.45.2` + `drizzle-kit` (`lib/db/drizzle.config.ts`).
- **API Codegen & Validation (`lib/api-spec/package.json`):** OpenAPI 3 specification (`lib/api-spec/openapi.yaml`) compiled by `orval` (`lib/api-spec/orval.config.ts`) into React Query hooks (`lib/api-client-react/`) and Zod schemas (`lib/api-zod/`, using `zod: ^3.25.76` in `pnpm-workspace.yaml`, line 67).
- **External Services:** Clerk Auth (`@clerk/react: ^6.12.5`, `@clerk/express: ^2.1.43`), AWS S3 SDK (`@aws-sdk/client-s3: ^3.700.0` in `artifacts/api-server/src/lib/objectStorage.ts`) pointed at Supabase S3 Mumbai (`MIGRATE-SUPABASE.md`, lines 125–134), OpenAI SDK (`lib/integrations-openai-ai-server/src/client.ts`) pointed at Sarvam AI (`artifacts/api-server/.env.example`, lines 27–30), and MSG91 REST API v5 (`artifacts/api-server/src/lib/email.ts`, lines 10–12).

---

### 4. What State Is It In?

1. **Far more built than `PLAN.md` or `replit.md` claim:** Over the last 30 commits (`git log --oneline`), the previous developer already decoupled the app from Replit (`artifacts/api-server/src/lib/objectStorage.ts`, `lib/integrations-openai-ai-server/src/client.ts`), added MSG91 email delivery (`artifacts/api-server/src/lib/email.ts`), built a student planner/notes layer (`lib/db/src/schema/studentPlan.ts`), added `.docx`/`.pdf` course plan exports (`artifacts/api-server/src/routes/planExport.ts`), hardened security after a VAPT audit (`artifacts/api-server/src/app.ts`, commit `88f82d9`), and migrated deployment to Vercel (`vercel.json`, `api/index.mjs`) + Supabase Mumbai (`MIGRATE-SUPABASE.md`).
2. **Documentation is severely fractured:** Four different root `.md` files describe four incompatible hosting/database/storage architectures (`replit.md` vs `ARCHITECTURE.md` vs `DEPLOY.md` vs `DEPLOY-VERCEL.md` + `MIGRATE-SUPABASE.md`), and there was no `README.md` at the root.
3. **Several half-finished or broken seams remain:**
   - Windows local setup breaks on POSIX commands in `package.json` (line 6) and `artifacts/api-server/package.json` (line 7), and `dev.ps1` (line 49) fails on Node 25 where `corepack` was removed.
   - Course email roster gating (`invitesTable` in `lib/db/src/schema/courses.ts`) was silently bypassed in `POST /api/courses/join` (`artifacts/api-server/src/routes/courses.ts`, lines 356–359), leaving `POST /api/courses/:courseId/invite` writing to an unenforced table.
   - Newer routes (`gradebook.ts`, `invites.ts`, `privacy.ts`, `planExport.ts`, and inline endpoints in `courses.ts` lines 127–330) bypassed `lib/api-spec/openapi.yaml` ("to avoid a regen").
   - Student quizzes (`artifacts/dempo/src/pages/quiz-view.tsx`) had no timer, no auto-save, and no WiFi-drop resilience, and `grading.ts` lacked the PII stripping promised in `ARCHITECTURE.md` (line 142).

---
