# Alethia Live

**A real-time healthcare navigation and health literacy companion built for the Gemini Live Agent Challenge 2026.**

Alethia Live helps people better understand healthcare information without pretending to diagnose them. It combines **live voice interaction** with **screenshot-based document understanding** to help users talk through care questions, make sense of healthcare paperwork in plain English, prepare better questions for a clinician, and notice urgent red flags.

## Why this project exists

Healthcare information is often confusing at exactly the moment people need clarity most.

People leave visits with after-visit summaries, discharge instructions, portal messages, medication labels, and appointment instructions that are packed with unfamiliar language. They also have everyday care-navigation questions like:

- “Should I wait and monitor this?”
- “Should I book an appointment?”
- “What should I ask the clinic?”
- “What in this document actually matters?”

Alethia Live is designed to help with that gap.

It is **not** a diagnostic system, treatment recommender, or medication advisor.  
It is an **informational companion** focused on safer, clearer healthcare navigation and health literacy support.

---

## Built for the Gemini Live Agent Challenge

Alethia Live is intentionally designed to match the challenge requirements:

- **New next-generation AI agent**
- **Uses a Gemini model**
- **Uses the Google GenAI SDK**
- **Uses Google Cloud**
- **Hosted on Google Cloud Run**
- **Multimodal**
- **Goes beyond simple text-in / text-out**

### Challenge fit at a glance

| Requirement | Alethia Live implementation |
|---|---|
| Gemini model | Gemini via `@google/genai` |
| Live agent behavior | Real-time voice session using Gemini Live |
| Multimodal | Voice + image/screenshot understanding |
| Google Cloud service | Cloud Run |
| Hosted on Google Cloud | Deployed on Cloud Run |
| Public code repo | This repository |
| Demo-ready architecture | Single Next.js app with browser + API routes |

---

## What Alethia Live does

Alethia Live focuses on two main experiences:

### 1) Live voice support
A user can speak naturally about a care question or healthcare confusion.

Alethia Live:
- listens in real time
- asks clarifying questions
- summarizes the concern in plain English
- suggests a **high-level care-path category**
- suggests questions to ask a clinician
- points out emergency red flags
- repeatedly frames itself as informational, not diagnostic

### 2) Screenshot and document understanding
A user can upload a screenshot such as:
- after-visit summary
- discharge instructions
- appointment instructions
- medication label
- provider page
- lab result screenshot

Alethia Live:
- explains what the screenshot appears to say
- highlights what matters most
- gives high-level care-path framing
- suggests questions to ask a clinician
- surfaces emergency red flags
- keeps the output document-anchored and safety-bounded

---

## Core product principles

Alethia Live is built around a narrow, practical product scope.

### It is
- a real-time healthcare navigation companion
- a health literacy support tool
- a document explanation assistant
- a question-prep tool for clinical conversations
- a red-flag escalation aid

### It is not
- a diagnosis engine
- a symptom checker that concludes likely diseases
- a treatment recommender
- a medication advisor
- a substitute for a licensed clinician

---

## Safety boundaries

Alethia Live was intentionally constrained to avoid unsafe healthcare overreach.

### Allowed behaviors
- plain-English explanation
- health literacy support
- high-level care-path framing
- questions to ask a clinician
- urgent/emergency red-flag surfacing

### Not allowed
- “You probably have X”
- “This is likely Y”
- “Take Z medication”
- definitive clinical conclusions
- overconfident treatment guidance
- telling users they do not need care

### Safety stance
Alethia Live is informational only and repeatedly says so in both interface copy and output behavior.

For uploaded screenshots, the wording is intentionally document-anchored:

- “This screenshot appears to say...”
- “The instructions shown here recommend...”
- “This document mentions...”
- “You could ask the clinic...”

instead of direct prescriptive phrasing.

---

## Why this is a live agent instead of a basic chatbot

Alethia Live is not just a static prompt box.

It combines:

- **real-time live voice session behavior**
- **turn-based audio interaction**
- **browser microphone streaming**
- **Gemini Live setup + session lifecycle**
- **screenshot understanding**
- **structured UI output for decision support**

That makes it a stronger fit for the **Live Agents** category than a standard text chatbot.

---

## Demo scenarios

### Scenario 1 — care navigation question
User says:

> “I’ve had a fever and sore throat for two days. I’m not sure if I should wait, book an appointment, or go somewhere urgent.”

Alethia Live should:
- ask a few clarifying questions
- summarize the concern
- suggest a high-level care path
- provide questions to ask a clinician
- mention emergency red flags
- stay informational and non-diagnostic

### Scenario 2 — healthcare screenshot understanding
User uploads a screenshot such as an after-visit summary or discharge instructions.

Alethia Live should:
- explain it in plain English
- highlight what matters most
- give high-level next-step framing
- suggest questions to ask the clinic or doctor
- surface urgent red flags if relevant

---

## Product screenshots

### Home screen
![Alethia home screen](public/alethia-home.png)

### Live session speaking state
![Alethia speaking state](public/alethia-speaking.png)

### Live session listening state
![Alethia listening state](public/alethia-listening.png)

### Screenshot upload flow
![Alethia upload flow](public/alethia-upload.png)

### Structured screenshot understanding output
![Alethia results summary](public/alethia-results-summary.png)

### Red flags and safety note output
![Alethia results red flags](public/alethia-results-redflags.png)

---

## Architecture

Alethia Live uses a **single Next.js web app** for the fastest realistic hackathon path.

### High-level system design

- **Browser frontend**
  - portrait-centered voice interaction
  - screenshot upload flow
  - structured output cards
- **Next.js API routes**
  - ephemeral live token route
  - structured screenshot summary route
- **Gemini Live**
  - real-time voice session
  - turn lifecycle
  - audio output
- **Gemini structured generation**
  - screenshot/document explanation
  - structured result cards
- **Google Cloud Run**
  - hosted deployment

### Current architecture notes
- live voice uses Gemini Live
- screenshot understanding uses standard generation on the server
- the app is intentionally single-codebase for speed, clarity, and deployment simplicity

### Architecture Diagram

![Alethia Live Architecture](public/alethia-architecture.png)
_Alethia Live uses a split multimodal architecture: Gemini Live handles real-time voice interaction, while a standard `@google/genai` route explains healthcare screenshots and documents in plain English. The full Next.js application is deployed on Google Cloud Run._

For detailed notes, see:
- [`docs/architecture.md`](docs/architecture.md)
- [`docs/product-spec.md`](docs/product-spec.md)
- [`docs/decision-log.md`](docs/decision-log.md)

---

## Tech stack

- **Framework:** Next.js
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **AI SDK:** `@google/genai`
- **Realtime voice:** Gemini Live API
- **Hosting:** Google Cloud Run
- **Audio:** browser mic input + PCM audio playback
- **Frontend pattern:** single-app product UI with server routes

---

## Deployment

Alethia Live is deployed on **Google Cloud Run**.

### Live deployment
[Open Alethia Live](https://alethia-live-695463819079.us-central1.run.app)

### Deployment model
- source deployed to Cloud Run
- service hosted in `us-central1`
- runtime Gemini API key injected through Cloud Run environment variables

---

## Project highlights

- Real-time Gemini Live integration in a browser-based healthcare UX
- Multimodal product flow: **voice + screenshot**
- Strong safety boundaries for healthcare-adjacent AI
- Clear product positioning instead of generic chatbot sprawl
- Single-codebase deployment path optimized for hackathon speed
- Cloud Run deployment on Google Cloud
- Structured screenshot understanding outputs designed for actual usability

---

## Current limitations

Alethia Live is intentionally scoped as a hackathon MVP.

Current limitations include:

- Screenshot-first document flow rather than a full PDF pipeline
- No user accounts or persistent memory
- Not designed for clinical decision-making
- No diagnosis, treatment, or medication advice
- Optimized for clarity and demo strength rather than broad healthcare coverage

---

## Future directions

Potential next steps after the hackathon:

- Higher-quality document ingestion beyond screenshots
- Stronger multimodal document pipelines
- Richer real-time transcript handling
- Language accessibility improvements
- Better clinic and care-setting explanation templates
- More robust safety evaluation and testing

---

## Why this matters to me

I’m an undergraduate AI student focused on becoming an AI engineer in healthcare and medical AI.

Alethia Live reflects the kind of systems I want to build:

- Useful
- Human-centered
- Safety-conscious
- Scoped to real user needs
- Technically real, not just conceptually interesting

This project sits within my broader healthcare AI story alongside earlier work in seizure detection, neonatal brain MRI modeling, and medical learning product design.

---

## Disclaimer

Alethia Live is a research and hackathon project.

It is an informational healthcare navigation and health literacy companion, **not** a medical diagnostic tool, treatment system, medication advisor, or substitute for professional clinical care.

If you may be experiencing a medical emergency, seek immediate emergency care or contact local emergency services.

---

## Repository notes

This repository includes:

- Working product code
- Sample fictional healthcare screenshots for demo use
- Product and architecture documentation
- A deployment-ready Next.js app structure

The sample healthcare screenshots in `public/samples/` are fictional demo assets created for product demonstration purposes.

---

## Reproducible Testing

Alethia Live can be tested in two ways:

1. **Deployed version on Google Cloud Run**
2. **Local development setup**

### Test the deployed app

Open the live app:

**https://alethia-live-695463819079.us-central1.run.app**

#### Voice flow

1. Open the app in Chrome.
2. Allow microphone access when prompted.
3. Click the Alethia portrait to start the live session.
4. Wait for the UI to show that the session is ready.
5. Click the portrait again to begin speaking.
6. Say a test prompt such as:

> “I’ve had a fever and sore throat for two days. I’m not sure if I should wait, book an appointment, or go somewhere urgent.”

**Expected result:**
- Alethia responds with live voice output
- the UI reflects listening / speaking state changes
- the response stays informational and non-diagnostic
- emergency red flags may be surfaced when relevant

#### Screenshot/document flow

1. Use the **Use sample** button or upload a healthcare-related screenshot/image.
2. Click **Explain screenshot**.

**Expected result:**
- structured result cards appear:
  - Plain-English Summary
  - High-Level Care Path
  - What Matters Most
  - Questions to Ask a Clinician
  - Emergency Red Flags
  - Safety Note

### Test locally

#### Prerequisites

- Node.js 18+ recommended
- npm
- a Gemini API key with access to the required Gemini models

#### Setup

bash
git clone <YOUR_REPO_URL>
cd alethia-live
npm install

---

Create a `.env.local` file in the project root and add:

bash
GEMINI_API_KEY=your_api_key_here

Then run:

npm run dev

Open:

http://localhost:3000

--- 

##Local test checklist

### 1. Live token route

Visit or trigger the app flow that calls:

/api/live-token

Expected result:

route returns a valid ephemeral token response

browser can establish a Gemini Live session

### 2. Live voice session

start a live session from the UI

allow microphone access

speak a short care-related question

Expected result:

connection succeeds

microphone audio streams to Gemini Live

model audio plays back in the browser

turn lifecycle completes without crashing

### 3. Screenshot/document understanding

upload one of the included sample screenshots or another healthcare-related image

click Explain screenshot

Expected result:

/api/summary returns structured output

cards render correctly in the UI

wording remains document-anchored and informational

Recommended sample test prompts
Voice prompt

“I’ve had a fever and sore throat for two days. I’m not sure if I should wait, book an appointment, or go somewhere urgent.”

Screenshot prompt

Use one of the included fictional sample assets:

after-visit-summary-better.png

appointment-instructions-better.png

discharge-instructions-better.png

Expected behavior:

Alethia explains the screenshot in plain English

highlights what matters most

suggests questions to ask a clinician

surfaces urgent red flags when appropriate

does not diagnose, recommend treatment, or give medication advice

---

## Notes for judges

This is an informational healthcare navigation and health literacy tool.

It is not a diagnostic system, treatment recommender, or medication advisor.

For the best testing experience, use Chrome on desktop with microphone permissions enabled.

If testing the deployed version, the Cloud Run service must have a valid runtime GEMINI_API_KEY configured.
