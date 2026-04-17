"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Maximize2, AlertTriangle } from "lucide-react";

interface FullscreenGuardProps {
  onExitDetected: () => void;
  warningThreshold?: number;
}

export function FullscreenGuard({ onExitDetected, warningThreshold = 3 }: FullscreenGuardProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [exitCount, setExitCount] = useState(0);

  const requestFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen().catch(() => {
      // Fullscreen might be blocked — that's okay
    });
    setShowWarning(false);
  }, []);

  useEffect(() => {
    // Request fullscreen on mount
    requestFullscreen();

    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        setShowWarning(true);
        setExitCount((c) => c + 1);
        onExitDetected();
      }
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [requestFullscreen, onExitDetected]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center space-y-5 border">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
          <AlertTriangle size={28} className="text-amber-600" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold">Fullscreen Required</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This exam requires fullscreen mode. Exiting fullscreen has been logged.
          </p>

          {exitCount >= warningThreshold && (
            <p className="text-sm text-red-600 font-medium">
              Warning: {exitCount} fullscreen exit{exitCount !== 1 ? "s" : ""} detected. Your
              session may be flagged.
            </p>
          )}
        </div>

        <Button onClick={requestFullscreen} className="w-full" size="lg">
          <Maximize2 size={15} />
          Return to Fullscreen
        </Button>
      </div>
    </div>
  );
}
