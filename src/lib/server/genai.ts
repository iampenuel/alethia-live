import { GoogleGenAI } from "@google/genai";

let sharedClient: GoogleGenAI | null = null;

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  return apiKey;
}

export function getGenAI(): GoogleGenAI {
  if (!sharedClient) {
    sharedClient = new GoogleGenAI({
      apiKey: getApiKey(),
    });
  }

  return sharedClient;
}