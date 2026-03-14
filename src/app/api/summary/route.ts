import { NextRequest, NextResponse } from "next/server";
import { getGenAI } from "@/lib/server/genai";

export const runtime = "nodejs";

const SUMMARY_MODEL = "gemini-3-flash-preview";

const summarySchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    carePath: { type: "string" },
    keyPoints: {
      type: "array",
      items: { type: "string" },
    },
    questionsForClinician: {
      type: "array",
      items: { type: "string" },
    },
    redFlags: {
      type: "array",
      items: { type: "string" },
    },
    safetyNote: { type: "string" },
  },
  required: [
    "summary",
    "carePath",
    "keyPoints",
    "questionsForClinician",
    "redFlags",
    "safetyNote",
  ],
} as const;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "No file uploaded." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "Please upload an image file." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const ai = getGenAI();

    const prompt = `
You are Alethia Live, a healthcare navigation and health literacy assistant.

The user uploaded a healthcare-related screenshot or document image.
Your job is to explain what the document appears to say in plain English and help the user understand the likely next-step category at a high level.

Critical style and safety rules:
- Do not diagnose
- Do not infer likely medical conditions
- Do not recommend treatment
- Do not recommend medications or dosing
- Do not tell the user what they personally should do medically
- Do not sound like you are personally prescribing care
- Stay informational, cautious, calm, and clear
- Ground your explanation in the document itself

Use document-anchored phrasing such as:
- "This document says..."
- "The instructions shown here recommend..."
- "This screenshot appears to say..."
- "The follow-up listed here is..."
- "A clinician could clarify..."

Avoid wording like:
- "You should..."
- "You need to..."
- "You are advised to..."
- "Take..."
- "Do not worry..."
- any direct personal medical instruction

Field rules:
- summary: explain what the document says in plain English
- carePath: HIGH-LEVEL category only, not personal medical advice
- keyPoints: important things the document highlights
- questionsForClinician: useful clarification questions the user could ask
- redFlags: only include urgent warning signs if the document itself references them or if they are clearly relevant from the instructions shown
- safetyNote: explicitly say this is informational and not a diagnosis or personal medical advice

Return valid JSON only.
`;

    const response = await ai.models.generateContent({
      model: SUMMARY_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: file.type,
                data: base64,
              },
            },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: summarySchema,
      },
    });

    const rawText = response.text?.trim();

    if (!rawText) {
      return NextResponse.json(
        { ok: false, error: "The model returned an empty response." },
        { status: 500 }
      );
    }

    let parsed: {
      summary: string;
      carePath: string;
      keyPoints: string[];
      questionsForClinician: string[];
      redFlags: string[];
      safetyNote: string;
    };

    try {
      parsed = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "The model returned invalid JSON.",
          raw: rawText,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      summary: parsed.summary ?? "",
      carePath: parsed.carePath ?? "",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      questionsForClinician: Array.isArray(parsed.questionsForClinician)
        ? parsed.questionsForClinician
        : [],
      redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
      safetyNote:
        parsed.safetyNote ||
        "Informational only — not a diagnosis or personal medical advice.",
    });
  } catch (error) {
    console.error("Failed to analyze uploaded file:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze uploaded file.",
      },
      { status: 500 }
    );
  }
}