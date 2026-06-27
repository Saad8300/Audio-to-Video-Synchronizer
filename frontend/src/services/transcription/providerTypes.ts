/**
 * Transcription provider type definitions (SyncFrame Studio standalone).
 */

export type TranscriptionStatus =
  | 'idle'
  | 'preparing'
  | 'loading_model'
  | 'processing'
  | 'aligning'
  | 'formatting'
  | 'complete'
  | 'error';

export type ProgressCallback = (
  status: TranscriptionStatus,
  message: string,
  progress?: number
) => void;

export interface TranscriptionSegment {
  id: number;
  start: number;    // seconds
  end: number;      // seconds
  text: string;
}

export interface TranscriptionResult {
  segments: TranscriptionSegment[];
  fullText: string;
  language: string;
  durationSeconds: number;
}

export interface TranscriptionProvider {
  id: string;
  name: string;
  isAvailable(): Promise<boolean>;
  transcribe(
    audioFile: File,
    language: string,
    onProgress: ProgressCallback
  ): Promise<TranscriptionResult>;
}
