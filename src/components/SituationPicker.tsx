"use client";

import { useState } from "react";
import { SITUATION_PROMPT } from "@/lib/frame";
import { SITUATIONS, SITUATION_LABEL, type Situation } from "@/lib/types";

// 인터뷰가 끝난 직후 뜨는 팝업. 채팅으로 다시 묻지 않고, 문구를 누르면 아래로 선택지가 펼쳐지고 그중 하나를 고른다.
export default function SituationPicker({
  onPick,
  busy,
  error,
}: {
  onPick: (s: Situation) => void;
  busy: boolean;
  error: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<Situation | null>(null);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="현재 상태 선택">
      <div className="modal-card fade-in">
        <div className="q-title" style={{ fontSize: 19, lineHeight: 1.5 }}>
          {SITUATION_PROMPT}
        </div>
        <div className="select-wrap">
          <button type="button" className={`select-box${open ? " open" : ""}${value ? " picked" : ""}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            <span>{value ? SITUATION_LABEL[value] : "여기를 눌러 골라 주세요"}</span>
            <span className="select-caret" aria-hidden="true">
              ▾
            </span>
          </button>
          {open && (
            <ul className="select-list" role="listbox">
              {SITUATIONS.map((k) => (
                <li key={k} role="option" aria-selected={value === k}>
                  <button
                    type="button"
                    className={`select-item${value === k ? " on" : ""}`}
                    onClick={() => {
                      setValue(k);
                      setOpen(false);
                    }}
                  >
                    {SITUATION_LABEL[k]}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && <div className="error-text">{error}</div>}
        <div style={{ height: 14 }} />
        <button className="btn-primary" disabled={!value || busy} onClick={() => value && onPick(value)}>
          {busy ? "저장하는 중…" : "다음으로"}
        </button>
      </div>
    </div>
  );
}
