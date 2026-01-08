/**
 * Types for voice transcription and query handling
 */

export interface TranscriptionResponse {
  transcript: string;
  curated_prompt: string;
  confidence: number | null;
  language: string | null;
  duration_seconds: number | null;
}

export interface VoiceServiceStatus {
  available: boolean;
  provider: string;
  message: string;
}

export interface VoiceQuery {
  id: string;
  timestamp: Date;
  transcript: string;
  curated_prompt: string;
  status: "pending" | "processing" | "complete" | "error";
  error?: string;
}

