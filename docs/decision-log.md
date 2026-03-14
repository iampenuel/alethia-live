# Alethia Live — Decision Log

## Decision 1 — Use a single Next.js codebase
Decision: use one Next.js app instead of separate frontend/backend repos.

Why: faster build, faster deployment, less complexity, easier hackathon delivery.

---

## Decision 2 — Use Gemini Live API for voice
Decision: use Gemini Live API for real-time voice interaction.

Why: this directly supports the live multimodal agent requirement and keeps the project aligned with the challenge.

---

## Decision 3 — Use ephemeral tokens
Decision: use a server route to create ephemeral tokens for the browser Live session.

Why: safer than exposing a long-lived API key in the client.

---

## Decision 4 — Use Cloud Run
Decision: deploy the app on Google Cloud Run.

Why: fastest realistic Google Cloud hosting path for this MVP.

---

## Decision 5 — Use image upload, not full PDF ingestion
Decision: support document screenshots/photos only for MVP.

Why: much faster and more reliable than building a full document pipeline under deadline pressure.

---

## Decision 6 — One-page app only
Decision: build a single-page interface.

Why: faster to build, easier to demo, reduces navigation complexity.

---

## Decision 7 — No database in MVP
Decision: do not add Firestore or persistent history for the MVP.

Why: not required to prove the core concept. Avoids unnecessary complexity.

---

## Decision 8 — Strong safety constraints over breadth
Decision: narrow the product to navigation and health literacy only.

Why: this lowers safety risk and makes the demo more credible.

---

## Decision 9 — Two demo scenarios only
Decision: build only:
1. care-navigation voice scenario
2. document explanation scenario

Why: this is the smallest scope that still feels strong and multimodal.

---

## Decision 10 — Transcript plus summary cards
Decision: show live transcript plus structured summary cards.

Why: makes the demo easy to understand visually and proves value beyond audio response alone.