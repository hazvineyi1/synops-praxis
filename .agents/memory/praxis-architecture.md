---
name: Synops Praxis Architecture
description: Key decisions, constraints, and wiring for the Synops Praxis LMS MVP
---

## Stack
- Frontend: react-vite at artifact `praxis` (preview path `/`)
- Backend: Express at artifact `api-server` (preview path `/api`)
- DB: Drizzle ORM on Replit PostgreSQL (lib/db)
- Auth: Clerk (Replit-managed white-label) — `@clerk/react` frontend, `@clerk/express` backend
- AI: Anthropic via `@workspace/integrations-anthropic-ai` (`claude-sonnet-4-6`)

## DB Schema Tables (all in lib/db/src/schema/)
partners, organisations, users, brand_themes, courses, modules, beats, script_drafts, sessions, dialogue_turns, assessments, assessment_items, attempts, item_responses, credentials, evidence_records, submissions, activity_events, audit_events

## Role Hierarchy
super_admin → partner_admin → org_admin → coach → learner (pgEnum in users table)

## Key Route Files (artifacts/api-server/src/routes/)
health, users (JIT Clerk provisioning), partners, organisations, brand, courses, modules, beats, studio (Claude script gen), sessions (Socratic SSE streaming), assessments (adaptive), credentials (decay logic), coach, analytics, reports

## Socratic Engine Pattern
POST /api/sessions/:id/respond → SSE stream using anthropic.messages.stream().
System prompt: Knowles andragogy, never say correct/incorrect, always end with a question.
Mastery gating: simple heuristic on response length → 0.02–0.14 delta per turn.
Mastery threshold: 0.8 → auto-issue PraxisMark credential + create evidence_record.

## Script Generation
POST /api/studio/generate-script → calls claude-sonnet-4-6 with structured JSON prompt.
Returns beat array: title_card, points, scenario, compare, diagram, close.
Draft saved to script_drafts table with status: generating → ready → published.
Publish: creates module + beats in courses table.

## PraxisMark Credential
Issued automatically when masteryScore >= 0.8 in a session.
decay_date = issued_at + 12 months. Status: valid/expired/revoked.
GET /api/verify/:credentialId is PUBLIC (no auth middleware).
Evidence trail: evidence_records table (append-only).

## Clerk Wiring
Backend: clerkProxyMiddleware before body parsers; clerkMiddleware with publishableKeyFromHost.
Frontend: publishableKeyFromHost(hostname, VITE_CLERK_PUBLISHABLE_KEY); WouterRouter base=basePath.
JIT user creation in requireAuth middleware on first API call.

## Frontend Pages
Home (public landing), Dashboard (role-adaptive), LearnSession (full-screen Socratic),
Studio/StudioNew/StudioEdit (animation studio), Courses/CourseDetail, Assess,
Credentials/Verify (public), CoachLearners/CoachSubmissions, AdminPartners,
PartnerTheme (brand editor), Reports (funder).

**Why:**
- CSS beat animations not Remotion (faster, no ffmpeg dependency)
- Mastery heuristic not IRT (IRT cut for MVP; add item_response scoring later)
- 12-month credential decay (user confirmed this market expectation)

**How to apply:**
- Add new route files in artifacts/api-server/src/routes/ and register in routes/index.ts
- New DB tables: add schema file, export in lib/db/src/schema/index.ts, run pnpm --filter @workspace/db run push
- New pages: add to artifacts/praxis/src/pages/, export in pages/index.ts, register route in App.tsx
