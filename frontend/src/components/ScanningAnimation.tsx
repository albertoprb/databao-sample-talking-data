import { cn } from "@/lib/utils";

interface ScanningAnimationProps {
  stage: "scanning" | "analyzing" | "generating" | "complete";
  fileName?: string;
}

const stages = {
  scanning: {
    title: "Scanning schema...",
    description: "Reading file structure and column types",
  },
  analyzing: {
    title: "Analyzing data...",
    description: "Computing statistics and distributions",
  },
  generating: {
    title: "Generating insights...",
    description: "AI is preparing analysis questions",
  },
  complete: {
    title: "Analysis complete",
    description: "Ready to explore your data",
  },
};

export function ScanningAnimation({ stage, fileName }: ScanningAnimationProps) {
  const { title, description } = stages[stage];
  const isComplete = stage === "complete";

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] p-8">
      {/* Animated orb */}
      <div className="relative mb-8">
        {/* Outer glow */}
        <div
          className={cn(
            "absolute inset-0 rounded-full blur-2xl transition-all duration-1000",
            isComplete ? "bg-accent/30 scale-100" : "bg-primary/20 scale-110"
          )}
        />

        {/* Main orb */}
        <div
          className={cn(
            "relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500",
            isComplete
              ? "bg-gradient-to-br from-accent/20 to-accent/5"
              : "bg-gradient-to-br from-primary/20 to-secondary/10"
          )}
        >
          {/* Spinning ring */}
          {!isComplete && (
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
          )}

          {/* Inner content */}
          <div
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center",
              isComplete
                ? "bg-accent/20"
                : "bg-gradient-to-br from-primary/30 to-secondary/20"
            )}
          >
            {/* Data visualization dots */}
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    isComplete ? "bg-accent" : "bg-primary"
                  )}
                  style={{
                    animation: isComplete
                      ? "none"
                      : `bounce 1s ease-in-out ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Orbiting particles */}
        {!isComplete && (
          <>
            <div
              className="absolute w-2 h-2 bg-primary/60 rounded-full"
              style={{
                animation: "orbit 3s linear infinite",
                top: "50%",
                left: "50%",
                transformOrigin: "0 -60px",
              }}
            />
            <div
              className="absolute w-1.5 h-1.5 bg-secondary/60 rounded-full"
              style={{
                animation: "orbit 4s linear infinite reverse",
                top: "50%",
                left: "50%",
                transformOrigin: "0 -70px",
              }}
            />
          </>
        )}
      </div>

      {/* Text content */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
        {fileName && (
          <p className="text-xs text-muted-foreground/60 mt-4">
            Processing: {fileName}
          </p>
        )}
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mt-8">
        {(["scanning", "analyzing", "generating", "complete"] as const).map(
          (s, i) => {
            const stageOrder = [
              "scanning",
              "analyzing",
              "generating",
              "complete",
            ];
            const currentIndex = stageOrder.indexOf(stage);
            const stepIndex = stageOrder.indexOf(s);
            const isActive = stepIndex <= currentIndex;

            return (
              <div key={s} className="flex items-center">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    isActive
                      ? stepIndex === currentIndex
                        ? "bg-primary scale-125"
                        : "bg-accent"
                      : "bg-muted"
                  )}
                />
                {i < 3 && (
                  <div
                    className={cn(
                      "w-8 h-0.5 transition-all duration-300",
                      stepIndex < currentIndex ? "bg-accent" : "bg-muted"
                    )}
                  />
                )}
              </div>
            );
          }
        )}
      </div>

      {/* Custom keyframes */}
      <style>{`
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(60px); }
          to { transform: rotate(360deg) translateX(60px); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
