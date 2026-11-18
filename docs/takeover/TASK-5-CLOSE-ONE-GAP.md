# Dempo Learn LMS (Dempo Vidya)

## Task 5 — Close One Gap (Both Product Track & Business/Legal Track Completed)

To make this repository a complete reference solution, we closed the gaps across **both** the **Product Track** (with working code in the repo) and the **Business & Legal Track**.

---

### Track A — Product Track (Spec + Working Implementation)

#### 5A.1 Bulk Roster Import Specification (2,000 Students from CSV)

- **Endpoint:** `POST /api/admin/invites/csv` (`artifacts/api-server/src/routes/invites.ts`, lines 253–409)
- **UI:** `artifacts/dempo/src/pages/admin-invites.tsx` (lines 70–345) and `standalone-lms/index.html`
- **CSV Schema & Columns:**
  | Column Name | Required? | Validation Rule | Default / Normalization |
  |---|---|---|---|
  | `roll_no` (or `student_id`) | Optional | Printable string, `<= 60` chars (e.g. `26BCOM001`) | Trimmed; appended to display name `Name (RollNo)` for searchability |
  | `name` | **Required** | Non-empty string, `1..120` chars | Trimmed |
  | `email` | **Required** | Valid RFC email syntax (`/^[^@\s]+@[^@\s]+\.[^@\s]+$/`) | Trimmed and lowercased |
  | `role` | Optional | Enum: `"student"` \| `"teacher"` (case-insensitive) | Defaults to `"student"` |
  | `cohort_ids` | Optional | Positive integer IDs (merged with UI-selected target cohorts) | Defaults to `defaultCohortIds` selected by Admin |
- **Batch Limit:** Up to `2,500` rows per upload (comfortably covers a 2,000-student college in a single file).
- **Duplicate Handling:**
  1. **Intra-CSV duplicates** (same email appears on row 12 and row 480): First occurrence (row 12) is processed; row 480 is skipped and recorded in `duplicates: [{ rowNumber: 480, email, firstSeenRow: 12 }]`.
  2. **Database duplicates** (email already exists in `app_invites`): Controlled by `onDuplicate: "update" | "skip"`.
     - `"update"` (default, idempotent): Updates `name`, `role`, and merges `cohortIds` while preserving `acceptedAt` and existing token.
     - `"skip"`: Leaves existing row untouched and increments `skipped`.
- **Malformed Row Handling & Transaction Semantics:**
  - Controlled by `mode: "partial" | "atomic"`:
    - `"partial"` (default): Commits all valid rows, rejects malformed rows (missing name, invalid email, bad role), and returns `malformed: [{ rowNumber, rawEmail, reason }]` so the admin only needs to fix the broken rows.
    - `"atomic"` (all-or-nothing): If `malformed.length > 0`, returns `HTTP 422 Unprocessable Entity` with the full `malformed[]` list without writing any rows to PostgreSQL.
- **What the Admin Sees Afterwards:**
  - Live pre-commit validation badge counts (`Total Rows`, `Valid`, `Intra-CSV Duplicates`, `Malformed Rows`) + scrollable row-by-row preview with exact row numbers and failure reasons + post-commit Audit Summary card.

#### 5A.2 Exam Robustness (Auto-Save, Countdown Timer, WiFi Drop Reconnect)

- **Implementation:** `artifacts/dempo/src/pages/quiz-view.tsx` (lines 412–530) and `standalone-lms/index.html`
- **How It Works:**
  1. **Zero-Latency Local Auto-Save:** Every multiple-choice click or short-answer keystroke serializes the answer map to `window.localStorage` under `dempo-vidya-quiz-draft-${quiz.id}` and updates the sticky header badge (`Auto-saved at HH:MM:SS AM/PM`). Refreshing the tab or crashing the browser restores every answer automatically.
  2. **Countdown Timer:** Computes remaining seconds from `quiz.dueDate` (or defaults to a 45-minute controlled exam window), displaying a sticky monospace countdown badge that shifts to high-contrast crimson (`bg-danger/10 text-danger`) under 5 minutes remaining.
  3. **WiFi Drop Detection & Calm Reconnect:** Listens to `window.addEventListener("offline")` and `"online"`. When campus WiFi drops, a calm `aria-live="polite"` banner appears explaining that answers are still being saved to the device, and submission is safely gated until connectivity returns.

---

### Track B — Business & Legal Track (No-Coding Deliverables)

#### 5B.1 Privacy Policy & Data-Retention Position Under India's DPDP Act, 2023

*(Also wired directly into the live app at `artifacts/dempo/src/pages/legal.tsx`!)*

- **Roles under the DPDP Act, 2023:**
  - **Data Fiduciary:** Srinivassa Sinai Dempo College of Commerce & Economics (Autonomous), Cujira, Bambolim, Goa.
  - **Data Principals:** Enrolled students (~2,000) and faculty/staff (~200).
  - **Data Processors (under signed DPAs):**
    1. **Supabase Inc. (Mumbai `ap-south-1`):** Primary PostgreSQL database and S3 object storage (🇮🇳 India-resident).
    2. **Vercel Inc. (Mumbai `bom1`):** Serverless API execution and static CDN (🇮🇳 India-resident compute).
    3. **MSG91 / Walkover Web Solutions Pvt. Ltd. (Indore, India):** Transactional email/SMS/WhatsApp delivery (🇮🇳 India-resident).
    4. **Sarvam AI (Bengaluru, India):** Opt-in AI grading assistant, receiving only PII-stripped submission text (`stripStudentPII` in `artifacts/api-server/src/lib/grading.ts`) (🇮🇳 India-resident).
    5. **Clerk Inc. (United States):** Authentication & session management only (stores name, email, avatar). Disclosed explicitly under Section 16 (Cross-Border Data Transfer) of the DPDP Act; permitted as the US is not on a restricted blacklist under Central Government notification, backed by a signed DPA.
- **Lawful Basis & Consent Architecture (Sections 6 & 7, DPDP Act):**
  - Itemized notice is presented at first sign-in via `artifacts/dempo/src/components/consent-banner.tsx` and `/legal/privacy`.
  - Students can exercise their **Right to Access (Section 11)** instantaneously via `GET /api/me/export` (`artifacts/api-server/src/routes/privacy.ts`), which downloads all 11 personal data tables as `dempo-learn-my-data.json`.
  - Students can exercise their **Right to Correction & Erasure (Section 12)** and **Grievance Redressal (Section 13)** through the college's designated Data Protection & Grievance Officer (`dpo.grievance@dempocollege.edu.in`, 24-hour acknowledgement SLA, 7-working-day resolution SLA), executed by Admin via `DELETE /api/admin/users/:id` (`artifacts/api-server/src/routes/admin.ts`, lines 546–603).
- **Data Retention & Deletion Schedule (Section 8(7), DPDP Act):**
  | Data Category | Active Retention Period | Post-Retention Action | Legal / Academic Justification |
  |---|---|---|---|
  | **Student Profile, Coursework Scores & Gradebooks** | **3 Academic Years** after graduation/withdrawal | Exported to cold institutional archive; purged from live LMS | Goa University & NAAC 5-year cycle audit verification window |
  | **Large Media Submissions (Video/Audio/Files in S3)** | **1 Academic Year** after semester marksheet finalization | Deleted from Supabase S3 bucket (`attachmentCleanup.ts`) | Prevents unbounded S3 storage/egress bloat (`ARCHITECTURE.md` §5) while covering grade-appeal window |
  | **Personal Study Notes, Tasks & Reflective Journals** | Until account graduation + **90 days grace period** | Student notified to export via `/api/me/export`, then permanently deleted | Personal productivity data; no statutory need to retain post-enrollment |
  | **Security & Activity Audit Logs (`activity_logs`)** | **365 Days** | Rotated and purged | CERT-In Directions (2022) require 180–365 day log retention in India |

---

#### 5B.2 Pricing Model & Margin Check (2,000-Student College)

##### Infrastructure & Operating Cost Baseline (2,000 Students + 200 Staff)

Based on `ARCHITECTURE.md` (§12) and `MIGRATE-SUPABASE.md` (Vercel Pro + Supabase Pro Mumbai + Clerk + MSG91 + Sarvam AI):

| Cost Component | Monthly Cost (INR) | Annual Cost (INR) | Notes |
|---|---:|---:|---|
| **Supabase Pro (Mumbai `ap-south-1` — DB + 100GB S3 Storage)** | ₹2,200 | ₹26,400 | $25/mo base + modest storage overage (video links preferred per §5) |
| **Vercel Pro (Mumbai `bom1` Serverless API + CDN)** | ₹1,750 | ₹21,000 | $20/mo seat; handles exam bursts automatically |
| **Clerk Auth (Pro Tier + Google Workspace SSO)** | ₹2,200 | ₹26,400 | $25/mo base (first 10,000 MAUs free; SSO connection add-on if SAML used) |
| **MSG91 (Transactional Email + Exam Alerts)** | ₹2,000 | ₹24,000 | ~60,000 emails/semester + critical exam SMS |
| **Sarvam AI (`sarvam-105b` — ~60,000 grades/yr)** | ₹800 | ₹9,600 | ~₹0.15/grade average with rubric prompt |
| **Sentry + UptimeRobot Monitoring + Domain (`dempo.in`)** | ₹550 | ₹6,600 | Free tiers + domain renewal |
| **Direct Cloud COGS Total** | **₹9,500 / mo** | **₹1,14,000 / yr** | **₹57 per student per year in cloud infrastructure COGS** |
| **Amortized Annual Compliance & Support Overhead** | ₹10,500 / mo | ₹1,26,000 / yr | Annual VAPT pen-test refresh (₹75k) + exam-week on-call engineering (₹51k) |
| **Fully Loaded Annual Delivery Cost** | **₹20,000 / mo** | **₹2,40,000 / yr** | **₹120 per student per year fully loaded** |

##### Option 1 vs. Option 2 Commercial Pricing Comparison (Excluding 18% GST)

| Pricing Model | Structure | Annual Revenue (2,000 Students) | Gross Margin (vs. ₹1.14L Cloud COGS) | Net Contribution (vs. ₹2.40L Fully Loaded) | Procurement Pros & Cons |
|---|---|---:|---:|---:|---|
| **Model A — Per-Student-Per-Year** | **₹300 / student / year**<br>*(₹25 / student / month)*<br>Faculty & staff accounts free | **₹6,00,000 / yr** | **81.0%**<br>*(₹4,86,000)* | **60.0%**<br>*(₹3,60,000)* | **Pros:** Scales automatically if college grows to 3,500 students; easy to compare against textbook/lab fees (₹25/mo is less than one cup of chai).<br>**Cons:** Principals dislike variable invoices when students drop/transfer mid-semester. |
| **Model B — Flat Institutional Licence (Recommended)** | **₹5,50,000 / year flat**<br>Includes up to **2,500 active students** + unlimited faculty/deans + 200 GB India storage<br>*(Overage: ₹200/student/yr above 2,500; ₹25/GB/mo extra storage)* | **₹5,50,000 / yr** | **79.3%**<br>*(₹4,36,000)* | **56.4%**<br>*(₹3,10,000)* | **Pros:** Indian autonomous colleges budget annually via fixed Governing Body / UGC grants. One predictable PO per academic year eliminates monthly headcount disputes while capping our storage risk. |

---

#### 5B.3 Support Model & Exam-Week On-Call Commitment

| Support Tier | Contact Channel | Hours of Coverage (IST) | Response-Time SLA | Resolution / Workaround SLA | Who Is Awake & Accountable |
|---|---|---|---|---|---|
| **P0 — Live Exam Blocker**<br>*(API 5xx, quiz submission failing, login outage during scheduled ISA/SEE window)* | **Dedicated Exam Hotline (Phone + WhatsApp Bridge)** + Automated UptimeRobot Pager | **Exam Weeks (4 weeks/semester): 07:00 – 21:00 IST (Mon–Sun)**<br>*Pre-warmed 30 mins before first paper* | **<= 5 minutes** | **<= 15 minutes** (or immediate deadline extension + offline localStorage export fallback) | **Primary On-Call Engineer** (holds Vercel/Supabase/Clerk admin access) + **College Exam Cell Liaison** |
| **P1 — High-Impact Academic Issue**<br>*(Gradebook calculation bug, CSV roster import error, S3 upload failure)* | Email (`support@dempovidya.in`) + In-App Admin Priority Ticket | **08:30 – 18:30 IST (Mon–Sat)** | **<= 2 hours** | **<= 8 business hours** | **Product Support Lead** + Escalation to Backend Engineer |
| **P2 — Standard Faculty / Student Query**<br>*(Invite resend, cohort reassignment, password/SSO help, rubric setup)* | Campus Helpdesk Portal + Email (`help@dempocollege.edu.in`) | **09:00 – 17:30 IST (Mon–Fri)** | **<= 1 business day** | **<= 2 business days** | **Tier-1 Campus IT Coordinator** (trained on `/admin/invites` & `/admin/users`) |

---
