import { NextResponse } from "next/server";
import { getGenAI } from "@/lib/server/genai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function createLiveToken() {
  try {
    const ai = getGenAI();

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(
      Date.now() + 60 * 1000
    ).toISOString();

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        httpOptions: {
          apiVersion: "v1alpha",
        },
      },
    });

    return NextResponse.json({
      ok: true,
      token: token.name,
      expireTime,
      newSessionExpireTime,
    });
  } catch (error) {
    console.error("Failed to create live token:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create live session token.",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return createLiveToken();
}

export async function GET() {
  return createLiveToken();
}