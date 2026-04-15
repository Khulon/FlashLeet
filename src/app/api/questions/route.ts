import { NextResponse } from "next/server";
// Bundled at build time — not read from the filesystem at runtime.
// This means the Fly.io volume mount on /app/data won't shadow it.
import questions from "../../../../data/questions.json";

export async function GET() {
  return NextResponse.json(questions);
}
