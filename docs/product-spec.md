# Alethia Live — Product Spec

## Project Name
Alethia Live

## Category
Gemini Live Agent Challenge — Live Agents

## One-Sentence Pitch
A real-time, multimodal healthcare navigation and health literacy companion that helps people talk through care questions, understand next-step options, and prepare for conversations with a clinician.

## Problem
Many people struggle to know what kind of care to seek, how urgent their concern may be, or how to understand healthcare-related documents. They may feel confused, overwhelmed, or unable to translate medical language into clear next steps.

## Product Positioning
Alethia Live is not a diagnostic tool, symptom checker, or treatment recommender.

It is:
- a healthcare navigation companion
- a health literacy support tool
- a real-time voice-first agent
- a document explanation assistant
- a conversation-preparation tool for clinician visits

## Target User
A general adult user who:
- has a non-emergency healthcare concern
- is unsure what kind of care setting makes sense
- wants help understanding a healthcare-related document
- wants help preparing questions for a clinician

## Core User Value
The product helps a user:
- explain their concern in plain language
- get a cautious, non-diagnostic summary
- understand a likely care-path category
- identify what questions to ask a clinician
- notice emergency warning signs
- better understand a healthcare-related document

## MVP Scope
The MVP supports only two primary demo scenarios.

### Scenario 1 — Care Navigation
The user speaks naturally about a health concern or confusion about what type of care to seek.

The agent:
1. listens
2. asks up to 3 clarifying questions
3. summarizes the concern in plain English
4. suggests a high-level care-path category
5. gives questions to ask a clinician
6. states emergency red flags when relevant
7. reminds the user it is informational and not diagnostic

### Scenario 2 — Document Explanation
The user uploads a screenshot or photo of a healthcare-related document.

Examples:
- after-visit summary
- discharge instructions
- appointment instructions
- clinic page
- medication label image

The agent:
1. reviews the image
2. explains it in plain English
3. highlights what matters most
4. identifies follow-up questions for the clinic or doctor
5. reminds the user it is informational and not diagnostic

## Must-Have Features
- live voice interaction
- multimodal image/document screenshot input
- clarifying questions
- plain-English summary
- high-level care-path suggestion
- questions to ask your doctor
- emergency red-flag handling
- visible disclaimer
- Google Cloud deployment
- reproducible repo and README

## Explicit Non-Goals
The MVP will not include:
- diagnosis
- probable-condition naming as a conclusion
- treatment recommendations
- medication instructions
- provider search
- map/location routing
- PDF parsing pipeline
- user accounts
- medical history storage
- Firestore history
- fancy personalization

## Success Criteria
The MVP is successful if:
- the user can speak to the agent in real time
- the agent responds with voice
- transcript text appears on screen
- result cards update clearly
- at least one care-navigation demo works end-to-end
- at least one document explanation demo works end-to-end
- the system stays within safety boundaries
- the app is deployed on Google Cloud

## User Experience Principles
- calm and plain-English
- supportive, not authoritative
- cautious and safety-aware
- minimal interface
- one-page experience
- fast to demo