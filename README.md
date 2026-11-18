# Dempo Vidya (formerly Dempo Learn LMS)

> **Institutional Learning & Examination Management Platform** for **Srinivassa Sinai Dempo College of Commerce & Economics (Autonomous), Goa** (~2,000 students, ~200 faculty/staff).

---

## Quick Navigation — Takeover Brief Deliverables (Tasks 1–7)

All seven deliverables from the **Dempo Learn LMS — Takeover Brief** are documented in full with exact file-path evidence in [**`TAKEOVER-BRIEF-SOLUTIONS.md`**](./TAKEOVER-BRIEF-SOLUTIONS.md):

1. [**Task 1 — Orientation Brief**](./TAKEOVER-BRIEF-SOLUTIONS.md#task-1--orientation-brief) (Chronological analysis of all 6 root `.md` files + product/user/stack/state audit)
2. [**Task 2 — Truth Reconciliation & Root `README.md`**](./TAKEOVER-BRIEF-SOLUTIONS.md#task-2--truth-reconciliation) (14 documented contradictions across docs, configs, and source code — and which source we trust)
3. [**Task 3 — Failure Log (Getting It Running)**](./TAKEOVER-BRIEF-SOLUTIONS.md#task-3--get-it-running-and-log-every-failure) (8-row diagnostic table covering Windows PowerShell execution policy, Node 25 Corepack removal, POSIX `sh`/`export` traps, TypeScript composite references, and Clerk/DB env gates)
4. [**Task 4 — Gap Audit Against Google Classroom**](./TAKEOVER-BRIEF-SOLUTIONS.md#task-4--gap-audit-against-google-classroom) (Scored table across all 8 LMS jobs + 3 commercial arguments for a sceptical Head of Department)
5. [**Task 5 — Closing the Gaps (Product + Business/Legal Tracks)**](./TAKEOVER-BRIEF-SOLUTIONS.md#task-5--close-one-gap)
   - **Product Track:** Bulk CSV Roster Import (`POST /api/admin/invites/csv` + UI in `artifacts/dempo/src/pages/admin-invites.tsx`), Exam Robustness with server-synced timer, `localStorage` auto-save, and WiFi drop recovery (`artifacts/dempo/src/pages/quiz-view.tsx`), AI PII stripping (`artifacts/api-server/src/lib/grading.ts`), and WCAG 2.1 AA contrast compliance (`artifacts/dempo/src/index.css`).
   - **Business & Legal Track:** India DPDP Act 2023 Privacy & Data-Retention Policy, Per-Student vs Flat Institutional Pricing & Margin Model, and Exam-Week Support & On-Call SLA Model.
6. [**Task 6 — Make It Your Own (Institutional Rebrand & Design Rationale)**](./TAKEOVER-BRIEF-SOLUTIONS.md#task-6--make-it-your-own--brand-and-design-rationale) (**Dempo Vidya** design tokens in `artifacts/dempo/src/index.css`, WCAG AA verified palette, `Fraunces` + `Plus Jakarta Sans` typography, calm exam microcopy, and 360px mobile card layouts)
7. [**Task 7 — The Two-Page Takeover Memo to the Founder**](./TAKEOVER-BRIEF-SOLUTIONS.md#task-7--the-takeover-memo) (90-day execution plan, commercial readiness verdict, and explicit feature refusals)

---

## 1. What This Product Is

**Dempo Vidya** (`artifacts/dempo/` + `artifacts/api-server/`) is a single-tenant institutional LMS web application designed for an autonomous Indian college of ~2,000 students. Unlike Google Classroom, it is built around four commercial pillars:

1. **Exam-grade reliability:** Server-graded objective & short-answer quizzes (`artifacts/api-server/src/routes/quizzes.ts`) with client-side real-time answer auto-save, countdown timer, and offline WiFi drop recovery (`artifacts/dempo/src/pages/quiz-view.tsx`).
2. **India data residency & DPDP Act 2023 compliance:** Mumbai (`ap-south-1` / `bom1`) database, object storage, and serverless compute (`MIGRATE-SUPABASE.md`, `vercel.json`), in-app consent banner (`artifacts/dempo/src/components/consent-banner.tsx`), one-click student personal data JSON export (`GET /api/me/export` in `artifacts/api-server/src/routes/privacy.ts`), local word-shingle Jaccard similarity plagiarism detection (`artifacts/api-server/src/lib/similarity.ts`), and PII stripping before optional India-hosted Sarvam AI grading (`artifacts/api-server/src/lib/grading.ts`).
3. **A real Indian university gradebook:** Weighted Internal Semester Assessment (ISA) and Semester End Examination (SEE) categories (`artifacts/api-server/src/routes/gradebook.ts`), multi-criteria rubrics (`artifacts/api-server/src/routes/rubrics.ts`), group assignment per-member grading (`artifacts/api-server/src/routes/memberGrades.ts`), and downloadable CSV transcripts (`artifacts/api-server/src/routes/transcript.ts`).
4. **Institutional ownership & hierarchy:** Supports five distinct roles (`student`, `teacher`, `course_coordinator`, `dean`, `unassigned`) plus `isAdmin` privileges (`lib/db/src/schema/users.ts`, `artifacts/api-server/src/lib/authz.ts`), structured hour-by-hour course session plans exportable to Word (`.docx`) and PDF (`artifacts/api-server/src/routes/planExport.ts`), attendance tracking (`artifacts/api-server/src/routes/attendance.ts`), and early at-risk student alerts (`artifacts/api-server/src/routes/earlyAlerts.ts`).

---

## 2. Who It Is For (Roles & Permissions)

 permissions and access control are enforced server-side in `artifacts/api-server/src/middlewares/auth.ts` and `artifacts/api-server/src/lib/authz.ts`:

| Role (`users.role` / `users.is_admin`) | How Provisioned | Permissions & Capabilities | Evidence (File Path) |
|---|---|---|---|
| **Student** (`role = "student"`) | Pre-invited via `app_invites` table (`POST /api/admin/invites/csv` or `/bulk`) | Join courses via invite code, view unlocked session plans & materials, submit multi-format assignments (text/files/links/audio/video), take timed quizzes with auto-save, track personal study tasks/notes (`My Plan`), export personal transcript CSV & DPDP data JSON. | `artifacts/api-server/src/middlewares/auth.ts`, `artifacts/api-server/src/routes/studentPlan.ts` |
| **Professor / Teacher** (`role = "teacher"`) | Pre-invited as `teacher` in `app_invites` / `teacher_invites` or listed in `ADMIN_EMAILS` | Create/manage courses, build hour-by-hour session plans (`.docx`/`.pdf` export), take attendance, configure weighted gradebook categories & rubrics, review AI-drafted grades + Jaccard similarity flags, post announcements, trigger early alerts. | `artifacts/api-server/src/routes/courses.ts`, `artifacts/api-server/src/routes/gradebook.ts` |
| **Course Coordinator** (`role = "course_coordinator"`) | Assigned by Admin via `PATCH /api/admin/users/:id` + `PUT /api/admin/users/:id/coordinator-courses` | Scoped read-only oversight (syllabus progress, gradebook, attendance, analytics) across specifically assigned courses in `coordinator_course_assignments`. Cannot join courses as a student. | `artifacts/api-server/src/lib/authz.ts` (`isAssignedCoordinator`), `artifacts/dempo/src/pages/coordinator.tsx` |
| **Dean** (`role = "dean"`) | Assigned by Admin via `PATCH /api/admin/users/:id` | Global read-only academic oversight across **all** active courses, faculty progress, institution-wide analytics, and student feedback. | `artifacts/api-server/src/lib/authz.ts` (`canViewCourse`), `artifacts/dempo/src/pages/oversight.tsx` |
| **Administrator** (`is_admin = true`) | Auto-provisioned if verified email is in `ADMIN_EMAILS`, or granted via `PATCH /api/admin/users/:id` | Full access to `/admin/invites` (CSV bulk roster import), `/admin/users` (role promotions, teacher revocation with automatic course deactivation, account deletion), and `/admin/logs` (audit trail). | `artifacts/api-server/src/routes/admin.ts`, `artifacts/api-server/src/routes/invites.ts` |

---

## 3. Tech Stack & Monorepo Structure

Managed via `pnpm` workspaces (`pnpm-workspace.yaml`):

| Layer | Technology | Source Location |
|---|---|---|
| **Frontend SPA** | React 19.1, Vite 7.3, Tailwind CSS v4 (`@tailwindcss/vite`), wouter, TanStack Query v5, shadcn/ui (Radix), Recharts | `artifacts/dempo/` |
| **Standalone Interactive Web App** | Zero-config self-contained LMS web app (all 5 roles, live exam WiFi drop simulator, CSV importer, gradebook, AI grader) | `standalone-lms/index.html` & `scripts/serve-standalone.mjs` |
| **Backend API** | Node.js (22/24+), Express 5.2, TypeScript 5.9, Helmet, `express-rate-limit`, Pino structured logging | `artifacts/api-server/` & `api/index.mjs` |
| **Database & ORM** | PostgreSQL 16/17 + Drizzle ORM (`drizzle-orm/node-postgres`, 21 schema files) | `lib/db/src/schema/` |
| **API Contract & Validation** | OpenAPI 3 (`openapi.yaml`) + Orval codegen + Zod (`^3.25.76`) | `lib/api-spec/`, `lib/api-zod/`, `lib/api-client-react/` |
| **Authentication** | Clerk (`@clerk/react`, `@clerk/express`) cookie-based sessions with `/api/__clerk` proxy | `artifacts/dempo/src/lib/auth.tsx`, `artifacts/api-server/src/middlewares/auth.ts` |
| **Object Storage** | S3-compatible presigned URLs (`@aws-sdk/client-s3` + Uppy) with per-object ACL metadata | `artifacts/api-server/src/lib/objectStorage.ts`, `lib/object-storage-web/` |
| **AI & Plagiarism** | Sarvam AI (`sarvam-105b`, OpenAI-compatible SDK, opt-in toggle + PII stripping) + local 3-word shingle Jaccard similarity | `artifacts/api-server/src/lib/grading.ts`, `artifacts/api-server/src/lib/similarity.ts` |
| **Notifications** | In-app bell + MSG91 transactional email fan-out | `artifacts/api-server/src/lib/notifications.ts`, `artifacts/api-server/src/lib/email.ts` |

---

## 4. How to Run Locally

### Option A — Instant Standalone Mode (Zero External Keys Required)

To inspect and interact with the complete **Dempo Vidya LMS Web App** immediately (without needing paid Clerk keys or a live cloud PostgreSQL instance):

```powershell
node scripts/serve-standalone.mjs
```

Then open **`http://localhost:4173`** in your browser (or open `standalone-lms/index.html` directly). You can switch live between **Student, Professor, Course Coordinator, Dean, and Admin**, test the **Bulk CSV Roster Importer**, run the **Timed Exam with WiFi Drop Simulation**, inspect the **AI Grading Queue**, and export **Indian University Transcripts**.

### Option B — Full-Stack Monorepo Mode (Express API + Vite SPA + PostgreSQL + Clerk)

1. **Prerequisites:**
   - Node.js 22+ or 24+ (if using Node 25+, invoke `npx pnpm` since Node 25 removed bundled Corepack).
   - PostgreSQL 16+ database (local or Supabase Mumbai `ap-south-1`) and a Clerk application (`pk_test_...` / `sk_test_...`).
2. **Create your `.env` file at the repository root** (never commit `.env`):
   ```powershell
   Copy-Item artifacts/api-server/.env.example .env
   ```
   Fill in `DATABASE_URL`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` (must match `CLERK_PUBLISHABLE_KEY`), and `ADMIN_EMAILS` (your sign-in email so you are auto-provisioned as Teacher + Admin).
3. **Install dependencies, build composite libraries, push DB schema, and start:**
   ```powershell
   npx pnpm install
   npx pnpm run typecheck
   npx pnpm --filter @workspace/db run push
   ```
4. **Run the API server (port 8080) and Vite web app (port 5173):**
   ```powershell
   # Terminal 1 — API Server
   npx pnpm --filter @workspace/api-server run dev

   # Terminal 2 — Web App
   npx pnpm --filter @workspace/dempo run dev
   ```
   Or on Windows PowerShell with `.env` configured:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\dev.ps1
   ```

---

## 5. Where It Deploys

The repository contains four historical deployment eras; **the active production target is Vercel + Supabase (Mumbai)**:

- **Frontend CDN & Serverless API:** **Vercel** (`vercel.json` + `api/index.mjs`), pinned to **Mumbai (`bom1`)**. `vercel.json` builds `@workspace/dempo` into root `public/` and bundles `@workspace/api-server` into `artifacts/api-server/dist/app.mjs`, which `api/index.mjs` re-exports as native ESM.
- **Database & Object Storage:** **Supabase Pro (Mumbai `ap-south-1`)** (`MIGRATE-SUPABASE.md`). Runtime uses the Supavisor transaction pooler (port `6543`); schema migrations use the session pooler (port `5432`); file uploads use Supabase S3 (`STORAGE_FORCE_PATH_STYLE=true`).
- **Legacy Configs Present in Repo:** `render.yaml` (`DEPLOY.md` — Render Singapore free demo) and `.replit` (`replit.md` — original Replit workspace).

---

## 6. Known Broken Things & Traps Fixed in This Fork

| # | Issue / Trap | Location | Status in This Repo |
|---|---|---|---|
| 1 | `package.json` `preinstall` used POSIX `sh -c`, failing on Windows unless Git Bash `bin` was manually added to `PATH`. | `package.json` (line 6) | **Fixed** (replaced with cross-platform `node -e` guard) |
| 2 | `artifacts/api-server/package.json` `dev` script used Unix `export NODE_ENV=development`, failing on Windows `cmd.exe`. | `artifacts/api-server/package.json` (line 7) | **Fixed** (cross-platform Node script) |
| 3 | `QuizViewPage` confirmation modal falsely told teachers that AI-suggested short-answer scores are auto-accepted on publish, whereas `quizzes.ts` (line 482) sets ungraded short answers to `0`. | `artifacts/dempo/src/pages/quiz-view.tsx` (line 137) vs `artifacts/api-server/src/routes/quizzes.ts` (line 482) | **Fixed** (modal copy aligned with VAPT security behavior) |
| 4 | Student quiz form held answers only in React memory with no timer, no `localStorage` auto-save, and no offline/WiFi drop recovery. | `artifacts/dempo/src/pages/quiz-view.tsx` (lines 412–511) | **Fixed** (auto-save, countdown timer, and offline reconnect banner added) |
| 5 | `ARCHITECTURE.md` (§6) claimed student PII is stripped before sending text to Sarvam AI, but `grading.ts` sent raw student text verbatim. | `artifacts/api-server/src/lib/grading.ts` | **Fixed** (`stripStudentPII` added before AI prompt construction) |
| 6 | Admin invites only supported pasting raw email strings with no structured CSV upload, name column, roll number, or malformed-row reporting. | `artifacts/api-server/src/routes/invites.ts` & `artifacts/dempo/src/pages/admin-invites.tsx` | **Fixed** (`POST /api/admin/invites/csv` + full CSV validation UI added) |
| 7 | Per-course email roster table (`invitesTable`, `POST /api/courses/:id/invite`) is still writable in the UI/API, but `POST /api/courses/join` (`courses.ts` line 356) ignores `invitesTable` and lets any platform-invited student join any course if they have its 6-character code. | `artifacts/api-server/src/routes/courses.ts` (lines 356–359 vs 444–493) | **Documented in Truth Reconciliation** |
| 8 | OpenAPI spec (`lib/api-spec/openapi.yaml`) is out of sync with ~15 newer routes (`gradebook.ts`, `invites.ts`, `privacy.ts`, `planExport.ts`, inline routes in `courses.ts`) that bypass Orval codegen. | `lib/api-spec/openapi.yaml` vs `artifacts/api-server/src/routes/` | **Documented in Truth Reconciliation** |
