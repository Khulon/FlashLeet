"use client";
import { Layers, Target, Timer, Award, Lightbulb } from "lucide-react";
import { UserSettings } from "@/lib/types";

interface Props {
  settings: UserSettings | null;
  onClose: () => void;
  onOpenGlobalQueue: () => void;
}

export default function InfoDrawer({ settings, onClose, onOpenGlobalQueue }: Props) {
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer" style={{ overflowY: "auto", paddingBottom: 40 }}>
        {/* Header */}
        <div style={{
          padding: "20px 20px 16px",
          borderBottom: "2px solid var(--border)",
          position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 1,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontWeight: 900, fontSize: 18, marginBottom: 2 }}>How Learning Works</h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
                Spaced repetition, sessions &amp; intervals
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

        <div style={{ padding: "20px 20px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Sessions & Queue */}
          <section>
            <h3 style={{ fontWeight: 900, fontSize: 15, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "var(--purple-lt)", borderRadius: 8, padding: "4px 10px", color: "var(--purple)", fontSize: 13 }}>
                <Layers size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />Sessions &amp; Queue
              </span>
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6, fontWeight: 600 }}>
              Your full card library is the{" "}
              <button
                onClick={onOpenGlobalQueue}
                style={{
                  fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: 13,
                  color: "var(--purple)", background: "var(--purple-lt)",
                  border: "none", borderRadius: 6, padding: "1px 8px",
                  cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3,
                }}
              >global queue</button>{" "}
              — every card sorted by priority (due cards first, then new, then upcoming). Each session pulls the top{" "}
              <strong style={{ color: "var(--text)" }}>{settings?.sessionSize ?? 10} cards</strong>{" "}
              from that global queue into a <strong style={{ color: "var(--text)" }}>local session batch</strong>. You only see and review those cards.
            </p>
            <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6, fontWeight: 600, marginTop: 8 }}>
              When the batch is done, you get a summary screen. Hit <em>Continue</em> to pull the next batch from the global queue. Change your session size in <strong style={{ color: "var(--text)" }}>Settings</strong>.
            </p>
          </section>

          {/* Priority order */}
          <section>
            <h3 style={{ fontWeight: 900, fontSize: 15, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "var(--purple-lt)", borderRadius: 8, padding: "4px 10px", color: "var(--purple)", fontSize: 13 }}>
                <Target size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />Card Priority Order
              </span>
            </h3>
            {[
              { label: "Injected", desc: "Cards you pinned from the Search page go first." },
              { label: "Due",      desc: "Cards whose review interval has expired, oldest due first." },
              { label: "New",      desc: "Never-seen cards, in problem ID order." },
              { label: "Upcoming", desc: "Cards not yet due, soonest expiring first." },
            ].map(({ label, desc }) => (
              <div key={label} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                <span style={{ fontWeight: 900, fontSize: 12, minWidth: 90, color: "var(--purple)", marginTop: 2 }}>{label}</span>
                <span style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 600, lineHeight: 1.5 }}>{desc}</span>
              </div>
            ))}
            <p style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginTop: 4 }}>
              Within each group, cards you saw in the last 5 reviews are pushed to the back to avoid immediate repeats.
            </p>
          </section>

          {/* Review intervals */}
          <section>
            <h3 style={{ fontWeight: 900, fontSize: 15, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "var(--purple-lt)", borderRadius: 8, padding: "4px 10px", color: "var(--purple)", fontSize: 13 }}>
                <Timer size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />Next Review Intervals
              </span>
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6, fontWeight: 600, marginBottom: 10 }}>
              How long until a card comes back depends on your answer streak and how fast you answered.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, background: "var(--green-lt)", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontWeight: 900, fontSize: 13, color: "var(--green-dk)", marginBottom: 6 }}>Know It</div>
                {[
                  ["1st in a row", "24 h"],
                  ["2nd in a row", "72 h"],
                  ["3rd in a row", "1 week"],
                  ["4th in a row", "3 weeks"],
                  ["5th+ in a row", "2 months"],
                ].map(([streak, interval]) => (
                  <div key={streak} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "var(--green-dk)", marginBottom: 3 }}>
                    <span>{streak}</span><span>{interval}</span>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: "var(--green-dk)", fontWeight: 700, marginTop: 6, opacity: 0.8 }}>
                  Fast answer (&lt;30 s) → ×1.4 &nbsp;|&nbsp; Slow (&gt;2 min) → ×0.9
                </div>
              </div>
              <div style={{ flex: 1, background: "var(--red-lt)", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontWeight: 900, fontSize: 13, color: "var(--red-dk)", marginBottom: 6 }}>Don&apos;t Know</div>
                {[
                  ["1st miss",  "7 h"],
                  ["2nd miss",  "24 h"],
                  ["3rd+ miss", "70 h"],
                ].map(([streak, interval]) => (
                  <div key={streak} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "var(--red-dk)", marginBottom: 3 }}>
                    <span>{streak}</span><span>{interval}</span>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: "var(--red-dk)", fontWeight: 700, marginTop: 6, opacity: 0.8 }}>
                  Resets your success streak to 0.
                </div>
              </div>
            </div>
          </section>

          {/* Progress states */}
          <section>
            <h3 style={{ fontWeight: 900, fontSize: 15, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "var(--purple-lt)", borderRadius: 8, padding: "4px 10px", color: "var(--purple)", fontSize: 13 }}>
                <Award size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />Progress States
              </span>
            </h3>
            {[
              { badge: "badge-new",      label: "New",      desc: "Never answered. Enters the queue in problem-ID order." },
              { badge: "badge-learning", label: "Learning", desc: "Streak of 1, or reset after a wrong answer." },
              { badge: "badge-review",   label: "Review",   desc: "Streak of 2–4. Gradually spacing out." },
              { badge: "badge-mastered", label: "Mastered", desc: "Streak of 5+. Returns only every 2 months." },
            ].map(({ badge, label, desc }) => (
              <div key={label} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                <span className={badge} style={{ minWidth: 72, textAlign: "center", marginTop: 1 }}>{label.toUpperCase()}</span>
                <span style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 600, lineHeight: 1.5 }}>{desc}</span>
              </div>
            ))}
          </section>

          {/* Tips */}
          <section>
            <h3 style={{ fontWeight: 900, fontSize: 15, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "var(--purple-lt)", borderRadius: 8, padding: "4px 10px", color: "var(--purple)", fontSize: 13 }}>
                <Lightbulb size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />Tips
              </span>
            </h3>
            {[
              "Tap or click the card to flip it. Swipe right = Know It, left = Don't Know.",
              "Use Search → Study to pin any card to the front of your queue.",
              "The timer tracks how long you spend on each card and adjusts the next interval.",
              "Your queue respects the Difficulty and Tag filters set in Settings.",
            ].map((tip, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7, alignItems: "flex-start" }}>
                <span style={{ fontSize: 12, color: "var(--purple)", fontWeight: 900, minWidth: 18 }}>{i + 1}.</span>
                <span style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 600, lineHeight: 1.5 }}>{tip}</span>
              </div>
            ))}
          </section>

        </div>
      </div>
    </>
  );
}
