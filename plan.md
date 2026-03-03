# RSN Master Plan

Project: RSN Pod Engine (Phase 1 first, then scale)
Primary Stack Decision: PERN (PostgreSQL, Express.js, React, Node.js) + LiveKit

---

## 1) Product Direction and Architecture Principle

RSN is built as a Pod-first connection operating system.
Raw Speed Networking is the first Pod type, not the entire platform.

### Core principle
- Build engine first, event preset second.
- Protect intentional connection quality (signal over noise).
- Store long-term interaction memory (encounter history).
- Keep matching and orchestration as independent services.

### Why PERN over MERN
- Requirements are heavily relational (many linked entities, constraints, histories, reports).
- PostgreSQL fits matching, encounter history, anti-duplication, analytics, and governance needs.
- Node/Express/React keep the product fully JavaScript/TypeScript end-to-end.

---

## 2) Phase 1 Definition of Done

Phase 1 is complete when:
1. A Pod type "Raw Speed Networking" can be created.
2. A session can be created inside that pod.
3. Users can join through invite flow.
4. Matching generates valid round schedules (no duplicate pairings in-session).
5. Live routing works: Lobby -> 1:1 -> Lobby through all rounds.
6. Ratings are stored after each round.
7. Mutual meet-again connections are generated.
8. Recap email is sent after event completion.
9. System runs a successful live event with 300+ participants.

---

## 3) Milestone-Based Delivery Plan

## Milestone 1
Goal: Foundation + architecture confirmation + core data model + project setup.

### Deliverables
- Monorepo/workspace setup (client, server, shared contracts).
- Core database schema (Phase 1 entities) finalized.
- Authentication baseline (magic link and session/JWT approach) finalized.
- Role model baseline (member, host, admin) finalized.
- Architecture sign-off document completed.

### Build Tasks
- Establish backend service boundaries:
  - Identity service
  - Pod/session service
  - Matching service (stub + interface)
  - Orchestration service (state machine skeleton)
  - Video abstraction layer interface
- Create DB tables for Phase 1 core:
  - users
  - pods
  - pod_members
  - sessions
  - session_participants
  - matches
  - ratings
  - encounter_history
  - invites
  - user_subscriptions
  - user_entitlements
- Add performance indexes for active queries.
- Create initial API contract for:
  - auth
  - users
  - pods
  - sessions
  - invites

### Exit Criteria
- Able to create pod and session via API.
- Able to register participant records.
- Architecture validated against all three requirement docs.

---

## Milestone 2
Goal: Pod Engine functional in internal simulation.

### Deliverables
- Matching engine v1 operational.
- Live orchestration loop operational.
- Video routing integrated through abstraction layer.
- End-to-end internal test session completed.

### Build Tasks
- Matching engine v1:
  - Weighted scoring by configurable attributes.
  - Hard constraints support.
  - No duplicate pairings within a session.
  - Global multi-round optimization (not greedy per-round).
  - Odd participant handling.
  - Schedule generation target under 30s for 300 participants.
- Orchestration engine:
  - Session states: scheduled, lobby, live rounds, transitions, closing, completed.
  - Timers for lobby/round/transition.
  - Automatic participant routing events.
  - Reconnection handling for drop/rejoin.
  - No-show detection and reassignment path (<= 60s strategy).
- Video layer:
  - LiveKit provider implementation behind interface.
  - Dynamic room creation/destruction.
  - Mosaic lobby room + 1:1 round rooms.
- Host controls v1:
  - Start/pause/end session.
  - View attendance and current round.
  - Broadcast message.
  - Remove participant.
  - Manual reassignment trigger.
- Ratings and memory:
  - Store quality score (1-5).
  - Store meet-again boolean.
  - Update encounter history.

### Exit Criteria
- Full internal simulation runs from lobby to completion.
- Ratings and encounter history persist correctly.
- Host can control session flow without manual links.

---

## Milestone 3
Goal: First successful live RSN event with production stability.

### Deliverables
- Live event delivered with 300+ users.
- 5 full rounds completed.
- Recap and connection outputs delivered.
- Operational baseline ready for maintenance cycle.

### Build Tasks
- Production hardening:
  - Error tracking and alerting.
  - Structured logs.
  - Rate limiting and bot protection.
  - Audit logs for sensitive actions.
- Performance verification:
  - Matching under 30 seconds.
  - Transition latency under 2 seconds target.
  - Reconnect behavior validated.
- Post-event outputs:
  - People met list.
  - Mutual meet-again highlights.
  - Admin export: schedule, attendance, ratings, no-shows.
  - Recap email pipeline.

### Exit Criteria
- Successful live run documented.
- KPIs and incident notes captured.
- Maintenance backlog prepared.

---

## 4) Phase 1 Functional Scope (Must-Have)

### Identity and access
- Email-based authentication.
- Required profile attributes (including LinkedIn and reason context).
- Role-based access control for member/host/admin.

### Pod/session execution
- Pod type: SPEED_NETWORKING.
- Configurable template values:
  - Lobby duration
  - Number of rounds
  - Round duration
  - Transition duration
- Session participant management and attendance statuses.

### Matching
- Configurable weighted criteria from session/pod config.
- Constraint and exclusion support.
- Duplicate avoidance in-session.
- Odd count handling.

### Real-time orchestration
- Automatic flow:
  - Lobby mosaic
  - Countdown
  - 1:1 room assignment
  - Timer
  - Round transition
  - Repeat
  - Closing mosaic
- Reconnection and late-join handling.

### Feedback and memory
- Per-round rating (quality + meet-again).
- Persistent encounter history for future matching quality.

### Host/admin baseline
- Live attendance view.
- Round control actions.
- Participant moderation actions.
- Broadcast messaging.

### Communications
- Invite links with status tracking.
- Session recap email.

### Billing readiness
- Subscription and entitlement data model available.
- Feature gating ready at data and API level.

---

## 5) Phase 2 Scope (After First Live Success)

- Three-I onboarding (Intention, Invitation, Impact).
- Reason Score v1 and trust scaling.
- Expanded invite growth mechanics and anti-spam controls.
- Pod lifecycle states and director role expansion.
- Pod meetings + ICS/calendar flow.
- Governance system (reporting, strikes, admin review).
- Subscription tier enforcement and conversion flow.
- Badge and status system.
- Admin analytics suite.

---

## 6) Phase 3+ Scope (Advanced)

- ORCHESTRA masterclass system.
- CONCERT scale events.
- Advanced AI-assisted matching and recommendations.
- Additional pod orchestration types.
- Mobile/PWA maturity and deeper localization.

---

## 7) Core Non-Negotiables

- Separation of concerns:
  - Pod logic != matching logic != video provider internals.
- Security baseline:
  - invite token validation
  - role enforcement
  - rate limiting
  - auditability
- Performance baseline:
  - schedule generation under SLA
  - transition latency and reconnect resilience
- Data baseline:
  - persistent encounter memory across sessions
  - stable exports/reporting for operators

---

## 8) Risk Register (Phase 1 Focus)

1. Matching quality/performance drift at high participant counts.
2. Transition latency spikes during synchronized round switches.
3. No-show cascades causing isolation pockets.
4. Invite abuse/spam before trust gating is mature.
5. Real-time disconnect storms during event peak moments.

### Mitigation focus
- Load tests before live event.
- Reassignment pool and host override.
- Rate-limit and anti-abuse controls from day one.
- Instrumentation and runbooks before launch.

---

## 9) Operating Rhythm

- Planning + review with clear deliverables.
- Scope control: no expansion without milestone impact review.
- Stability over speed when trade-offs appear.
- Every completed task reflected in progress.md.

---

## 10) Immediate Next Execution Sequence

1. Freeze final Phase 1 schema and API boundaries.
2. Set up repositories and environments (dev/staging/prod plan).
3. Build Milestone 1 foundation.
4. Build Milestone 2 engine + orchestration.
5. Execute Milestone 3 live event hardening and launch.

This is the canonical working plan for implementation.