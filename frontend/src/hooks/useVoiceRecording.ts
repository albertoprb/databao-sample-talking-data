import { useState, useCallback, useEffect } from "react";
import {
  startRecording as tauriStartRecording,
  stopRecording as tauriStopRecording,
} from "tauri-plugin-mic-recorder-api";
import { readFile } from "@tauri-apps/plugin-fs";
import type { TranscriptionResponse } from "@/types/voice";

const API_BASE = "http://127.0.0.1:8808";

// Logging helper for consistent format
const log = {
  info: (stage: string, message: string, data?: unknown) => {
    console.log(`[Voice] 🎤 ${stage}: ${message}`, data ?? "");
  },
  success: (stage: string, message: string, data?: unknown) => {
    console.log(`[Voice] ✅ ${stage}: ${message}`, data ?? "");
  },
  error: (stage: string, message: string, error?: unknown) => {
    console.error(`[Voice] ❌ ${stage}: ${message}`, error ?? "");
  },
  warn: (stage: string, message: string, data?: unknown) => {
    console.warn(`[Voice] ⚠️ ${stage}: ${message}`, data ?? "");
  },
};

type PermissionStatus =
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported"
  | "unknown";

interface UseVoiceRecordingOptions {
  onTranscriptionComplete?: (result: TranscriptionResponse) => void;
  onError?: (error: string) => void;
}

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  isProcessing: boolean;
  permissionStatus: PermissionStatus;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<TranscriptionResponse | null>;
  requestPermission: () => Promise<boolean>;
  error: string | null;
}

/**
 * Hook for recording audio using Tauri's mic-recorder plugin.
 *
 * This bypasses WebKitGTK's limitations on Linux by using native
 * Rust audio capture via the cpal library.
 */
export function useVoiceRecording(
  options: UseVoiceRecordingOptions = {}
): UseVoiceRecordingReturn {
  const { onTranscriptionComplete, onError } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus>("unknown");

  // Check if Tauri plugin is available on mount
  useEffect(() => {
    log.info("Init", "Voice recording hook initialized");
    setPermissionStatus("granted");
  }, []);

  /**
   * Request microphone permission (handled at OS level by Tauri plugin)
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    log.info("Permission", "Requesting microphone permission");
    setPermissionStatus("granted");
    setError(null);
    return true;
  }, []);

  const startRecording = useCallback(async () => {
    log.info("Start", "Starting recording...");

    try {
      setError(null);

      // Start recording using Tauri plugin
      log.info("Start", "Calling tauriStartRecording()");
      const result = await tauriStartRecording();
      log.success("Start", "Recording started successfully", { result });

      setIsRecording(true);
      setPermissionStatus("granted");
    } catch (err) {
      log.error("Start", "Failed to start recording", err);
      const message =
        err instanceof Error ? err.message : "Failed to start recording";
      setError(message);
      setPermissionStatus("denied");
      onError?.(message);
    }
  }, [onError]);

  const stopRecording =
    useCallback(async (): Promise<TranscriptionResponse | null> => {
      log.info("Stop", "Stopping recording...", { isRecording });

      if (!isRecording) {
        log.warn("Stop", "Not recording, nothing to stop");
        return null;
      }

      setIsRecording(false);

      try {
        // Stop recording - returns the path to the saved audio file
        log.info("Stop", "Calling tauriStopRecording()");
        const filePath = await tauriStopRecording();
        log.success("Stop", "Recording stopped", { filePath });

        if (!filePath) {
          const message = "No recording file created";
          log.error("Stop", message);
          setError(message);
          onError?.(message);
          return null;
        }

        setIsProcessing(true);

        // Read the audio file from disk
        log.info("Read", `Reading audio file: ${filePath}`);
        const audioData = await readFile(filePath);
        log.success("Read", "Audio file read successfully", {
          size: audioData.length,
          sizeKB: (audioData.length / 1024).toFixed(2) + " KB",
        });

        if (!audioData || audioData.length < 100) {
          const message = "Recording too short. Hold the button longer.";
          log.error("Read", message, { size: audioData?.length ?? 0 });
          setError(message);
          onError?.(message);
          return null;
        }

        // Convert Uint8Array to Blob (the plugin saves as WAV)
        const audioBlob = new Blob([audioData], { type: "audio/wav" });
        log.info("Upload", "Preparing to upload audio", {
          blobSize: audioBlob.size,
          type: audioBlob.type,
        });

        // Send to backend for transcription
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.wav");

        log.info("Upload", `Sending to ${API_BASE}/voice/transcribe`);
        const startTime = Date.now();

        const response = await fetch(`${API_BASE}/voice/transcribe`, {
          method: "POST",
          body: formData,
        });

        const elapsed = Date.now() - startTime;
        log.info("Upload", `Response received in ${elapsed}ms`, {
          status: response.status,
          ok: response.ok,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          log.error("Transcribe", "Backend returned error", {
            status: response.status,
            errorData,
          });
          throw new Error(
            errorData.detail || `Transcription failed: ${response.status}`
          );
        }

        const result: TranscriptionResponse = await response.json();
        log.success("Transcribe", "Transcription complete", {
          transcript: result.transcript?.substring(0, 50) + "...",
          curatedPrompt: result.curated_prompt?.substring(0, 50) + "...",
          confidence: result.confidence,
        });

        onTranscriptionComplete?.(result);
        return result;
      } catch (err) {
        log.error("Error", "Voice recording/transcription failed", err);
        const message =
          err instanceof Error ? err.message : "Transcription failed";
        setError(message);
        onError?.(message);
        return null;
      } finally {
        setIsProcessing(false);
        log.info("Done", "Voice recording flow complete");
      }
    }, [isRecording, onTranscriptionComplete, onError]);

  return {
    isRecording,
    isProcessing,
    permissionStatus,
    startRecording,
    stopRecording,
    requestPermission,
    error,
  };
}
