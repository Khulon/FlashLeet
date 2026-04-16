"use client";

interface Props {
  onAnswer: (knew: boolean) => void;
  answering: boolean;
  batchIndex: number;
  batchSize: number;
}

export default function AnswerButtons({ onAnswer, answering, batchIndex, batchSize }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 48, marginTop: 20 }}>
      {/* Don't know */}
      <button
        onClick={() => onAnswer(false)}
        disabled={answering}
        style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "#fff", border: "2.5px solid var(--red)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 3px 0 var(--red-dk)",
          transition: "transform 0.1s, box-shadow 0.1s",
          opacity: answering ? 0.5 : 1,
        }}
        onMouseDown={e => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(2px)";
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }}
        onMouseUp={e => {
          (e.currentTarget as HTMLElement).style.transform = "";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 3px 0 var(--red-dk)";
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5 5L15 15M15 5L5 15" stroke="var(--red)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      <span style={{ fontWeight: 900, fontSize: 16, color: "var(--text-dim)", minWidth: 48, textAlign: "center" }}>
        {batchIndex + 1}/{batchSize}
      </span>

      {/* Know it */}
      <button
        onClick={() => onAnswer(true)}
        disabled={answering}
        style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "#fff", border: "2.5px solid #2ec4b6",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 3px 0 #1a9e92",
          transition: "transform 0.1s, box-shadow 0.1s",
          opacity: answering ? 0.5 : 1,
        }}
        onMouseDown={e => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(2px)";
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }}
        onMouseUp={e => {
          (e.currentTarget as HTMLElement).style.transform = "";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 3px 0 #1a9e92";
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 10L8.5 14.5L16 6" stroke="#2ec4b6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
