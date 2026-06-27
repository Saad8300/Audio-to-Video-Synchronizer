/**
 * Output formatter service.
 * Converts raw transcription segments into the user's chosen output format.
 *
 * Supported formats:
 *  - simple:   [0:00] Text here
 *  - detailed: [0:00 - 0:04] Text here
 *  - scene:    Scene N / Time: / Line:
 *  - srt:      SRT subtitle format
 */

import type { TranscriptionSegment } from './providerTypes';

export type OutputMode = 'simple' | 'detailed' | 'scene' | 'srt' | 'csv';

export interface FormatOptions {
  mode: OutputMode;
  segments: TranscriptionSegment[];
}

// ─── Time Formatting Utilities ─────────────────────────────────────────────────

/**
 * Converts seconds to MM:SS format. e.g. 65 → "1:05"
 */
export function secondsToTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Converts seconds to SRT-compatible HH:MM:SS,mmm format.
 * e.g. 65.5 → "00:01:05,500"
 */
export function secondsToSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

/**
 * [0:00] Text here
 */
export function formatSimple(segments: TranscriptionSegment[]): string {
  return segments
    .map(seg => `[${secondsToTimestamp(seg.start)}] ${seg.text.trim()}`)
    .join('\n');
}

/**
 * [0:00 - 0:04] Text here
 */
export function formatDetailed(segments: TranscriptionSegment[]): string {
  return segments
    .map(seg => `[${secondsToTimestamp(seg.start)} - ${secondsToTimestamp(seg.end)}] ${seg.text.trim()}`)
    .join('\n');
}

/**
 * Scene 1
 * Time: 0:00 - 0:04
 * Line: Text here
 */
export function formatScene(segments: TranscriptionSegment[]): string {
  return segments
    .map((seg, i) =>
      `Scene ${i + 1}\nTime: ${secondsToTimestamp(seg.start)} - ${secondsToTimestamp(seg.end)}\nLine: ${seg.text.trim()}`
    )
    .join('\n\n');
}

/**
 * SRT caption format:
 * 1
 * 00:00:00,000 --> 00:00:04,000
 * Caption text
 */
export function formatSrt(segments: TranscriptionSegment[]): string {
  return segments
    .map((seg, i) =>
      `${i + 1}\n${secondsToSrtTime(seg.start)} --> ${secondsToSrtTime(seg.end)}\n${seg.text.trim()}`
    )
    .join('\n\n');
}

/**
 * Timeline CSV for SyncFrame Studio:
 * start,end,text
 * 0,4,"First line here"
 */
export function formatCsv(segments: TranscriptionSegment[]): string {
  const rows = segments.map(seg => {
    const safeText = seg.text.trim().replace(/"/g, '""');
    return `${seg.start.toFixed(2)},${seg.end.toFixed(2)},"${safeText}"`;
  });
  return ['start,end,text', ...rows].join('\n');
}

// ─── Main Formatter ───────────────────────────────────────────────────────────

/**
 * Routes to the correct formatter based on the selected output mode.
 */
export function formatOutput(options: FormatOptions): string {
  const { mode, segments } = options;

  switch (mode) {
    case 'simple':
      return formatSimple(segments);
    case 'detailed':
      return formatDetailed(segments);
    case 'scene':
      return formatScene(segments);
    case 'srt':
      return formatSrt(segments);
    case 'csv':
      return formatCsv(segments);
    default:
      return formatSimple(segments);
  }
}

/**
 * Returns a label for the output mode used in the UI.
 */
export function getOutputModeLabel(mode: OutputMode): string {
  const labels: Record<OutputMode, string> = {
    simple: 'Simple Timestamps',
    detailed: 'Detailed Timestamps',
    scene: 'Scene / Image Plan',
    srt: 'SRT Captions',
    csv: 'Timeline CSV',
  };
  return labels[mode] ?? 'Simple Timestamps';
}
