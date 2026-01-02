import { useEffect, useCallback } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MicButtonProps {
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
  disabled?: boolean;
  isListening?: boolean;
}

export function MicButton({
  onHoldStart,
  onHoldEnd,
  disabled = false,
  isListening = false,
}: MicButtonProps) {
  // Handle spacebar press/release
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if disabled, already listening, or if user is typing in an input
      if (disabled || isListening) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        onHoldStart?.();
      }
    },
    [disabled, isListening, onHoldStart]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        onHoldEnd?.();
      }
    },
    [onHoldEnd]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50">
            {/* Ambient glow */}
            <div
              className={cn(
                "absolute inset-0 rounded-full blur-md transition-all duration-500",
                isListening
                  ? "bg-destructive/40 scale-150"
                  : disabled
                  ? "bg-muted/20 scale-100"
                  : "bg-primary/30 scale-125"
              )}
            />

            {/* Pulse rings when listening */}
            {isListening && (
              <>
                <div className="absolute inset-0 rounded-full bg-destructive/30 animate-ping" />
                <div
                  className="absolute inset-0 rounded-full bg-destructive/20 animate-ping"
                  style={{ animationDelay: "150ms" }}
                />
              </>
            )}

            <Button
              size="icon"
              onPointerDown={() => !disabled && onHoldStart?.()}
              onPointerUp={() => onHoldEnd?.()}
              onPointerLeave={() => isListening && onHoldEnd?.()}
              disabled={disabled}
              className={cn(
                "relative h-[72px] w-[72px] rounded-full shadow-2xl transition-all duration-300",
                "hover:scale-110 hover:shadow-[0_0_40px_rgba(0,122,255,0.4)]",
                "bg-primary hover:bg-primary/90",
                isListening &&
                  "bg-destructive hover:bg-destructive/90 animate-pulse shadow-[0_0_40px_rgba(255,0,0,0.4)]",
                disabled &&
                  "opacity-40 cursor-not-allowed hover:scale-100 hover:shadow-2xl"
              )}
            >
              <Mic
                className={cn(
                  "!w-6 !h-6 text-white",
                  isListening && "text-white"
                )}
              />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={16}>
          <p>{disabled ? "Load data first" : "Hold Space to speak"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
