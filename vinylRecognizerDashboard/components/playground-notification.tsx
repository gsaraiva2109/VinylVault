"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Check, Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaygroundSetupModalProps {
  playgroundInfo: {
    expiresAt: string | null;
    editUrl: string;
    claimUrl: string | null;
  };
  envs: Record<string, { isValid: boolean; name: string; label: string }>;
}

export function PlaygroundSetupModal({ playgroundInfo, envs }: PlaygroundSetupModalProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [open, setOpen] = useState(false);

  // Convert envs object to EnvCheckResult array
  const envResults = Object.values(envs);

  const validCount = envResults.filter((env) => env.isValid).length;
  const allValid = validCount === envResults.length;
  const hasPlaygroundExpiry = !!playgroundInfo.expiresAt;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    if (open) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [open]);

  const formatTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return "expired";
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return "expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days} day${days !== 1 ? "s" : ""}, ${hours} hour${hours !== 1 ? "s" : ""}`;
    }
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  };

  if (isDismissed) return null;

  // Show if playground has expiry OR environment variables are missing
  const shouldShow = !allValid;

  if (!shouldShow) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[999] flex items-start justify-end p-4">
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={cn(
          "absolute inset-0 transition-all duration-200",
          open ? "pointer-events-auto bg-black/30 opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "pointer-events-auto absolute right-4 top-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[--border] bg-[--text-primary] px-4 text-center text-sm font-medium text-white shadow-sm outline-none transition-all duration-200 hover:bg-[--text-secondary]",
          open && "pointer-events-none scale-95 opacity-20",
        )}
      >
        {hasPlaygroundExpiry ? (
          <Clock className="h-4 w-4 text-white" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-white" />
        )}
        <span className={cn("text-base text-white")}>Site Setup</span>
      </button>
      {/* Modal */}
      <div
        className={cn(
          "border-1 pointer-events-auto absolute right-4 top-16 flex w-[500px] origin-top flex-col rounded-xl border-solid border-[--border] bg-[--surface-primary] shadow-xl outline-none transition-all duration-200",
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-2 scale-95 opacity-0",
        )}
        style={{ maxHeight: "500px" }}
      >
        <div className="flex flex-shrink-0 items-center justify-between rounded-t-xl border-b border-dashed border-[--border] bg-[--surface-secondary] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={cn("text-base font-semibold text-[--text-primary]")}>Site Setup</span>
          </div>
          <a
            href={playgroundInfo.editUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-7 items-center gap-2 rounded-lg border border-[--border] bg-[--text-primary] px-3 text-sm font-medium text-[--text-on-accent-primary] shadow-sm outline-none transition-all duration-200 hover:bg-[--text-secondary] focus:ring-2 focus:ring-[--grayscale-400] focus:ring-offset-1"
          >
            <ExternalLink className="h-4 w-4" /> Open Playground
          </a>
        </div>

        <div className="flex-1 overflow-y-auto">
          {playgroundInfo.expiresAt && (
            <div className="border-b border-[--border] bg-[--surface-secondary] p-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 flex-shrink-0 text-[--text-secondary]" />
                  <div className="flex-1">
                    <h3 className="mb-1 text-sm font-medium text-[--text-primary]">
                      This playground expires in{" "}
                      <span className="font-medium">
                        {formatTimeRemaining(playgroundInfo.expiresAt)}.{" "}
                        {playgroundInfo.claimUrl && (
                          <a
                            href={playgroundInfo.claimUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-[--text-secondary] hover:text-[--text-primary]"
                          >
                            Claim it.
                          </a>
                        )}
                      </span>
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Environment Variables List */}
          {!allValid && (
            <div className="bg-[--surface-primary]">
              <div className="space-y-3 p-4">
                {envResults.map((env, index) => (
                  <div
                    key={env.name}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-[--border] bg-[--surface-secondary] p-3 transition-all duration-200",
                      open && `duration-300 animate-in slide-in-from-bottom-2`,
                    )}
                    style={{
                      animationDelay: open ? `${index * 50}ms` : "0ms",
                      animationFillMode: "both",
                    }}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm transition-colors duration-150",
                        env.isValid
                          ? "bg-[--surface-tertiary] text-[--text-primary]"
                          : "bg-[--grayscale-200] text-[--text-secondary]",
                      )}
                    >
                      {env.isValid ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[--text-primary]">{env.label}</div>
                      <div className="truncate font-mono text-xs text-[--text-tertiary]">
                        {env.name}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "text-xs font-medium",
                        env.isValid ? "text-[--text-secondary]" : "text-[--text-tertiary]",
                      )}
                    >
                      {env.isValid ? "Set" : "Missing"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <div className="flex-shrink-0 rounded-b-xl border-t border-[--border] bg-[--surface-secondary] p-4">
          <button
            onClick={() => setIsDismissed(true)}
            className="w-full rounded-lg border border-[--border] bg-[--surface-primary] px-4 py-2 text-sm font-medium text-[--text-secondary] transition-colors duration-150 hover:bg-[--surface-tertiary]"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
