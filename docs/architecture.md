# Alethia Live — Architecture

## Overview
Alethia Live is a single Next.js web application deployed on Google Cloud Run.

It supports:
- browser microphone input
- Gemini Live voice interaction
- image upload for document explanation
- transcript display
- structured summary cards
- safety-constrained healthcare navigation guidance

## High-Level Architecture

### Frontend
Browser-based Next.js client:
- captures microphone input
- opens Gemini Live session using an ephemeral token
- streams audio
- uploads image/document screenshot
- plays model audio response
- displays transcript
- displays structured result cards

### Backend
Next.js route handlers:
- `/api/live-token`
  - creates an ephemeral token for a Live session
- `/api/summary`
  - converts transcript/context into structured JSON cards
- `/api/health`
  - health check endpoint

### Model Layer
Gemini is used in two ways.

1. Gemini Live API
   - real-time voice interaction
   - multimodal conversation
   - clarifying questions
   - spoken responses

2. Gemini structured generation
   - converts transcript and session context into:
     - plain-English summary
     - care-path category
     - questions to ask a clinician
     - emergency red flags
     - disclaimer text

### Hosting
- Google Cloud Run hosts the Next.js app

## Safety Design
Safety is enforced through:
- strong system instruction constraints
- narrow product scope
- visible UI disclaimer
- structured non-diagnostic output
- emergency escalation language
- no treatment or medication advice
- no definitive condition labeling

## Data Flow

### Scenario 1 — Care Navigation
1. User opens session
2. Frontend requests ephemeral token from `/api/live-token`
3. Browser connects to Gemini Live
4. User speaks
5. Audio is streamed to Gemini Live
6. Model asks clarifying questions and responds with audio
7. Transcript is displayed in UI
8. Transcript/context is sent to `/api/summary`
9. Structured cards are rendered in UI

### Scenario 2 — Document Explanation
1. User uploads a healthcare document screenshot/photo
2. Image is attached to session context
3. User asks for explanation
4. Gemini Live and/or the summary route interprets the content
5. UI displays a plain-English explanation and suggested follow-up questions

## Architecture Diagram (Text)
User Browser
- mic input
- image upload
- transcript panel
- result cards
- disclaimer banner

↕️

Next.js App on Cloud Run
- page UI
- `/api/live-token`
- `/api/summary`
- `/api/health`

↕️

Gemini API
- Live API for voice interaction
- structured generation for summary cards

## MVP Technical Constraints
- one-page app only
- no authentication
- no database
- no provider lookup
- no full PDF ingestion
- no medication/treatment advice