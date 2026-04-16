"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });

interface Props {
  flipped: boolean;
  hasFlippedOnce: boolean;
  code: string;
  onCodeChange: (c: string) => void;
  hasAiKey: boolean;
  aiLoadingCode: boolean;
  onGenerateCode: () => void;
}

export default function SolutionPanel({
  flipped, hasFlippedOnce, code, onCodeChange,
  hasAiKey, aiLoadingCode, onGenerateCode,
}: Props) {
  const [langModules, setLangModules] = useState<{ python: any; oneDark: any } | null>(null);

  useEffect(() => {
    Promise.all([import("@codemirror/lang-python"), import("@codemirror/theme-one-dark")])
      .then(([py, th]) => setLangModules({ python: py.python, oneDark: th.oneDark }));
  }, []);

  return (
    <div style={{
      marginTop: 24,
      display: "grid",
      gridTemplateRows: flipped ? "1fr" : "0fr",
      opacity: flipped ? 1 : 0,
      transition: "grid-template-rows 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease",
    }}>
      <div style={{ overflow: "hidden", paddingBottom: flipped ? 8 : 0, transition: "padding-bottom 0.4s" }}>
        <div className="card-surface" style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Solution
            </span>
            {hasAiKey && (
              <button
                onClick={onGenerateCode}
                disabled={aiLoadingCode}
                style={{
                  fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: 11,
                  padding: "4px 10px", borderRadius: 20, cursor: "pointer",
                  border: "2px solid var(--purple)", background: "var(--purple-lt)", color: "var(--purple)",
                  opacity: aiLoadingCode ? 0.6 : 1,
                }}
              >
                {aiLoadingCode
                  ? "Generating…"
                  : <><Sparkles size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />AI Generate</>}
              </button>
            )}
          </div>

          {hasFlippedOnce && langModules ? (
            <div style={{ border: "2px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              <CodeMirror
                value={code}
                onChange={onCodeChange}
                extensions={[langModules.python()]}
                theme={langModules.oneDark}
                basicSetup={{ lineNumbers: true, foldGutter: false }}
                placeholder="Write your solution here…"
                minHeight="120px"
                style={{ fontSize: 12 }}
              />
            </div>
          ) : (
            <textarea
              value={code}
              onChange={e => onCodeChange(e.target.value)}
              placeholder={hasFlippedOnce ? "Write your solution…" : "Flip the card to write your solution"}
              style={{ width: "100%", minHeight: 120, padding: "10px 14px", fontSize: 12, fontFamily: "var(--font-mono)", lineHeight: 1.6, resize: "vertical" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
