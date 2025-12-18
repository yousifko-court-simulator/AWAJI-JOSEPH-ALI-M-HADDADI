
import React from "react";
import { Step } from "../types/simulation";

const steps: { key: Step; label: string }[] = [
  { key: "ROLE", label: "اختيار الصفة" },
  { key: "CASE_DATA", label: "بيانات القضية" },
  { key: "ANALYSIS", label: "التحليل" },
  { key: "SESSION", label: "المحاكمة" },
  { key: "JUDGMENT", label: "صك الحكم" },
];

export function StepBar(props: {
  current: Step;
  canGo: (s: Step) => boolean;
  onGo: (s: Step) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {steps.map((s) => {
        const active = s.key === props.current;
        const enabled = props.canGo(s.key);
        return (
          <button
            key={s.key}
            onClick={() => enabled && props.onGo(s.key)}
            disabled={!enabled}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #ddd",
              cursor: enabled ? "pointer" : "not-allowed",
              opacity: enabled ? 1 : 0.5,
              background: active ? "#111" : "#fff",
              color: active ? "#fff" : "#111",
              fontWeight: 700,
            }}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
