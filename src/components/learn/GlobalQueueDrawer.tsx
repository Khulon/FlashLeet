"use client";
import { useState, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Question, CardState, UserSettings, LearnSession } from "@/lib/types";
import { buildTypedQueues } from "@/lib/queue";
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

type Tab = "injected" | "due" | "new";

function formatDue(nextDueAt: string): string {
  const diff = new Date(nextDueAt).getTime() - Date.now();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

const ITEM_HEIGHT = 80; // approx height of each card row (title + badge row + gaps)

function FlatList({ items, emptyText }: { items: Question[]; emptyText: string }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  if (items.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontWeight: 600 }}>
        {emptyText}
      </div>
    );
  }

  return (
    <div ref={parentRef} style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map(vItem => {
          const q = items[vItem.index];
          return (
            <div
              key={q.id}
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0,
                transform: `translateY(${vItem.start}px)`,
                padding: "0 0 8px",
              }}
            >
              <div style={{
                padding: "10px 14px", borderRadius: 12,
                border: "2px solid var(--border)", background: "var(--bg-card)",
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", minWidth: 28 }}>{vItem.index + 1}</span>
                  <span style={{ flex: 1, fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {q.title}
                  </span>
                  <DifficultyBadge difficulty={q.difficulty} />
                </div>
                <div style={{ paddingLeft: 36 }}>
                  <span className="badge-new">NEW</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QueueList({
  items,
  cardStates,
  emptyText,
}: {
  items: Question[];
  cardStates: Record<number, CardState>;
  emptyText: string;
}) {
  if (items.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontWeight: 600 }}>
        {emptyText}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((q, idx) => {
        const st = cardStates[q.id];
        const isNowDue = st && new Date(st.nextDueAt) <= new Date();
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
                    color: isNowDue ? "var(--green-dk)" : "var(--text-muted)",
                    background: isNowDue ? "var(--green-lt)" : "var(--bg-2)",
                    borderRadius: 20, padding: "2px 8px",
                  }}>
                    {isNowDue ? "Due now" : formatDue(st.nextDueAt)}
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
  );
}

export default function GlobalQueueDrawer({ questions, cardStates, settings, session, localBatchIds, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("due");

  const queues = buildTypedQueues(questions, cardStates, settings, session, localBatchIds);

  const tabs: { key: Tab; label: string; count: number; color: string }[] = [
    { key: "injected", label: "Injected",  count: queues.injected.length, color: "var(--purple)" },
    { key: "due",      label: "Due",       count: queues.due.length,      color: "#ff9f43" },
    { key: "new",      label: "New",       count: queues.new.length,      color: "var(--green-dk)" },
  ];

  const activeItems =
    activeTab === "injected" ? queues.injected :
    activeTab === "due"      ? queues.due :
    queues.new;

  const isNewTab = activeTab === "new";

  const emptyText =
    activeTab === "injected" ? "No injected cards." :
    activeTab === "due"      ? "No cards due right now." :
    "No new cards available.";

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          padding: "20px 20px 0", borderBottom: "2px solid var(--border)",
          flexShrink: 0, background: "var(--bg-card)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontWeight: 900, fontSize: 18, marginBottom: 2 }}>Global Queue</h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
                {queues.injected.length + queues.due.length + queues.new.length} active cards
                {queues.upcoming.length > 0 ? ` · ${queues.upcoming.length} upcoming` : ""}
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

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4 }}>
            {tabs.map(tab => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1, fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: 13,
                    padding: "10px 4px", cursor: "pointer", background: "none",
                    border: "none", borderBottom: `3px solid ${active ? tab.color : "transparent"}`,
                    color: active ? tab.color : "var(--text-muted)",
                    transition: "all 0.15s",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 900,
                    background: active ? tab.color : "var(--bg-2)",
                    color: active ? "#fff" : "var(--text-muted)",
                    borderRadius: 10, padding: "1px 7px",
                    transition: "all 0.15s",
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, minHeight: 0, overflowY: isNewTab ? "hidden" : "auto", padding: "12px 16px" }}>
          {isNewTab ? (
            <FlatList items={activeItems} emptyText={emptyText} />
          ) : (
            <QueueList items={activeItems} cardStates={cardStates} emptyText={emptyText} />
          )}
        </div>
      </div>
    </>
  );
}
