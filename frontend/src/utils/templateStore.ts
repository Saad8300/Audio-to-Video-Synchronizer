export type ToolKey = 'image' | 'video' | 'media' | 'audio_merger' | 'script_timestamp';

export interface StudioTemplate {
  id: string;
  name: string;
  tool: ToolKey;
  description: string;
  isBuiltIn: boolean;
  createdAt?: number;
  settings: Record<string, any>;
}

export const BUILT_IN_TEMPLATES: StudioTemplate[] = [
  // --- Video Templates ---
  {
    id: 'builtin_tiktok_image',
    name: 'TikTok Shorts Image Timeline',
    tool: 'image',
    description: 'Vertical 9:16 short-form video using images, audio, and timestamp CSV.',
    isBuiltIn: true,
    settings: {
      aspectRatio: '9:16',
      exportResolution: '1080p',
      renderProfile: 'balanced',
      outputName: 'tiktok_short'
    }
  },
  {
    id: 'builtin_youtube_shorts_4k',
    name: 'YouTube Shorts 4K',
    tool: 'image',
    description: 'High-quality vertical 4K image timeline export for shorts.',
    isBuiltIn: true,
    settings: {
      aspectRatio: '9:16',
      exportResolution: '4K',
      renderProfile: 'high_quality',
      outputName: 'youtube_short_4k'
    }
  },
  {
    id: 'builtin_youtube_video_landscape',
    name: 'YouTube Landscape Video Timeline',
    tool: 'video',
    description: 'Landscape 16:9 video timeline for YouTube-style videos.',
    isBuiltIn: true,
    settings: {
      aspectRatio: '16:9',
      exportResolution: '1080p',
      renderProfile: 'balanced',
      outputName: 'youtube_video'
    }
  },
  {
    id: 'builtin_mixed_media_reel',
    name: 'Mixed Media Reel',
    tool: 'media',
    description: 'Use images, videos, and text rows in one vertical timeline CSV.',
    isBuiltIn: true,
    settings: {
      aspectRatio: '9:16',
      exportResolution: '1080p',
      renderProfile: 'balanced',
      outputName: 'media_reel'
    }
  },
  {
    id: 'builtin_fast_test_render',
    name: 'Fast Test Render',
    tool: 'image',
    description: 'Low-resolution fast test render to quickly check timing and sync.',
    isBuiltIn: true,
    settings: {
      aspectRatio: '9:16',
      exportResolution: '720p',
      renderProfile: 'fast_preview',
      outputName: 'test_render'
    }
  },

  // --- Audio Templates ---
  {
    id: 'builtin_podcast_audio',
    name: 'Podcast Audio Merge',
    tool: 'audio_merger',
    description: 'Merge multiple spoken audio parts into one clean MP3 file.',
    isBuiltIn: true,
    settings: {
      outputFormat: 'mp3',
      outputName: 'podcast_audio'
    }
  },
  {
    id: 'builtin_voiceover_merge',
    name: 'Voiceover Parts Merge',
    tool: 'audio_merger',
    description: 'Combine multiple voiceover segments into one final audio track.',
    isBuiltIn: true,
    settings: {
      outputFormat: 'mp3',
      outputName: 'final_voiceover'
    }
  },
  {
    id: 'builtin_wav_master',
    name: 'WAV Master Audio',
    tool: 'audio_merger',
    description: 'Create a WAV master file for editing or high-quality export.',
    isBuiltIn: true,
    settings: {
      outputFormat: 'wav',
      outputName: 'master_audio'
    }
  },

  // --- Script Templates ---
  {
    id: 'builtin_csv_timestamps',
    name: 'Image Timeline CSV Timestamps',
    tool: 'script_timestamp',
    description: 'Generate readable timestamp text and Image Timeline-ready CSV.',
    isBuiltIn: true,
    settings: {
      outputMode: 'csv_image_timeline',
      outputName: 'image_timeline_timestamps'
    }
  },
  {
    id: 'builtin_youtube_srt',
    name: 'YouTube Captions SRT',
    tool: 'script_timestamp',
    description: 'Generate SRT caption output for videos.',
    isBuiltIn: true,
    settings: {
      outputMode: 'srt',
      outputName: 'captions'
    }
  },
  {
    id: 'builtin_txt_timestamps',
    name: 'Readable TXT Timestamps',
    tool: 'script_timestamp',
    description: 'Generate clean bracketed timestamp text for review and editing.',
    isBuiltIn: true,
    settings: {
      outputMode: 'txt',
      outputName: 'timestamps'
    }
  }
];

const TEMPLATES_KEY = 'syncframe_templates_v1';
const PENDING_TEMPLATE_KEY = 'syncframe_pending_template_v1';

export function getSavedTemplates(): StudioTemplate[] {
  try {
    const data = localStorage.getItem(TEMPLATES_KEY);
    if (!data) return [];
    return JSON.parse(data) || [];
  } catch (err) {
    console.error('Failed to load saved templates', err);
    return [];
  }
}

export function saveTemplate(template: Omit<StudioTemplate, 'id' | 'createdAt' | 'isBuiltIn'>): StudioTemplate {
  const newTemplate: StudioTemplate = {
    ...template,
    id: 'tpl_' + crypto.randomUUID(),
    createdAt: Date.now(),
    isBuiltIn: false
  };

  const templates = getSavedTemplates();
  templates.push(newTemplate);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  return newTemplate;
}

export function deleteTemplate(id: string) {
  let templates = getSavedTemplates();
  templates = templates.filter(t => t.id !== id);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

export function setPendingTemplate(template: StudioTemplate) {
  // Store just the tool and the settings to be picked up
  localStorage.setItem(PENDING_TEMPLATE_KEY, JSON.stringify({
    tool: template.tool,
    settings: template.settings,
    templateId: template.id
  }));
}

export function consumePendingTemplate(tool: ToolKey): Record<string, any> | null {
  try {
    const data = localStorage.getItem(PENDING_TEMPLATE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    if (parsed.tool === tool) {
      localStorage.removeItem(PENDING_TEMPLATE_KEY);
      return parsed.settings || null;
    }
    return null; // Not meant for this tool
  } catch (err) {
    console.error('Failed to consume pending template', err);
    return null;
  }
}
