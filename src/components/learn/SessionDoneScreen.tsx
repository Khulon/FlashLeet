"use client";
import { CheckCircle2, Trophy } from "lucide-react";
import { Question, CardState, UserSettings, LearnSession } from "@/lib/types";
import { buildQueue } from "@/lib/queue";

interface Props {
  sessionDone: boolean;
  batchSize: number;
  sessionStats: { know: number; dontknow: number };
  settings: UserSettings | null;
  questions: Question[];
  cardStates: Record<number, CardState>;
  session: LearnSession | null;
  onContinue: () => void;
}

export default function SessionDoneScreen({
  sessionDone, batchSize, sessionStats, settings, questions, cardStates, session, onContinue,
}: Props) {
  const allDone = !sessionDone;
  const totalSess = sessionStats.know + sessionStats.dontknow;
  const accuracyPct = totalSess > 0 ? Math.round((sessionStats.know / totalSess) * 100) : null;
  const totalQueue = settings && session
    ? buildQueue(questions, cardStates, settings, session, undefined, true).length
    : 0;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
      <div className="card-surface" style={{ maxWidth: 440, width: "calc(100% - 32px)", padding: "40px 36px", textAlign: "center" }}>
        <div style={{ marginBottom: 16, color: allDone ? "var(--green)" : "var(--orange)" }}>
          {allDone ? <CheckCircle2 size={52} /> : <Trophy size={52} />}
        </div>
        <h2 style={{ fontWeight: 900, fontSize: 26, marginBottom: 8 }}>
          {allDone ? "All caught up!" : "Session complete!"}
        </h2>
        <p style={{ color: "var(--text-dim)", fontWeight: 600, marginBottom: 28, fontSize: 15 }}>
          {allDone
            ? "No cards due right now."
            : `You reviewed ${batchSize} card${batchSize !== 1 ? "s" : ""} this session.`}
        </p>

        {totalSess > 0 && (
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 28 }}>
            <div style={{ background: "var(--green-lt)", borderRadius: 14, padding: "12px 20px" }}>
              <div style={{ fontWeight: 900, fontSize: 28, color: "var(--green-dk)" }}>{sessionStats.know}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--green-dk)" }}>Knew it</div>
            </div>
            <div style={{ background: "var(--red-lt)", borderRadius: 14, padding: "12px 20px" }}>
              <div style={{ fontWeight: 900, fontSize: 28, color: "var(--red-dk)" }}>{sessionStats.dontknow}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--red-dk)" }}>Didn&apos;t know</div>
            </div>
            {accuracyPct !== null && (
              <div style={{ background: "var(--purple-lt)", borderRadius: 14, padding: "12px 20px" }}>
                <div style={{ fontWeight: 900, fontSize: 28, color: "var(--purple)" }}>{accuracyPct}%</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--purple)" }}>Accuracy</div>
              </div>
            )}
          </div>
        )}

        {!allDone && totalQueue > 0 && (
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 16 }} onClick={onContinue}>
            Continue — next {Math.min(settings?.sessionSize ?? 10, totalQueue)} cards →
          </button>
        )}
      </div>
    </div>
  );
}
