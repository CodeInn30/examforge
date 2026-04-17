"use client";

import { useEffect, useState, useRef } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface ExamTimerProps {
  totalSeconds: number;
  onExpire: () => void;
}

export function ExamTimer({ totalSeconds, onExpire }: ExamTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  // Tick down every second; never call onExpire inside the state updater
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fire onExpire in a separate effect, safely outside any render path
  useEffect(() => {
    if (remaining <= 0) {
      onExpireRef.current();
    }
  }, [remaining]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isUrgent = remaining < 60;

  return (
    <div
      className={`flex items-center gap-2 border rounded-xl px-3 py-2 transition-colors ${
        isUrgent
          ? "bg-red-50 border-red-300 text-red-700 animate-pulse"
          : "bg-muted border-border text-foreground"
      }`}
    >
      {isUrgent ? (
        <AlertTriangle size={14} className="shrink-0" />
      ) : (
        <Clock size={14} className="shrink-0" />
      )}

      <div className="flex items-end gap-0.5 font-mono font-bold text-sm leading-none">
        <div className="flex flex-col items-center">
          <span>{String(minutes).padStart(2, "0")}</span>
          <span className="text-[9px] tracking-widest block text-center opacity-60 font-sans font-normal mt-0.5">
            MIN
          </span>
        </div>
        <span className="pb-3 opacity-60">:</span>
        <div className="flex flex-col items-center">
          <span>{String(seconds).padStart(2, "0")}</span>
          <span className="text-[9px] tracking-widest block text-center opacity-60 font-sans font-normal mt-0.5">
            SEC
          </span>
        </div>
      </div>
    </div>
  );
}
