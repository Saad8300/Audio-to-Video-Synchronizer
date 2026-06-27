/**
 * Local Browser Transcription Provider
 * Uses @huggingface/transformers v3 to run Whisper in the browser.
 *
 * ─── Why these choices ────────────────────────────────────────────────────────
 *
 * Library version: @huggingface/transformers@3.5.2
 *   v4.x changed the API and broke Xenova/whisper model loading.
 *   v3.5.2 is the last stable release with confirmed browser Whisper support.
 *
 * Model: onnx-community/whisper-tiny
 *   The Xenova/whisper-tiny model was never updated for Transformers.js v3 dtypes.
 *   onnx-community/whisper-tiny IS maintained for v3 — it ships the correctly
 *   structured ONNX files (encoder_model_q4.onnx, decoder_model_merged_q4.onnx)
 *   that match what the v3 pipeline expects.
 *
 * dtype: 'q4'
 *   For onnx-community models, q4 is the correct and working dtype.
 *   It does NOT use MatMulNBits (which caused the original DequantizeLinear error).
 *   The Xenova/whisper-tiny q4 files DO use NBits — that's why they failed.
 *   onnx-community/whisper-tiny q4 files use standard INT4 — works correctly.
 *
 * dtype fallback chain: q4 → fp32
 *   fp32 is the absolute safe fallback (no quantization at all).
 */

import type {
  TranscriptionProvider,
  TranscriptionResult,
  ProgressCallback,
} from './providerTypes';

// ─── Model catalogue ──────────────────────────────────────────────────────────
export interface ModelDescriptor {
  id: string;
  label: string;
  description: string;
  languages: string;
  dtype: string;      // the dtype that actually works for this model
}

export const MODELS: Record<string, ModelDescriptor> = {
  multilingual: {
    id: 'onnx-community/whisper-tiny',
    label: 'Whisper Tiny (Multilingual)',
    description: '16 languages — English, Arabic, Hindi, Urdu, Spanish… ~38 MB',
    languages: 'auto / multi',
    dtype: 'q4',
  },
  english: {
    id: 'onnx-community/whisper-tiny.en',
    label: 'Whisper Tiny (English Only)',
    description: 'English-only, faster — ~38 MB',
    languages: 'en',
    dtype: 'q4',
  },
};

export const DEFAULT_MODEL_KEY = 'multilingual';

// ─── Singleton state ───────────────────────────────────────────────────────────
let pipelineInstance: unknown = null;
let loadedModelId: string | null = null;
let loadPromise: Promise<unknown> | null = null;

export let modelLoadAbortController: AbortController | null = null;

/** Reset the cached pipeline — required before retry or model switch */
export function resetPipelineCache(): void {
  pipelineInstance = null;
  loadedModelId    = null;
  loadPromise      = null;
  modelLoadAbortController = null;
}

/** Wipes all browser-side model caches: Cache API, IndexedDB, OPFS */
export async function clearBrowserModelCache(): Promise<boolean> {
  let cleared = false;

  // Cache API (Transformers.js primary store)
  try {
    for (const name of await caches.keys()) {
      await caches.delete(name);
      cleared = true;
    }
  } catch { /* not available */ }

  // IndexedDB (ONNX Runtime Web secondary store)
  try {
    const dbs = await indexedDB.databases?.() ?? [];
    for (const db of dbs) {
      if (db.name) { indexedDB.deleteDatabase(db.name); cleared = true; }
    }
  } catch { /* not available */ }

  // OPFS (Origin Private File System)
  try {
    const root = await navigator.storage.getDirectory();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const [name] of (root as any).entries()) {
      try { await root.removeEntry(name, { recursive: true }); cleared = true; } catch { /* ignore */ }
    }
  } catch { /* not available */ }

  resetPipelineCache();
  return cleared;
}

// ─── Stall detection ──────────────────────────────────────────────────────────
const STALL_TIMEOUT_MS = 2 * 60 * 1000;

// ─── Core loader ──────────────────────────────────────────────────────────────
async function getOrLoadPipeline(
  modelId: string,
  dtype: string,
  onProgress: ProgressCallback,
): Promise<unknown> {
  if (pipelineInstance && loadedModelId === modelId) {
    onProgress('loading_model', 'Model already loaded — reusing cache.', 66);
    return pipelineInstance;
  }
  if (pipelineInstance && loadedModelId !== modelId) resetPipelineCache();
  if (loadPromise) return loadPromise;

  modelLoadAbortController = new AbortController();
  const { signal } = modelLoadAbortController;

  loadPromise = (async () => {
    onProgress('loading_model', 'Importing Transformers.js…', 5);

    let pipelineFn: Function;
    let env: Record<string, unknown>;
    try {
      const mod = await import('@huggingface/transformers');
      pipelineFn = mod.pipeline as Function;
      env = mod.env as Record<string, unknown>;
    } catch (e) {
      loadPromise = null;
      throw new Error(`Cannot load Transformers.js: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (signal.aborted) throw new DOMException('Cancelled by user.', 'AbortError');

    env.allowLocalModels = false;
    env.useBrowserCache  = true;

    onProgress('loading_model', `Downloading ${modelId} (${dtype})…`, 10);

    let lastProgressAt = Date.now();
    const stallTimer = setInterval(() => {
      if (Date.now() - lastProgressAt >= STALL_TIMEOUT_MS) {
        clearInterval(stallTimer);
        modelLoadAbortController?.abort();
      }
    }, 5000);

    const progressCallback = (info: {
      status: string; progress?: number; name?: string;
      loaded?: number; total?: number;
    }) => {
      if (signal.aborted) return;
      lastProgressAt = Date.now();
      switch (info.status) {
        case 'initiate':
          onProgress('loading_model', `Preparing: ${shortName(info.name)}…`, 11); break;
        case 'download':
          onProgress('loading_model', `Starting: ${shortName(info.name)}…`, 12); break;
        case 'downloading': {
          const p = Math.round(info.progress ?? 0);
          const mapped = 12 + Math.round(p * 0.52);
          onProgress('loading_model',
            `Downloading ${shortName(info.name)}… ${p}% (${fmtBytes(info.loaded)} / ${fmtBytes(info.total)})`,
            mapped); break;
        }
        case 'progress': {
          const p = Math.round(info.progress ?? 0);
          onProgress('loading_model', `Loading… ${p}%`, 12 + Math.round(p * 0.52)); break;
        }
        case 'done': onProgress('loading_model', `✓ ${shortName(info.name)}`, 65); break;
        case 'ready': onProgress('loading_model', 'Model ready!', 66); break;
      }
    };

    // ── Primary attempt ───────────────────────────────────────────────────────
    let instance: unknown;
    try {
      onProgress('loading_model', `Loading ${modelId} (${dtype})…`, 13);
      instance = await pipelineFn(
        'automatic-speech-recognition',
        modelId,
        { dtype, progress_callback: progressCallback },
      );
    } catch (primaryErr) {
      if (signal.aborted) {
        clearInterval(stallTimer);
        loadPromise = null; pipelineInstance = null; loadedModelId = null;
        throw new DOMException('Cancelled by user.', 'AbortError');
      }

      // ── fp32 fallback ─────────────────────────────────────────────────────
      if (dtype !== 'fp32') {
        onProgress('loading_model', `${dtype} failed — trying fp32 (no quantization)…`, 15);
        try {
          instance = await pipelineFn(
            'automatic-speech-recognition',
            modelId,
            { dtype: 'fp32', progress_callback: progressCallback },
          );
        } catch (fp32Err) {
          clearInterval(stallTimer);
          loadPromise = null; pipelineInstance = null; loadedModelId = null;
          const a = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
          const b = fp32Err  instanceof Error ? fp32Err.message  : String(fp32Err);
          throw new Error(`Model load failed.\n${dtype}: ${a.slice(0,150)}\nfp32: ${b.slice(0,150)}`);
        }
      } else {
        clearInterval(stallTimer);
        loadPromise = null; pipelineInstance = null; loadedModelId = null;
        throw primaryErr;
      }
    }

    if (signal.aborted) {
      clearInterval(stallTimer);
      loadPromise = null; pipelineInstance = null; loadedModelId = null;
      throw new DOMException('Cancelled by user.', 'AbortError');
    }

    clearInterval(stallTimer);
    pipelineInstance = instance;
    loadedModelId    = modelId;
    onProgress('loading_model', 'Model loaded and ready.', 67);
    return instance;
  })();

  return loadPromise;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtBytes(b?: number) {
  if (!b) return '?';
  return b < 1_048_576 ? `${(b/1024).toFixed(0)} KB` : `${(b/1_048_576).toFixed(1)} MB`;
}
function shortName(n?: string) {
  if (!n) return 'file';
  return n.split('/').pop() ?? n;
}

async function fileToAudioData(file: File, onProgress: ProgressCallback): Promise<Float32Array> {
  onProgress('processing', 'Decoding audio…', 69);
  const buf = await file.arrayBuffer();
  const ctx = new AudioContext({ sampleRate: 16000 });
  try {
    const audio = await ctx.decodeAudioData(buf);
    onProgress('processing', 'Audio decoded — running speech recognition on your device…', 74);
    return audio.getChannelData(0);
  } finally {
    await ctx.close();
  }
}

// ─── Demo mode ────────────────────────────────────────────────────────────────
export function generateDemoTranscription(durationSeconds = 60): TranscriptionResult {
  const lines = [
    'Welcome back to another episode of our channel.',
    'At every tournament, Brazil arrives with attackers worth over a billion euros, and every time the backline quietly falls apart.',
    'The numbers are brutal. At Russia 2018, Germany already exposed them.',
    "Brazil's attack will show up. It always does, but will the defense?",
    'Brazil does not have a scoring problem. Brazil has a surviving problem. And the numbers have been telling you this for 12 years.',
    "Now let's talk about the practical steps you can take starting today.",
    "I'll break it down into three simple phases.",
    'Phase one is all about building your foundation.',
    'Phase two is where you start to gain momentum.',
    'And phase three is when everything clicks into place.',
  ];
  const seg = durationSeconds / lines.length;
  return {
    segments: lines.map((text, i) => ({
      id: i,
      start: parseFloat((i * seg).toFixed(2)),
      end:   parseFloat(((i + 1) * seg).toFixed(2)),
      text,
    })),
    fullText: lines.join(' '),
    language: 'en',
    durationSeconds,
  };
}

// ─── Provider factory ─────────────────────────────────────────────────────────
export function createLocalProvider(
  modelId: string,
  dtype = 'q4',
): TranscriptionProvider {
  return {
    id: 'local',
    name: `Local / Browser (${modelId})`,

    async isAvailable(): Promise<boolean> {
      return typeof WebAssembly !== 'undefined';
    },

    async transcribe(
      audioFile: File,
      language: string,
      onProgress: ProgressCallback,
    ): Promise<TranscriptionResult> {
      onProgress('preparing', 'Preparing transcription engine…', 2);

      const transcriber = await getOrLoadPipeline(modelId, dtype, onProgress);
      const audioData   = await fileToAudioData(audioFile, onProgress);

      onProgress('processing', 'Running Whisper on your device… (this can take a minute)', 77);

      const opts: Record<string, unknown> = {
        return_timestamps: true,
        chunk_length_s:    30,
        stride_length_s:   5,
      };
      if (language && language !== 'auto') opts.language = language;

      const result = await (transcriber as {
        (audio: Float32Array, opts: Record<string, unknown>): Promise<{
          text: string;
          chunks?: Array<{ timestamp: [number, number | null]; text: string }>;
        }>;
      })(audioData, opts);

      onProgress('formatting', 'Generating timestamps…', 94);

      const chunks   = result.chunks ?? [];
      const segments = chunks
        .map((c, idx) => ({
          id:    idx,
          start: c.timestamp[0] ?? 0,
          end:   c.timestamp[1] ?? c.timestamp[0] ?? 0,
          text:  c.text.trim(),
        }))
        .filter(s => s.text.length > 0);

      if (segments.length === 0 && result.text) {
        segments.push({ id: 0, start: 0, end: audioData.length / 16000, text: result.text.trim() });
      }

      onProgress('complete', 'Transcription complete!', 100);

      return {
        segments,
        fullText:        result.text.trim(),
        language:        language === 'auto' ? 'detected' : language,
        durationSeconds: audioData.length / 16000,
      };
    },
  };
}

export const localTranscriptionProvider = createLocalProvider(
  MODELS.multilingual.id,
  MODELS.multilingual.dtype,
);
