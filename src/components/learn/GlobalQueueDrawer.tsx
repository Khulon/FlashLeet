"use client";
import { Question, CardState, UserSettings, LearnSession } from "@/lib/types";
import { buildQueue } from "@/lib/queue";
import DifficultyBadge from "@/components/DifficultyBadge";
import ProgressBadge from "@/components/ProgressBadge";

interface Props {
  questions: Question[];
  cardStates: Record<number, CardState>;
  settings: UserSettings;
  session: LearnSession;
  localBatchIds: Set<number>;
  onClose: () => void;
}

function formatDue(nextDueAt: string): string {
  const diff = new Date(nextDueAt).getTime() - Date.now();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export default function GlobalQueueDrawer({ questions, cardStates, settings, session, localBatchIds, onClose }: Props) {
  const queue = buildQueue(questions, cardStates, settings, session, undefined, false, localBatchIds);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div style={{
          padding: "20px 20px 16px", borderBottom: "2px solid var(--border)",
          position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 1,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontWeight: 900, fontSize: 18, marginBottom: 2 }}>Global Queue</h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
                {queue.length} card{queue.length !== 1 ? "s" : ""} · full priority order
              </p>
            </div>
            <button onClick={onClose} style={{
              width: 36, height: 36, borderRadius: 18,
              background: "var(--bg-2)", border: "2px solid var(--border)",
              cursor: "pointer", fontSize: 16, display: "flex",
              alignItems: "center", justifyContent: "center",
              fontWeight: 900, color: "var(--text-dim)",
            }}>✕</button>
          </div>
        </div>

        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {queue.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontWeight: 600 }}>
              All caught up!
            </div>
          )}
          {queue.map((q, idx) => {
            const st = cardStates[q.id];
            const isDue = st && new Date(st.nextDueAt) <= new Date();
            return (
              <div key={q.id} style={{
                padding: "10px 14px", borderRadius: 12,
                border: "2px solid var(--border)", background: "var(--bg-card)",
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", minWidth: 28 }}>{idx + 1}</span>
                  <span style={{ flex: 1, fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {q.title}
                  </span>
                  <DifficultyBadge difficulty={q.difficulty} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 36 }}>
                  {st ? (
                    <>
                      <ProgressBadge state={st.progress} />
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: isDue ? "var(--green-dk)" : "var(--text-muted)",
                        background: isDue ? "var(--green-lt)" : "var(--bg-2)",
                        borderRadius: 20, padding: "2px 8px",
                      }}>
                        {isDue ? "Due now" : formatDue(st.nextDueAt)}
                      </span>
                    </>
                  ) : (
                    <span className="badge-new">NEW</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
