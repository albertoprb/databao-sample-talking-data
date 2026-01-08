import { Mic, Loader2, Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VoiceQuery } from "@/types/voice";

interface VoiceQueryResultProps {
  query: VoiceQuery;
  className?: string;
}

/**
 * Displays a voice query result with the curated prompt.
 *
 * Shows the processing status and the refined prompt that would
 * be sent to the Databao agent.
 */
export function VoiceQueryResult({ query, className }: VoiceQueryResultProps) {
  const isProcessing = query.status === "processing" || query.status === "pending";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-6",
        "animate-in fade-in-0 slide-in-from-bottom-4 duration-500",
        isProcessing && "border-primary/50",
        query.status === "error" && "border-destructive/50",
        className
      )}
    >
      {/* Gradient background for active queries */}
      {isProcessing && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
      )}

      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                isProcessing && "bg-primary/10 animate-pulse",
                query.status === "complete" && "bg-emerald-500/10",
                query.status === "error" && "bg-destructive/10"
              )}
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : query.status === "error" ? (
                <Mic className="h-5 w-5 text-destructive" />
              ) : (
                <Sparkles className="h-5 w-5 text-emerald-500" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-foreground">
                {isProcessing ? "Processing voice query..." : "Voice Query"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {query.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Error state */}
        {query.status === "error" && query.error && (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {query.error}
          </div>
        )}

        {/* Raw transcript (collapsed/dimmed) */}
        {query.transcript && query.status === "complete" && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span>What you said:</span>
            </div>
            <p className="text-sm text-muted-foreground italic pl-5">
              "{query.transcript}"
            </p>
          </div>
        )}

        {/* Curated prompt (main focus) */}
        {query.curated_prompt && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              <span>Curated Query:</span>
            </div>
            <div
              className={cn(
                "rounded-lg bg-primary/5 px-4 py-3 border border-primary/20",
                "transition-all duration-300"
              )}
            >
              <p className="text-base font-medium text-foreground">
                {query.curated_prompt}
              </p>
            </div>
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && !query.curated_prompt && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex gap-1">
              <span
                className="h-2 w-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="h-2 w-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="h-2 w-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <span>Transcribing your voice...</span>
          </div>
        )}

        {/* Future: Agent response would go here */}
        {query.status === "complete" && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground italic">
              Agent response will appear here in the future
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface VoiceQueryListProps {
  queries: VoiceQuery[];
  className?: string;
}

/**
 * Displays a list of voice queries, newest first.
 */
export function VoiceQueryList({ queries, className }: VoiceQueryListProps) {
  if (queries.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {queries.map((query) => (
        <VoiceQueryResult key={query.id} query={query} />
      ))}
    </div>
  );
}

