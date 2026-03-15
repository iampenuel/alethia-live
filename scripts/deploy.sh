#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="alethia-live"
SERVICE_NAME="alethia-live"
REGION="us-central1"
PLATFORM="managed"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Error: gcloud CLI is not installed."
  exit 1
fi

if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "Error: GEMINI_API_KEY is not set."
  echo "Run: export GEMINI_API_KEY='your_api_key_here'"
  exit 1
fi

echo "Setting Google Cloud project to ${PROJECT_ID}..."
gcloud config set project "${PROJECT_ID}"

echo "Enabling required services..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com

echo "Deploying ${SERVICE_NAME} to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --region "${REGION}" \
  --platform "${PLATFORM}" \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=${GEMINI_API_KEY}"

echo ""
echo "Deployment complete."
echo "Expected service URL:"
echo "https://${SERVICE_NAME}-695463819079.${REGION}.run.app"