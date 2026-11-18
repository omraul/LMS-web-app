# Dempo Learn LMS (Dempo Vidya)

## Task 7 — The Takeover Memo

**TO:** The Founder, Dempo Learn LMS  
**FROM:** Incoming Product & Engineering Takeover Team  
**DATE:** 18 November 2026  
**SUBJECT:** Candid Commercial Readiness Assessment & 90-Day Takeover Plan for Dempo Vidya (2,000-Student Autonomous College Deployment)

---

### 1. Executive Verdict: Is This Sellable to a 2,000-Student College Today?

**Not yet as a paid commercial contract — but it is 80% of the way to a winning paid pilot, and far further along than your own `PLAN.md` says it is.**

When we audited the repository (`git log`, `lib/db/src/schema/`, `artifacts/api-server/src/routes/`), we found that the engineering work you listed as unstarted "Stage A blockers" in `PLAN.md` — decoupling from Replit's storage sidecar (`objectStorage.ts`), adding an opt-in Sarvam AI grading toggle (`grading.ts`), wiring MSG91 email fan-out (`email.ts`), migrating to Vercel Mumbai (`vercel.json`, `api/index.mjs`) and Supabase Mumbai (`MIGRATE-SUPABASE.md`), and building weighted gradebooks (`gradebook.ts`), rubrics (`rubrics.ts`), attendance (`attendance.ts`), and Dean/Coordinator oversight (`oversight.ts`) — **is already built and working in code.**

However, if you walk into the Principal's or Governing Body's office at a 2,000-student college tomorrow and ask for a ₹5.5 Lakh annual cheque, **four things will embarrass you during week one of rollout:**

1. **Exam-day fragility on campus WiFi (Fixed in this takeover):** Until our patch in `artifacts/dempo/src/pages/quiz-view.tsx`, quiz answers lived purely in volatile React `useState` with no timer, no `localStorage` auto-save, and no offline detection. A 3-second WiFi drop or accidental pull-to-refresh on a student's phone wiped their entire exam attempt. Worse, clicking "Publish Results" (`quiz-view.tsx` line 137 vs `quizzes.ts` line 482) silently gave every ungraded short-answer response a `0` while telling the professor AI scores were being accepted.
2. **Broken promises between `ARCHITECTURE.md` and the code (Fixed in this takeover):**
   - `ARCHITECTURE.md` (§6, line 142) promised colleges that student names and roll numbers are stripped before text is sent to Sarvam AI. In reality, `grading.ts` sent raw student submissions verbatim (we added `stripStudentPII()` to close this liability).
   - `ARCHITECTURE.md` (§8, line 181) promised per-course email roster gating (`invitesTable`), whereas `POST /api/courses/join` (`courses.ts` line 356) ignores `invitesTable` completely.
   - `legal.tsx` was live in production with literal bracketed placeholders (`[privacy@your-college-domain]`, `[Set your retention periods.]`).
3. **Onboarding 2,000 students by pasting raw email strings (Fixed in this takeover):** An academic office cannot onboard 2,000 students across 6 departments by pasting raw emails without names or roll numbers into a `<Textarea>`. We built `POST /api/admin/invites/csv` (`invites.ts`) and the CSV validation UI (`admin-invites.tsx`) to close this gap.
4. **External VAPT Certificate & Vendor DPAs are still unsigned:** While commit `88f82d9` fixed key internal VAPT bugs, no external CERT-In empanelled auditor has issued a clean certificate, and Clerk (US-hosted identity) requires a counter-signed Data Processing Agreement (DPA).

---

### 2. The Next 90 Days — Staged Execution Plan

#### Days 1–30: Harden the Truth, Run a 1-Department Pilot (Zero New Cloud Spend)
- **Lock the single deployment architecture:** Delete legacy `.replit`, `.replitignore`, `render.yaml`, `DEPLOY.md`, and `replit.md` once the team signs off on `README.md`, keeping **Vercel Mumbai (`bom1`) + Supabase Pro Mumbai (`ap-south-1`)** as the sole architecture.
- **Onboard 1 Department (~250 B.Com / BBA students + 8 faculty) using the new CSV Roster Importer (`/admin/invites`):** Import real student roll numbers, names, and college emails; assign them to cohorts; run two real internal assessments (one assignment with rubric + Jaccard similarity check, one timed quiz with auto-save).
- **Close the DPDP paper trail:** Execute standard Data Processing Agreements with Supabase, Vercel, Clerk, MSG91, and Sarvam AI; publish the completed Privacy Policy (`legal.tsx`) with the college's named Grievance Officer.
- **Wire UptimeRobot + Sentry (`SENTRY_DSN` in `.env`):** Point UptimeRobot at `/api/healthz` (`artifacts/api-server/src/routes/health.ts`) alerting the on-call WhatsApp group.

#### Days 31–60: Prove Exam-Spike Reliability & Indian University Gradebook Fit
- **Server-side quiz draft sync & server-authoritative deadline grace window:** Extend our `localStorage` quiz auto-save in `quiz-view.tsx` with a lightweight `PUT /api/quizzes/:quizId/draft` endpoint and a 60-second network-jitter grace window on `dueDate`.
- **Load-test a 600-concurrent-student exam spike:** Run a k6/Artillery load script against a staging Supabase + Vercel preview environment simulating 600 students loading `/api/quizzes/:id` and submitting `/api/quizzes/:id/attempts` within a 120-second window. Verify Supavisor transaction pooler (`port 6543`) connection limits and adjust Vercel `rateLimit` in `artifacts/api-server/src/app.ts` (line 48, currently capped at `20` submissions per minute per IP — **critical trap if 200 students share one campus NAT IP!**).
- **Fix the Campus NAT IP Rate-Limit Trap (`app.ts` lines 39–54):** Today, `writeLimiter` limits `/api/assignments/:id/submissions` and `/api/quizzes/:id/attempts` to **20 requests per minute per `req.ip`**. In a college computer lab or campus WiFi where 300 students share a single public NAT IPv4 address, the 21st student submitting an exam within the same minute will get `429 Too Many Requests`! Key the rate limiter by authenticated `req.auth.userId ?? req.ip` before finals week.
- **Commission external VAPT audit:** Hand the frozen pilot build to an external security auditor so the certificate arrives before Day 75.

#### Days 61–90: Commercial Contract Sign-Off & Full 2,000-Student Rollout
- **Present the Pilot Evidence Pack to the Principal & Head of Departments:** Show real usage metrics from the 250-student pilot (attendance logs, `.docx`/`.pdf` course plans, plagiarism catches, CSV transcripts, and zero lost exam submissions).
- **Sign the Flat Institutional Annual Licence (₹5,50,000/yr + GST for up to 2,500 students):** Include the tiered Support Model and Exam-Week On-Call SLA from Task 5B.3.
- **Bulk-import the remaining 1,750 students via CSV** prior to the new semester orientation.

---

### 3. What We Refuse To Do (And Why)

Every feature decision must trace back to the four commercial premises a college pays for (**Exam-grade reliability, India data residency/DPDP, Real Indian university gradebook, Institutional ownership**). In the next 90 days, we explicitly ** say NO** to the following five requests:

1. **NO to building in-app fee collection / Razorpay payment gateways:**
   Commit `51765e8` rightly dropped Razorpay from `PLAN.md`, and `pnpm-workspace.yaml` (line 35) still carries a leftover `stripe-replit-sync` exclusion. Indian colleges already have entrenched ERP/bank challan workflows tied to tally/accounting audits. Adding fee collection drags us into PCI-DSS, RBI payment aggregator compliance, and reconciliation support tickets that contribute zero value to teaching or exams.
2. **NO to building a native iOS / Android mobile app (Expo / React Native):**
   `pnpm-workspace.yaml` (lines 58, 146–155) contains leftover `@expo/ngrok-bin` overrides from a template. Building and maintaining two native app store binaries for a single-tenant 2,000-student college doubles engineering maintenance and delays hotfixes during exam week. A responsive 360px mobile web app (PWA-ready) on Vercel CDN updates instantaneously for every student.
3. **NO to hosting raw student video submissions in our S3 bucket by default:**
   As calculated in `ARCHITECTURE.md` (§5), 2,000 students uploading 500MB video assignments generates 2–3 TB/semester in Supabase S3 storage and egress costs, destroying our 79% gross margin. We will **refuse** raw multi-hundred-MB video uploads and enforce unlisted YouTube / Google Drive link submissions for video coursework, reserving S3 storage (`<= 25 MB` cap) for PDFs, docs, slide decks, and spreadsheets.
4. **NO to camera/microphone AI proctoring or browser spyware:**
   Streaming 600 concurrent webcam feeds over flaky Goan campus WiFi during an exam will crash student browsers, trigger false-positive cheating accusations against students on low-end phones, and create a massive biometric privacy liability under India's DPDP Act. Exam integrity is achieved through server-authoritative timers, randomized question pools, local shingle/TF-IDF similarity detection (`similarity.ts`), and in-hall human invigilation.
5. **NO to migrating off Clerk to a custom self-rolled auth system before the first renewal:**
   While Clerk stores identity metadata in the US (`ARCHITECTURE.md` §8), rewriting authentication, Google Workspace SSO, password resets, and session security from scratch before closing the first ₹5.5L contract is classic premature engineering. Under Section 16 of the DPDP Act, disclosing Clerk in `/legal/privacy` with student consent and a signed DPA is 100% lawful today. We will only evaluate India-resident auth migration if a multi-college enterprise tender contractually mandates it in Year 2.
