import { Question, CardState, UserSettings, LearnSession } from "./types";
import { isDue } from "./scheduler";

/**
 * Returns the same deterministic ordered list used by both:
 *  - the Queue drawer (for display)
 *  - selectNextCard (so the card you see IS the top of the queue)
 *
 * Order: injected → due (oldest first) → new (by id) → upcoming (soonest first)
 * Recent cards are deprioritised to the back of each bucket.
 */
export function buildQueue(
  questions: Question[],
  cardStates: Record<number, CardState>,
  settings: UserSettings,
  session: LearnSession,
  excludeId?: number,
  /** When true, upcoming (not-yet-due) cards are excluded — used for batch building */
  batchOnly = false,
  /** Extra set of IDs to exclude — used by global queue display to hide local batch cards */
  excludeIds?: Set<number>,
): Question[] {
  const filtered = questions.filter((q) => {
    if (excludeId !== undefined && q.id === excludeId) return false;
    if (excludeIds?.has(q.id)) return false;
    const diffOk = settings.selectedDifficulties.includes(q.difficulty);
    const tagOk =
      settings.selectedTags.length === 0 ||
      q.tags.some((t) => settings.selectedTags.includes(t));
    return diffOk && tagOk;
  });

  if (filtered.length === 0) return [];

  const recentIds = new Set(session.recentQuestionIds.slice(-5));
  const now = new Date();

  // Injected cards go first in the GLOBAL queue display only (batchOnly=false),
  // in the order they were added. When building a local batch (batchOnly=true)
  // they are ignored — the batch takes the top-N by natural priority only.
  const injectedIds = new Set(session.injectedQuestionIds ?? []);
  const injected: Question[] = [];
  if (!batchOnly) {
    for (const id of (session.injectedQuestionIds ?? [])) {
      if (id === excludeId || excludeIds?.has(id)) continue;
      const q = filtered.find(q => q.id === id);
      if (q) injected.push(q);
    }
  }

  const rest = filtered.filter(q =>
    batchOnly ? true : !injectedIds.has(q.id)
  );

  // Due cards (not new), oldest nextDueAt first
  const due = rest
    .filter((q) => {
      const st = cardStates[q.id];
      return st && st.progress !== "new" && isDue(st);
    })
    .sort((a, b) =>
      new Date(cardStates[a.id].nextDueAt).getTime() -
      new Date(cardStates[b.id].nextDueAt).getTime()
    );

  // New cards — never seen (no state) OR progress=new AND not snoozed
  // Key: a snoozed new card has a future nextDueAt and must be excluded here
  const newCards = rest
    .filter((q) => {
      const st = cardStates[q.id];
      if (!st) return true;                     // truly unseen
      if (st.progress !== "new") return false;
      return new Date(st.nextDueAt) <= now;     // snoozed new cards have future nextDueAt
    })
    .sort((a, b) => a.id - b.id);

  // Not-yet-due cards (soonest first) — includes snoozed/hidden "new" cards
  const upcoming = rest
    .filter((q) => {
      const st = cardStates[q.id];
      if (!st) return false;
      if (isDue(st)) return false;
      // non-new cards that aren't due yet, plus snoozed/hidden new cards
      return st.progress !== "new" || new Date(st.nextDueAt) > now;
    })
    .sort((a, b) =>
      new Date(cardStates[a.id].nextDueAt).getTime() -
      new Date(cardStates[b.id].nextDueAt).getTime()
    );

  // Within each bucket: non-recent first, then recent
  const order = (arr: Question[]) => [
    ...arr.filter((q) => !recentIds.has(q.id)),
    ...arr.filter((q) => recentIds.has(q.id)),
  ];

  if (batchOnly) return [...injected, ...order(due), ...order(newCards)];
  return [...injected, ...order(due), ...order(newCards), ...order(upcoming)];
}

/** Always returns the top of the deterministic queue. */
export function selectNextCard(
  questions: Question[],
  cardStates: Record<number, CardState>,
  settings: UserSettings,
  session: LearnSession,
): Question | null {
  const queue = buildQueue(questions, cardStates, settings, session);
  return queue[0] ?? null;
}
