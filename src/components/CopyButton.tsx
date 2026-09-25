"use client";

import { useState } from "react";

export default function CopyButton({ text, label = "복사하기" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn-ghost"
      style={{ width: "auto", padding: "10px 16px", fontSize: 13.5 }}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {}
      }}
    >
      {done ? "복사됐어요" : label}
    </button>
  );
}
