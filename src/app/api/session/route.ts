import { NextRequest, NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/server-storage";
import { LearnSession } from "@/lib/types";

const DEFAULT_SESSION: LearnSession = {
  injectedQuestionIds: [],
  recentQuestionIds: [],
};

export async function GET() {
  const raw = readJsonFile<any>("learn-session.json", DEFAULT_SESSION);
  // Backfill: old format had injectedQuestionId (singular), new format uses injectedQuestionIds (array)
  const session: LearnSession = {
    ...DEFAULT_SESSION,
    ...raw,
    injectedQuestionIds: raw.injectedQuestionIds
      ?? (raw.injectedQuestionId != null ? [raw.injectedQuestionId] : []),
  };
  return NextResponse.json(session);
}

export async function POST(req: NextRequest) {
  const session: LearnSession = await req.json();
  writeJsonFile("learn-session.json", session);
  return NextResponse.json({ ok: true });
}
