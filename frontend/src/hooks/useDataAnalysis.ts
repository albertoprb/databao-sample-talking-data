import { useState, useCallback } from "react";
import type {
  AnalysisState,
  AnalysisChunk,
  DataOverview,
  SchemaInfo,
  SampleData,
  StatisticalSummary,
  NullAnalysis,
} from "@/types/analysis";

const API_BASE = "http://127.0.0.1:8808";

const initialState: AnalysisState = {
  overview: null,
  schema: null,
  sample: null,
  statistics: null,
  nulls: null,
  isComplete: false,
  error: null,
  currentStep: null,
};

export function useDataAnalysis() {
  const [analysis, setAnalysis] = useState<AnalysisState>(initialState);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const resetAnalysis = useCallback(() => {
    setAnalysis(initialState);
    setIsAnalyzing(false);
  }, []);

  const analyzeFile = useCallback(async (filePath: string) => {
    setAnalysis(initialState);
    setIsAnalyzing(true);

    try {
      const response = await fetch(`${API_BASE}/analysis/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file_path: filePath }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to analyze file");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response reader");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6);
            if (jsonStr.trim()) {
              try {
                const chunk: AnalysisChunk = JSON.parse(jsonStr);
                
                setAnalysis((prev) => {
                  const next = { ...prev, currentStep: chunk.type };

                  switch (chunk.type) {
                    case "overview":
                      next.overview = chunk.data as DataOverview;
                      break;
                    case "schema":
                      next.schema = chunk.data as SchemaInfo;
                      break;
                    case "sample":
                      next.sample = chunk.data as SampleData;
                      break;
                    case "statistics":
                      next.statistics = chunk.data as StatisticalSummary;
                      break;
                    case "nulls":
                      next.nulls = chunk.data as NullAnalysis;
                      break;
                    case "complete":
                      next.isComplete = true;
                      next.currentStep = null;
                      break;
                    case "error":
                      next.error = chunk.message || "Unknown error";
                      next.currentStep = null;
                      break;
                  }

                  return next;
                });
              } catch (e) {
                console.error("Failed to parse chunk:", e);
              }
            }
          }
        }
      }
    } catch (err) {
      setAnalysis((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Unknown error",
        currentStep: null,
      }));
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return {
    analysis,
    isAnalyzing,
    analyzeFile,
    resetAnalysis,
  };
}

