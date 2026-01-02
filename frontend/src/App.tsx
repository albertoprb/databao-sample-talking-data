import { useState, useCallback, useEffect, useRef } from "react";
import { Github, Globe, ChevronDown, RotateCcw } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { FileDropZone, type DroppedFile } from "@/components/FileDropZone";
import { MicButton } from "@/components/MicButton";
import { ScanningAnimation } from "@/components/ScanningAnimation";
import { DataAnalysisResults } from "@/components/DataAnalysisResults";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useDataAnalysis } from "@/hooks/useDataAnalysis";
import { cn } from "@/lib/utils";

type AppState = "idle" | "scanning" | "analyzing" | "results";

// Open URL in system default browser
const openExternal = (url: string) => {
  openUrl(url).catch(console.error);
};

function App() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [currentFileName, setCurrentFileName] = useState<string>("");
  const [currentFilePath, setCurrentFilePath] = useState<string>("");
  const [isListening, setIsListening] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { analysis, isAnalyzing, analyzeFile, resetAnalysis } =
    useDataAnalysis();

  // Update app state based on analysis progress
  useEffect(() => {
    if (isAnalyzing && !analysis.overview) {
      setAppState("scanning");
    } else if (isAnalyzing || analysis.currentStep) {
      setAppState("analyzing");
    } else if (analysis.overview && !isAnalyzing) {
      setAppState("results");
    }
  }, [isAnalyzing, analysis.overview, analysis.currentStep]);

  // Scroll to results when they start appearing
  useEffect(() => {
    if (analysis.overview && resultsRef.current) {
      const timer = setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [analysis.overview]);

  const handleFilesDropped = useCallback(
    async (files: DroppedFile[]) => {
      if (files.length === 0) return;

      const file = files[0];
      setCurrentFileName(file.name);
      setCurrentFilePath(file.path);

      toast.success(`File received: ${file.name}`, {
        description: "Starting analysis...",
      });

      // Reset any previous analysis and start new one
      resetAnalysis();
      setAppState("scanning");

      // Start the streaming analysis
      analyzeFile(file.path);
    },
    [analyzeFile, resetAnalysis]
  );

  const handleNewFile = useCallback(() => {
    setAppState("idle");
    setCurrentFileName("");
    setCurrentFilePath("");
    resetAnalysis();
  }, [resetAnalysis]);

  const handleReanalyze = useCallback(() => {
    if (currentFilePath) {
      resetAnalysis();
      setAppState("scanning");
      analyzeFile(currentFilePath);
    }
  }, [currentFilePath, analyzeFile, resetAnalysis]);

  const handleMicHoldStart = useCallback(() => {
    if (appState !== "results") {
      toast.error("Please load data first", {
        description: "Drop a file to start analyzing",
      });
      return;
    }

    setIsListening(true);
    toast.info("Listening...", {
      description: "Release to stop",
    });
  }, [appState]);

  const handleMicHoldEnd = useCallback(() => {
    if (isListening) {
      setIsListening(false);
      toast.info("Voice input coming soon", {
        description: "This feature is under development",
      });
    }
  }, [isListening]);

  const isProcessing = appState === "scanning" || appState === "analyzing";

  // Get current scanning stage for animation
  const getScanningStage = () => {
    if (appState === "scanning") return "scanning";
    if (
      analysis.currentStep === "overview" ||
      analysis.currentStep === "schema"
    )
      return "scanning";
    if (
      analysis.currentStep === "sample" ||
      analysis.currentStep === "statistics"
    )
      return "analyzing";
    if (analysis.currentStep === "nulls") return "generating";
    return "scanning";
  };

  return (
    <main className="relative min-h-screen bg-background">
      {/* Floating link icons */}
      <TooltipProvider>
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2">
          {appState === "results" && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-card/80 backdrop-blur-sm shadow-sm hover:bg-card hover:shadow-md transition-all"
                    onClick={handleNewFile}
                  >
                    <RotateCcw className="h-5 w-5 text-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Analyze New File</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-card/80 backdrop-blur-sm shadow-sm hover:bg-card hover:shadow-md transition-all"
                onClick={() => openExternal("https://databao.app")}
              >
                <Globe className="h-5 w-5 text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>databao.app</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-card/80 backdrop-blur-sm shadow-sm hover:bg-card hover:shadow-md transition-all"
                onClick={() =>
                  openExternal(
                    "https://github.com/JetBrains/data-tools-samples"
                  )
                }
              >
                <Github className="h-5 w-5 text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>GitHub Repository</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Main content */}
      <div
        className={cn("min-h-screen", appState === "results" ? "pb-32" : "")}
      >
        {appState === "idle" ? (
          <div className="flex items-center justify-center min-h-screen px-6">
            <div className="w-full max-w-2xl">
              <FileDropZone
                onFilesDropped={handleFilesDropped}
                isProcessing={false}
              />
            </div>
          </div>
        ) : isProcessing && !analysis.overview ? (
          <div className="flex items-center justify-center min-h-screen px-6">
            <div className="w-full max-w-2xl">
              <ScanningAnimation
                stage={getScanningStage()}
                fileName={currentFileName}
              />
            </div>
          </div>
        ) : appState === "results" || analysis.overview ? (
          <div className="px-6 py-8">
            {/* Header with file info */}
            <div className="max-w-5xl mx-auto mb-8">
              <div
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/30",
                  "animate-in fade-in-0 slide-in-from-top-4 duration-500"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="font-semibold text-foreground">
                      {currentFileName}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {analysis.isComplete
                        ? "Analysis complete"
                        : "Analyzing..."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {analysis.isComplete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReanalyze}
                      className="gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Re-analyze
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNewFile}
                    className="gap-2"
                  >
                    New File
                  </Button>
                </div>
              </div>

              {/* Scroll indicator when still analyzing */}
              {!analysis.isComplete && analysis.overview && (
                <div className="flex justify-center mt-4 animate-bounce">
                  <ChevronDown className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Results */}
            <div ref={resultsRef} className="max-w-5xl mx-auto">
              <DataAnalysisResults analysis={analysis} />
            </div>
          </div>
        ) : null}
      </div>

      {/* Floating mic button */}
      <MicButton
        onHoldStart={handleMicHoldStart}
        onHoldEnd={handleMicHoldEnd}
        disabled={isProcessing}
        isListening={isListening}
      />
    </main>
  );
}

export default App;
