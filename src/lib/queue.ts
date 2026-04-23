import { Question, CardState, UserSettings, LearnSession, CardMixRatio, CardType } from "./types";
import { isDue } from "./scheduler";

// ── Shared filtering + bucket helpers ────────────────────────────────

function filterQuestions(
  questions: Question[],
  settings: UserSettings,
  excludeId?: number,
  excludeIds?: Set<number>,
): Question[] {
  return questions.filter((q) => {
    if (excludeId !== undefined && q.id === excludeId) return false;
    if (excludeIds?.has(q.id)) return false;
    const diffOk = settings.selectedDifficulties.includes(q.difficulty);
    const tagOk =
      settings.selectedTags.length === 0 ||
      q.tags.some((t) => settings.selectedTags.includes(t));
    return diffOk && tagOk;
  });
}

/** Split questions into the four natural buckets. */
function splitBuckets(
  filtered: Question[],
  cardStates: Record<number, CardState>,
  injectedIds: Set<number>,
  recentIds: Set<number>,
  now: Date,
): {
  injected: Question[];
  due: Question[];
  newCards: Question[];
  upcoming: Question[];
} {
  const rest = filtered.filter(q => !injectedIds.has(q.id));

  const injectedList: Question[] = [];
  for (const id of injectedIds) {
    const q = filtered.find(q => q.id === id);
    if (!q) continue;
    const st = cardStates[q.id];
    if (!st || st.progress === "new" || isDue(st)) injectedList.push(q);
  }

  const due = rest
    .filter((q) => {
      const st = cardStates[q.id];
      return st && st.progress !== "new" && isDue(st);
    })
    .sort((a, b) =>
      new Date(cardStates[a.id].nextDueAt).getTime() -
      new Date(cardStates[b.id].nextDueAt).getTime()
    );

  const newCards = rest
    .filter((q) => {
      const st = cardStates[q.id];
      if (!st) return true;
      if (st.progress !== "new") return false;
      return new Date(st.nextDueAt) <= now;
    })
    .sort((a, b) => a.id - b.id);

  const upcoming = rest
    .filter((q) => {
      const st = cardStates[q.id];
      if (!st) return false;
      if (isDue(st)) return false;
      return st.progress !== "new" || new Date(st.nextDueAt) > now;
    })
    .sort((a, b) =>
      new Date(cardStates[a.id].nextDueAt).getTime() -
      new Date(cardStates[b.id].nextDueAt).getTime()
    );

  // Deprioritise recently-seen cards within each bucket
  const order = (arr: Question[]) => [
    ...arr.filter((q) => !recentIds.has(q.id)),
    ...arr.filter((q) => recentIds.has(q.id)),
  ];

  return {
    injected: order(injectedList),
    due: order(due),
    newCards: order(newCards),
    upcoming: order(upcoming),
  };
}

// ── Public: typed queues for display ─────────────────────────────────

export interface TypedQueues {
  injected: Question[];
  due: Question[];
  new: Question[];
  upcoming: Question[];
}

/**
 * Returns the three active queues (injected / due / new) plus upcoming,
 * each in their natural priority order.  Used by GlobalQueueDrawer tabs.
 */
export function buildTypedQueues(
  questions: Question[],
  cardStates: Record<number, CardState>,
  settings: UserSettings,
  session: LearnSession,
  excludeIds?: Set<number>,
): TypedQueues {
  const filtered = filterQuestions(questions, settings, undefined, excludeIds);
  const recentIds = new Set(session.recentQuestionIds.slice(-5));
  const injectedIds = new Set(session.injectedQuestionIds ?? []);
  const now = new Date();
  const { injected, due, newCards, upcoming } = splitBuckets(
    filtered, cardStates, injectedIds, recentIds, now,
  );
  return { injected, due, new: newCards, upcoming };
}

// ── Public: interleaved batch builder ────────────────────────────────

export interface BatchResult {
  questions: Question[];
  types: CardType[];
}

/**
 * Builds a batch of up to `size` cards interleaved according to `ratio`.
 *
 * Uses Bresenham-style deficit tracking so that, at every position in the
 * batch, the type that is most "behind" its target proportion gets the next
 * slot.  If a type's queue is exhausted the deficit is carried by the
 * remaining types.
 */
export function buildInterleavedBatch(
  questions: Question[],
  cardStates: Record<number, CardState>,
  settings: UserSettings,
  session: LearnSession,
): BatchResult {
  const size = settings.sessionSize ?? 10;
  const ratio: CardMixRatio = settings.cardMix ?? { injected: 0, due: 7, new: 3 };
  const total = ratio.injected + ratio.due + ratio.new || 10;

  const filtered = filterQuestions(questions, settings);
  const recentIds = new Set(session.recentQuestionIds.slice(-5));
  const injectedIds = new Set(session.injectedQuestionIds ?? []);
  const now = new Date();

  const { injected, due, newCards } = splitBuckets(
    filtered, cardStates, injectedIds, recentIds, now,
  );

  let injIdx = 0, dueIdx = 0, newIdx = 0;

  // Seed counts from the current rolling window so the deficit carries across batches.
  // The window resets every 10 cards, so we work within a [0..9] slot range.
  const window = session.mixWindowTypes ?? [];
  const windowSize = window.length; // 0–9; at 10 it was already reset before this call
  const counts = {
    injected: window.filter(t => t === "injected").length,
    due:      window.filter(t => t === "due").length,
    new:      window.filter(t => t === "new").length,
  };

  const targets = {
    injected: ratio.injected / total,
    due: ratio.due / total,
    new: ratio.new / total,
  };

  const resultQs: Question[] = [];
  const resultTypes: CardType[] = [];

  for (let slot = 0; slot < size; slot++) {
    // Global window position so Bresenham accounts for already-seen cards
    const windowSlot = windowSize + slot;
    const desired = {
      injected: targets.injected * (windowSlot + 1),
      due: targets.due * (windowSlot + 1),
      new: targets.new * (windowSlot + 1),
    };

    const order: CardType[] = (["injected", "due", "new"] as CardType[]).sort(
      (a, b) => (desired[b] - counts[b]) - (desired[a] - counts[a]),
    );

    let picked = false;
    for (const type of order) {
      if (type === "injected" && injIdx < injected.length) {
        resultQs.push(injected[injIdx++]); resultTypes.push("injected"); counts.injected++; picked = true; break;
      }
      if (type === "due" && dueIdx < due.length) {
        resultQs.push(due[dueIdx++]); resultTypes.push("due"); counts.due++; picked = true; break;
      }
      if (type === "new" && newIdx < newCards.length) {
        resultQs.push(newCards[newIdx++]); resultTypes.push("new"); counts.new++; picked = true; break;
      }
    }

    if (!picked) break;
  }

  return { questions: resultQs, types: resultTypes };
}

// ── Legacy: flat queue used by selectNextCard ─────────────────────────

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
  /** When true, upcoming (not-yet-due) cards are excluded */
  batchOnly = false,
  /** Extra set of IDs to exclude */
  excludeIds?: Set<number>,
): Question[] {
  const filtered = filterQuestions(questions, settings, excludeId, excludeIds);
  if (filtered.length === 0) return [];

  const recentIds = new Set(session.recentQuestionIds.slice(-5));
  const injectedIds = new Set(session.injectedQuestionIds ?? []);
  const now = new Date();

  const { injected, due, newCards, upcoming } = splitBuckets(
    filtered, cardStates, injectedIds, recentIds, now,
  );

  if (batchOnly) return [...injected, ...due, ...newCards];
  return [...injected, ...due, ...newCards, ...upcoming];
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
