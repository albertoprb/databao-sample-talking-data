import { useState, useCallback, useEffect, type DragEvent } from "react";
import { Upload, FileSpreadsheet, Database, Check } from "lucide-react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { open } from "@tauri-apps/plugin-dialog";
import { cn } from "@/lib/utils";

export interface DroppedFile {
  path: string;
  name: string;
}

interface FileDropZoneProps {
  onFilesDropped: (files: DroppedFile[]) => void;
  isProcessing?: boolean;
  acceptedFiles?: string[];
}

const ACCEPTED_EXTENSIONS = [".csv", ".parquet", ".json", ".db", ".duckdb"];

function filterByExtension(paths: string[], acceptedFiles: string[]): string[] {
  return paths.filter((path) => {
    const ext = "." + path.split(".").pop()?.toLowerCase();
    return acceptedFiles.includes(ext);
  });
}

function pathToDroppedFile(path: string): DroppedFile {
  const name = path.split(/[/\\]/).pop() || path;
  return { path, name };
}

export function FileDropZone({
  onFilesDropped,
  isProcessing = false,
  acceptedFiles = ACCEPTED_EXTENSIONS,
}: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([]);

  // Listen to Tauri's native drag-drop events for actual file paths
  useEffect(() => {
    const webview = getCurrentWebviewWindow();

    const unlisten = webview.onDragDropEvent((event) => {
      if (event.payload.type === "over") {
        setIsDragOver(true);
      } else if (event.payload.type === "leave") {
        setIsDragOver(false);
      } else if (event.payload.type === "drop") {
        setIsDragOver(false);
        const validPaths = filterByExtension(
          event.payload.paths,
          acceptedFiles
        );

        if (validPaths.length > 0) {
          const files = validPaths.map(pathToDroppedFile);
          setDroppedFiles(files);
          onFilesDropped(files);
        }
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [acceptedFiles, onFilesDropped]);

  // Prevent browser's default drag-drop behavior
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Actual handling is done by Tauri's native event listener
  }, []);

  const handleClick = useCallback(async () => {
    // Use Tauri's native file dialog to get actual file paths
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: "Data Files",
          extensions: ["csv", "parquet", "json", "db", "duckdb"],
        },
      ],
    });

    if (selected) {
      const paths = Array.isArray(selected) ? selected : [selected];
      const files = paths.map(pathToDroppedFile);
      setDroppedFiles(files);
      onFilesDropped(files);
    }
  }, [onFilesDropped]);

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={isProcessing ? undefined : handleClick}
      className={cn(
        "relative flex flex-col items-center justify-center w-full h-full min-h-[400px] rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer",
        isDragOver
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-border hover:border-primary/50 hover:bg-muted/30",
        isProcessing && "pointer-events-none opacity-60"
      )}
    >
      {/* Decorative background pattern */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl opacity-5">
        <div className="absolute -top-4 -right-4 w-32 h-32 bg-primary rounded-full blur-3xl" />
        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-accent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 p-8">
        {/* Icon */}
        <div
          className={cn(
            "p-6 rounded-full transition-all duration-300",
            isDragOver
              ? "bg-primary/20 scale-110"
              : "bg-muted group-hover:bg-primary/10"
          )}
        >
          {droppedFiles.length > 0 && !isProcessing ? (
            <Check className="w-12 h-12 text-accent" />
          ) : (
            <Upload
              className={cn(
                "w-12 h-12 transition-colors",
                isDragOver ? "text-primary" : "text-muted-foreground"
              )}
            />
          )}
        </div>

        {/* Text */}
        <div className="text-center space-y-2">
          <h3
            className={cn(
              "text-xl font-semibold transition-colors",
              isDragOver ? "text-primary" : "text-foreground"
            )}
          >
            {isDragOver
              ? "Release to drop files"
              : droppedFiles.length > 0
              ? `${droppedFiles.length} file(s) selected`
              : "Drop your data files here"}
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            {droppedFiles.length > 0
              ? droppedFiles.map((f) => f.name).join(", ")
              : "Supports CSV, Parquet, JSON files or DuckDB databases"}
          </p>
        </div>

        {/* Supported formats */}
        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-1.5 text-xs">
            <FileSpreadsheet className="w-4 h-4" />
            <span>CSV</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Parquet</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <FileSpreadsheet className="w-4 h-4" />
            <span>JSON</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Database className="w-4 h-4" />
            <span>DuckDB</span>
          </div>
        </div>

        {/* Click hint */}
        {!isDragOver && droppedFiles.length === 0 && (
          <p className="text-xs text-muted-foreground/60">
            or click to browse files
          </p>
        )}
      </div>
    </div>
  );
}
