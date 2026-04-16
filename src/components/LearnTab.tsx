"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { Brain, CheckCircle2, XCircle, List, Info } from "lucide-react";
import { Question, CardState, UserSettings, LearnSession } from "@/lib/types";
import {
  getQuestions, getCardStates, saveCardState,
  getUserSettings, getLearnSession, saveLearnSession,
} from "@/lib/storage";
import { createInitialCardState, updateCardState, isDue } from "@/lib/scheduler";
import { buildQueue } from "@/lib/queue";
import { useTimer } from "@/lib/useTimer";
import { useDebounce } from "@/lib/useDebounce";
import QueueDrawer from "@/components/QueueDrawer";
import SessionDoneScreen from "@/components/learn/SessionDoneScreen";
import FlashCard from "@/components/learn/FlashCard";
import SolutionPanel from "@/components/learn/SolutionPanel";
import AnswerButtons from "@/components/learn/AnswerButtons";
import SkipMenu from "@/components/learn/SkipMenu";
import ProblemModal from "@/components/learn/ProblemModal";
import InfoDrawer from "@/components/learn/InfoDrawer";
import GlobalQueueDrawer from "@/components/learn/GlobalQueueDrawer";

type ResultFlash = "know" | "dontknow" | null;
const SWIPE_THRESHOLD = 110;

export default function LearnPage() {
  // ── data ──
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [cardStates, setCardStates] = useState<Record<number, CardState>>({});
  const [settings, setSettings]     = useState<UserSettings | null>(null);
  const [session, setSession]       = useState<LearnSession | null>(null);
  const [loading, setLoading]       = useState(true);
  const [hasAiKey, setHasAiKey]     = useState(false);

  // ── card ui ──
  const [currentQ, setCurrentQ]         = useState<Question | null>(null);
  const [flipped, setFlipped]           = useState(false);
  const [hasFlippedOnce, setHasFlippedOnce] = useState(false);
  const [notes, setNotes]               = useState("");
  const [code, setCode]                 = useState("");
  const [saving, setSaving]             = useState(false);

  // ── modals / drawers ──
  const [modalOpen, setModalOpen]         = useState(false);
  const [queueOpen, setQueueOpen]         = useState(false);
  const [infoOpen, setInfoOpen]           = useState(false);
  const [globalQueueOpen, setGlobalQueueOpen] = useState(false);

  // ── session batch ──
  const [batchQueue, setBatchQueue] = useState<Question[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const batchQueueRef = useRef<Question[]>([]);
  const batchIndexRef = useRef(0);
  batchQueueRef.current = batchQueue;
  batchIndexRef.current = batchIndex;

  // ── swipe ──
  const dragXRef      = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX    = useRef<number | null>(null);
  const dragStartY    = useRef<number | null>(null);
  const dragIsHoriz   = useRef<boolean | null>(null);
  const isDraggingRef = useRef(false);
  const cardWrapRef   = useRef<HTMLDivElement>(null);
  const knowLabelRef  = useRef<HTMLDivElement>(null);
  const dontLabelRef  = useRef<HTMLDivElement>(null);

  // ── feedback ──
  const [answering, setAnswering]     = useState(false);
  const [resultFlash, setResultFlash] = useState<ResultFlash>(null);
  const [sessionStats, setSessionStats] = useState({ know: 0, dontknow: 0 });

  // ── AI ──
  const [aiLoadingNotes, setAiLoadingNotes] = useState(false);
  const [aiLoadingCode, setAiLoadingCode]   = useState(false);
  const [aiError, setAiError]               = useState<string | null>(null);

  // ── stable refs ──
  const currentQIdRef = useRef<number | null>(null);
  const cardStatesRef = useRef(cardStates);
  const questionsRef  = useRef(questions);
  const settingsRef   = useRef(settings);
  const sessionRef    = useRef(session);
  const notesRef      = useRef(notes);
  const codeRef       = useRef(code);
  const answeringRef  = useRef(answering);

  cardStatesRef.current = cardStates;
  questionsRef.current  = questions;
  settingsRef.current   = settings;
  sessionRef.current    = session;
  notesRef.current      = notes;
  codeRef.current       = code;
  answeringRef.current  = answering;

  const timer = useTimer();

  // Pause timer on tab switch; re-sync session when returning
  const pathname = usePathname();
  const isLearnTab = pathname === "/learn" || pathname === "/";
  useEffect(() => {
    if (isLearnTab) {
      timer.resume();
      if (!loading) getLearnSession().then(sess => setSession(sess));
    } else {
      timer.pause();
    }
  }, [isLearnTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial data load
  useEffect(() => {
    Promise.all([getQuestions(), getCardStates(), getUserSettings(), getLearnSession()])
      .then(([qs, cs, s, sess]) => {
        setQuestions(qs); setCardStates(cs); setSettings(s); setSession(sess);
        setHasAiKey(!!s.ai?.apiKey);
        setLoading(false);
      });
  }, []);

  // ── Batch management ─────────────────────────────────────────────────
  //
  // The local batch is persisted to disk (batchIds + batchIndex on LearnSession)
  // so a page refresh restores the in-progress batch rather than rebuilding it.
  // Only startBatch (new session) consumes and clears injectedQuestionIds.

  // Restore a persisted batch on initial load, or start fresh if none exists.
  useEffect(() => {
    if (!loading && questions.length > 0 && settings && session) {
      const savedIds = session.batchIds ?? [];
      const savedIndex = session.batchIndex ?? 0;

      if (savedIds.length > 0 && savedIndex < savedIds.length) {
        // Resume the batch that was in progress before the refresh
        const batch = savedIds
          .map(id => questions.find(q => q.id === id))
          .filter((q): q is Question => !!q);

        if (batch.length > 0 && savedIndex < batch.length) {
          const resumeIndex = savedIndex;
          setBatchQueue(batch);
          setBatchIndex(resumeIndex);
          setSessionDone(false);
          const current = batch[resumeIndex];
          setCurrentQ(current); setFlipped(false); setModalOpen(false);
          currentQIdRef.current = current.id;
          const st = cardStates[current.id];
          setNotes(st?.notes ?? ""); setCode(st?.code ?? "");
          timer.start();
          return;
        }
      }

      // No valid saved batch — start a new one
      startBatch(questions, cardStates, settings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const startBatch = useCallback(async (
    qs: Question[], cs: Record<number, CardState>, s: UserSettings,
  ) => {
    const sess = await getLearnSession();
    const size = s.sessionSize ?? 10;

    // Injected cards go at the front — but only if unseen or actually due.
    // Cards that were already answered and aren't due yet are "stale" injections:
    // they get cleaned out of injectedQuestionIds without entering the batch.
    const injectedIds: number[] = sess.injectedQuestionIds ?? [];
    const injected = injectedIds
      .map(id => qs.find(q => q.id === id))
      .filter((q): q is Question => {
        if (!q) return false;
        const st = cs[q.id];
        return !st || st.progress === "new" || isDue(st);  // unseen or due only
      })
      .slice(0, size);

    // Fill remaining from natural priority queue (excluding injected)
    const injectedSet = new Set(injected.map(q => q.id));
    const remaining = size - injected.length;
    const natural = remaining > 0
      ? buildQueue(qs, cs, s, sess, undefined, true, injectedSet).slice(0, remaining)
      : [];

    const batch = [...injected, ...natural];

    setBatchQueue(batch);
    setBatchIndex(0);
    setSessionDone(false);
    if (batch.length === 0) { setCurrentQ(null); return; }

    // Remove IDs that were consumed OR are stale (answered, not due).
    // IDs that didn't fit the size limit stay for the next session.
    const consumedIds = new Set(injected.map(q => q.id));
    const remainingInjectedIds = injectedIds.filter(id => {
      if (consumedIds.has(id)) return false;                // consumed into batch
      const st = cs[id];
      if (st && st.progress !== "new" && !isDue(st)) return false;  // stale, drop it
      return true;
    });

    const finalSess: LearnSession = {
      injectedQuestionIds: remainingInjectedIds,
      recentQuestionIds: sess.recentQuestionIds,
      batchIds: batch.map(q => q.id),
      batchIndex: 0,
    };
    const first = batch[0];
    setCurrentQ(first); setFlipped(false); setModalOpen(false);
    setResultFlash(null); resetDragStyle();
    currentQIdRef.current = first.id;
    const st = cs[first.id];
    setNotes(st?.notes ?? ""); setCode(st?.code ?? "");
    setSession(finalSess); saveLearnSession(finalSess);
    timer.start();
  }, [timer]); // eslint-disable-line react-hooks/exhaustive-deps

  const advanceInBatch = useCallback((cs: Record<number, CardState>, sess: LearnSession, completedId: number) => {
    const nextIndex = batchIndexRef.current + 1;
    const batch = batchQueueRef.current;
    const isFinished = nextIndex >= batch.length;

    const finalSess: LearnSession = {
      injectedQuestionIds: sess.injectedQuestionIds ?? [],
      recentQuestionIds: [...sess.recentQuestionIds, completedId].slice(-10),
      // Clear saved batch when done, persist progress otherwise
      batchIds: isFinished ? [] : batch.map(q => q.id),
      batchIndex: isFinished ? 0 : nextIndex,
    };
    setSession(finalSess); saveLearnSession(finalSess);

    if (isFinished) {
      setBatchIndex(nextIndex); setSessionDone(true);
      setCurrentQ(null); currentQIdRef.current = null; timer.stop(); return;
    }
    const next = batch[nextIndex];
    setBatchIndex(nextIndex);
    setCurrentQ(next); setFlipped(false); setHasFlippedOnce(false); setModalOpen(false);
    setResultFlash(null); resetDragStyle();
    currentQIdRef.current = next.id;
    const st = cs[next.id];
    setNotes(st?.notes ?? ""); setCode(st?.code ?? "");
    timer.start();
  }, [timer]); // eslint-disable-line react-hooks/exhaustive-deps

  const injectCard = useCallback((q: Question, sess: LearnSession) => {
    const remaining = batchQueueRef.current.slice(batchIndexRef.current + 1);
    const newBatch = [
      ...batchQueueRef.current.slice(0, batchIndexRef.current + 1),
      q,
      ...remaining.filter(x => x.id !== q.id),
    ];
    setBatchQueue(newBatch);
    // Persist the updated batch layout (but don't advance index)
    const finalSess: LearnSession = {
      ...sess,
      batchIds: newBatch.map(b => b.id),
      batchIndex: batchIndexRef.current,
    };
    setCurrentQ(q); setFlipped(false); setModalOpen(false);
    setResultFlash(null); resetDragStyle();
    currentQIdRef.current = q.id;
    const st = cardStatesRef.current[q.id];
    setNotes(st?.notes ?? ""); setCode(st?.code ?? "");
    setSession(finalSess); saveLearnSession(finalSess);
    timer.start();
  }, [timer]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Autosave ─────────────────────────────────────────────────────────

  const persistNoteCode = useCallback(async (n: string, c: string) => {
    const qId = currentQIdRef.current;
    if (!qId) return;
    setSaving(true);
    const existing = cardStatesRef.current[qId] ?? createInitialCardState(qId);
    const updated = { ...existing, notes: n, code: c };
    await saveCardState(updated);
    setCardStates(prev => ({ ...prev, [qId]: updated }));
    setSaving(false);
  }, []);
  const debouncedSave = useDebounce(persistNoteCode, 400);

  // ── Answer ───────────────────────────────────────────────────────────

  const handleAnswer = useCallback(async (knew: boolean) => {
    if (answeringRef.current || !currentQIdRef.current) return;
    const q = questionsRef.current.find(x => x.id === currentQIdRef.current);
    if (!q) return;
    setAnswering(true);
    const elapsed = timer.stop();
    setResultFlash(knew ? "know" : "dontknow");
    setSessionStats(prev => knew ? { ...prev, know: prev.know + 1 } : { ...prev, dontknow: prev.dontknow + 1 });
    const existing = cardStatesRef.current[q.id] ?? createInitialCardState(q.id);
    const updated = updateCardState(
      { ...existing, notes: notesRef.current, code: codeRef.current },
      knew, elapsed, settingsRef.current?.sr,
    );
    await saveCardState(updated);
    const newCS = { ...cardStatesRef.current, [q.id]: updated };
    setCardStates(newCS);
    await new Promise(r => setTimeout(r, 500));
    setResultFlash(null); resetDragStyle();
    if (sessionRef.current) advanceInBatch(newCS, sessionRef.current, q.id);
    setAnswering(false);
  }, [timer, advanceInBatch]);

  // ── Skip ─────────────────────────────────────────────────────────────

  const handleSkipOption = useCallback(async (option: "back" | "remove" | "snooze", snoozeHours?: number) => {
    if (answeringRef.current || !currentQIdRef.current) return;
    const batch = batchQueueRef.current;
    const idx   = batchIndexRef.current;

    let newBatch: Question[];
    if (option === "back") {
      newBatch = [...batch.slice(0, idx), ...batch.slice(idx + 1), batch[idx]];
    } else {
      newBatch = [...batch.slice(0, idx), ...batch.slice(idx + 1)];
      const hours = option === "remove" ? 87_600 : snoozeHours ?? 0;
      if (hours > 0) {
        const q = questionsRef.current.find(x => x.id === currentQIdRef.current);
        if (q) {
          const existing = cardStatesRef.current[q.id] ?? createInitialCardState(q.id);
          const updated = { ...existing, nextDueAt: new Date(Date.now() + hours * 3_600_000).toISOString() };
          await saveCardState(updated);
          setCardStates(prev => ({ ...prev, [q.id]: updated }));
        }
      }
    }

    setBatchQueue(newBatch);

    if (newBatch.length === 0 || idx >= newBatch.length) {
      setSessionDone(true); setCurrentQ(null); currentQIdRef.current = null; timer.stop(); return;
    }

    const next = newBatch[idx];
    setCurrentQ(next); setFlipped(false); setHasFlippedOnce(false); setModalOpen(false);
    setResultFlash(null); resetDragStyle();
    currentQIdRef.current = next.id;
    const st = cardStatesRef.current[next.id];
    setNotes(st?.notes ?? ""); setCode(st?.code ?? "");
    timer.start();
  }, [timer]);

  // ── AI generation ────────────────────────────────────────────────────

  const generateAI = useCallback(async (type: "notes" | "code") => {
    const q = questionsRef.current.find(x => x.id === currentQIdRef.current);
    if (!q) return;
    setAiError(null);
    if (type === "notes") setAiLoadingNotes(true); else setAiLoadingCode(true);
    try {
      const res = await fetch("/api/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, questionTitle: q.title, questionDescription: q.description, examples: q.examples, constraints: q.constraints, tags: q.tags, difficulty: q.difficulty }),
      });
      const data = await res.json();
      if (data.error) { setAiError(data.error); }
      else if (type === "notes") { setNotes(data.result); debouncedSave(data.result, codeRef.current); }
      else { setCode(data.result); debouncedSave(notesRef.current, data.result); }
    } catch (e: any) { setAiError(e.message); }
    if (type === "notes") setAiLoadingNotes(false); else setAiLoadingCode(false);
  }, [debouncedSave]);

  // ── Swipe / drag system ──────────────────────────────────────────────
  //
  // Mouse events use React pointer handlers (desktop).
  // Touch events are registered imperatively with { passive: false } so
  // we can call preventDefault() to steal horizontal swipes from children.

  const applyDragStyle = (dx: number) => {
    const el = cardWrapRef.current;
    if (!el) return;
    el.style.transform = `translateX(${dx}px) rotate(${(dx / SWIPE_THRESHOLD) * 18}deg)`;
    dragXRef.current = dx;
    const tintKnow = document.getElementById("swipe-tint-know");
    const tintDont = document.getElementById("swipe-tint-dont");
    if (tintKnow) tintKnow.style.background = dx > 30 ? `rgba(46,204,113,${Math.min((dx / SWIPE_THRESHOLD) * 0.22, 0.22)})` : "transparent";
    if (tintDont) tintDont.style.background = dx < -30 ? `rgba(255,71,87,${Math.min((-dx / SWIPE_THRESHOLD) * 0.22, 0.22)})` : "transparent";
    if (knowLabelRef.current) knowLabelRef.current.style.opacity = dx > 30 ? String(Math.min((dx / SWIPE_THRESHOLD) * 1.5, 1)) : "0";
    if (dontLabelRef.current) dontLabelRef.current.style.opacity = dx < -30 ? String(Math.min((-dx / SWIPE_THRESHOLD) * 1.5, 1)) : "0";
  };

  const resetDragStyle = () => {
    const el = cardWrapRef.current;
    if (!el) return;
    el.style.transform = "";
    dragXRef.current = 0;
    const tintKnow = document.getElementById("swipe-tint-know");
    const tintDont = document.getElementById("swipe-tint-dont");
    if (tintKnow) tintKnow.style.background = "transparent";
    if (tintDont) tintDont.style.background = "transparent";
    if (knowLabelRef.current) knowLabelRef.current.style.opacity = "0";
    if (dontLabelRef.current) dontLabelRef.current.style.opacity = "0";
  };

  const finishDrag = (finalDx: number) => {
    isDraggingRef.current = false;
    dragStartX.current = null;
    dragStartY.current = null;
    dragIsHoriz.current = null;
    setIsDragging(false);
    if (Math.abs(finalDx) >= SWIPE_THRESHOLD) {
      handleAnswer(finalDx > 0);
    } else {
      resetDragStyle();
    }
  };

  const handleAnswerRef = useRef(handleAnswer);
  handleAnswerRef.current = handleAnswer;

  useEffect(() => {
    const el = cardWrapRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (answeringRef.current) return;
      const t = e.touches[0];
      dragStartX.current = t.clientX;
      dragStartY.current = t.clientY;
      dragIsHoriz.current = null;
      isDraggingRef.current = false;
      dragXRef.current = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (dragStartX.current === null) return;
      const t = e.touches[0];
      const dx = t.clientX - dragStartX.current;
      const dy = t.clientY - (dragStartY.current ?? t.clientY);

      if (dragIsHoriz.current === null) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        dragIsHoriz.current = Math.abs(dx) > Math.abs(dy);
        if (!dragIsHoriz.current) {
          dragStartX.current = null;
          dragStartY.current = null;
          return;
        }
        isDraggingRef.current = true;
        setIsDragging(true);
      }

      if (dragIsHoriz.current) {
        e.preventDefault();
        applyDragStyle(dx);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isDraggingRef.current) {
        const startX = dragStartX.current;
        const startY = dragStartY.current;
        dragStartX.current = null;
        dragStartY.current = null;
        dragIsHoriz.current = null;
        if (startX === null) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - (startY ?? t.clientY);
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
          const target = e.target as HTMLElement;
          if (!target.closest("button, a, textarea, input, .cm-editor, .cm-content, [data-no-drag]")) {
            setFlipped(f => { if (!f) setHasFlippedOnce(true); return !f; });
          }
        }
        return;
      }
      finishDrag(dragXRef.current);
    };

    el.addEventListener("touchstart",  onTouchStart,  { passive: true });
    el.addEventListener("touchmove",   onTouchMove,   { passive: false });
    el.addEventListener("touchend",    onTouchEnd,    { passive: true });
    el.addEventListener("touchcancel", () => {
      isDraggingRef.current = false;
      dragStartX.current = null;
      dragStartY.current = null;
      resetDragStyle();
      setIsDragging(false);
    }, { passive: true });

    return () => {
      el.removeEventListener("touchstart",  onTouchStart as EventListener);
      el.removeEventListener("touchmove",   onTouchMove  as EventListener);
      el.removeEventListener("touchend",    onTouchEnd   as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ?.id]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" || answering) return;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    dragIsHoriz.current = null;
    isDraggingRef.current = false;
    dragXRef.current = 0;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" || dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    const dy = e.clientY - (dragStartY.current ?? e.clientY);
    if (dragIsHoriz.current === null) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      dragIsHoriz.current = Math.abs(dx) > Math.abs(dy);
      if (!dragIsHoriz.current) { dragStartX.current = null; dragStartY.current = null; return; }
      isDraggingRef.current = true;
      setIsDragging(true);
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    }
    if (dragIsHoriz.current) { e.preventDefault(); applyDragStyle(dx); }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const wasDragging = isDraggingRef.current;
    const startX = dragStartX.current;
    const startY = dragStartY.current;
    if (wasDragging) { finishDrag(dragXRef.current); return; }
    isDraggingRef.current = false;
    dragStartX.current = null;
    dragStartY.current = null;
    if (startX === null) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - (startY ?? e.clientY);
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      const target = e.target as HTMLElement;
      if (!target.closest("button, a, textarea, input, .cm-editor, .cm-content, [data-no-drag]")) {
        setFlipped(f => { if (!f) setHasFlippedOnce(true); return !f; });
      }
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────

  const totalSess    = sessionStats.know + sessionStats.dontknow;
  const batchSize    = batchQueue.length;
  const batchProgress = batchSize > 0 ? Math.round((batchIndex / batchSize) * 100) : 0;

  // ── Loading ──────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 120 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ marginBottom: 12, color: "var(--purple)" }}><Brain size={48} /></div>
        <p style={{ color: "var(--text-dim)", fontWeight: 700, fontSize: 16 }}>Loading your deck…</p>
      </div>
    </div>
  );

  // ── Session done / empty ─────────────────────────────────────────────

  if (sessionDone || (!currentQ && !loading)) {
    return (
      <SessionDoneScreen
        sessionDone={sessionDone}
        batchSize={batchSize}
        sessionStats={sessionStats}
        settings={settings}
        questions={questions}
        cardStates={cardStates}
        session={session}
        onContinue={() => {
          if (settings) {
            setSessionStats({ know: 0, dontknow: 0 });
            startBatch(questions, cardStatesRef.current, settings);
          }
        }}
      />
    );
  }

  if (!currentQ) return null;
  const cardState = cardStates[currentQ.id];

  // ── Main render ──────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "20px 16px 80px", userSelect: "none" }}>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--green-lt)", borderRadius: 20, padding: "5px 12px" }}>
            <CheckCircle2 size={13} style={{ color: "var(--green-dk)" }} />
            <span style={{ fontWeight: 900, color: "var(--green-dk)", fontSize: 14 }}>{sessionStats.know}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--red-lt)", borderRadius: 20, padding: "5px 12px" }}>
            <XCircle size={13} style={{ color: "var(--red-dk)" }} />
            <span style={{ fontWeight: 900, color: "var(--red-dk)", fontSize: 14 }}>{sessionStats.dontknow}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {saving && <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>Saving…</span>}
          <span className="timer">{timer.formatted}</span>
          <button className="btn btn-ghost" onClick={() => setQueueOpen(true)} style={{ padding: "6px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <List size={14} />
            <span style={{ background: "var(--purple)", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 900, padding: "1px 6px", marginLeft: 4 }}>
              {batchSize - batchIndex}
            </span>
          </button>
          <button className="btn btn-ghost" onClick={() => setInfoOpen(true)} style={{ padding: "6px 10px", fontSize: 14, fontWeight: 900, color: "var(--text-dim)", display: "inline-flex", alignItems: "center" }}>
            <Info size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div className="progress-strip">
          <div className="progress-strip-fill" style={{ width: `${batchProgress}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginTop: 4 }}>
          <span>{batchIndex} / {batchSize}</span>
          <span>{batchProgress}%</span>
        </div>
      </div>

      <FlashCard
        cardWrapRef={cardWrapRef}
        knowLabelRef={knowLabelRef}
        dontLabelRef={dontLabelRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          if (isDraggingRef.current) { setIsDragging(false); resetDragStyle(); }
          isDraggingRef.current = false;
          dragStartX.current = null;
          dragStartY.current = null;
        }}
        isDragging={isDragging}
        flipped={flipped}
        hasFlippedOnce={hasFlippedOnce}
        currentQ={currentQ}
        cardState={cardState}
        notes={notes}
        onNotesChange={n => { setNotes(n); debouncedSave(n, codeRef.current); }}
        hasAiKey={hasAiKey}
        aiLoadingNotes={aiLoadingNotes}
        aiError={aiError}
        onGenerateNotes={() => generateAI("notes")}
        onClearAiError={() => setAiError(null)}
        onOpenModal={() => setModalOpen(true)}
      />

      <AnswerButtons
        onAnswer={handleAnswer}
        answering={answering}
        batchIndex={batchIndex}
        batchSize={batchSize}
      />

      <SkipMenu
        answering={answering}
        hasMoreCards={batchQueue.length - batchIndex > 1}
        onSkipOption={handleSkipOption}
      />

      {/* Result flash */}
      {resultFlash && (
        <div className="result-overlay">
          <div className="result-pill" style={resultFlash === "know"
            ? { background: "var(--green-lt)", color: "var(--green-dk)", borderColor: "var(--green-dk)" }
            : { background: "var(--red-lt)", color: "var(--red-dk)", borderColor: "var(--red-dk)" }
          }>
            {resultFlash === "know" ? "Nice work!" : "Keep going!"}
          </div>
        </div>
      )}

      <SolutionPanel
        flipped={flipped}
        hasFlippedOnce={hasFlippedOnce}
        code={code}
        onCodeChange={c => { setCode(c); debouncedSave(notesRef.current, c); }}
        hasAiKey={hasAiKey}
        aiLoadingCode={aiLoadingCode}
        onGenerateCode={() => generateAI("code")}
      />

      {/* Modals & Drawers */}
      {modalOpen && <ProblemModal question={currentQ} onClose={() => setModalOpen(false)} />}

      {queueOpen && settings && session && (
        <QueueDrawer
          upcoming={batchQueue.slice(batchIndex + 1)}
          completed={batchQueue.slice(0, batchIndex)}
          cardStates={cardStates}
          session={session}
          onClose={() => setQueueOpen(false)}
          onSelect={q => { setQueueOpen(false); if (sessionRef.current) injectCard(q, sessionRef.current); }}
        />
      )}

      {infoOpen && (
        <InfoDrawer
          settings={settings}
          onClose={() => setInfoOpen(false)}
          onOpenGlobalQueue={() => {
            setInfoOpen(false);
            getLearnSession().then(sess => setSession(sess));
            setGlobalQueueOpen(true);
          }}
        />
      )}

      {globalQueueOpen && settings && session && (
        <GlobalQueueDrawer
          questions={questions}
          cardStates={cardStates}
          settings={settings}
          session={session}
          localBatchIds={new Set(batchQueue.map(q => q.id))}
          onClose={() => setGlobalQueueOpen(false)}
        />
      )}
    </div>
  );
}
