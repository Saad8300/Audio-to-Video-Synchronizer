export type ThemeMode = 'light' | 'dark' | 'system'
export type AccentColor = 'purple' | 'blue' | 'cyan' | 'green' | 'orange'
export type StartupPage = 'landing' | 'studio-tools' | 'last-used'
export type ExportPreset = 'tiktok_1080' | 'tiktok_4k' | 'youtube_1080' | 'youtube_4k' | 'instagram_reel' | 'square_post' | 'fast_test' | 'default_1080p'

export interface AppSettings {
  themeMode: ThemeMode
  accentColor: AccentColor
  startupPage: StartupPage
  defaultExportPreset: ExportPreset
  defaultVideoFilename: string
  defaultAudioFilename: string
  defaultScriptFilename: string
  autoOpenResult: boolean
  confirmBeforeClearHistory: boolean
  lastUsedPage: string
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  themeMode: 'system',
  accentColor: 'purple',
  startupPage: 'landing',
  defaultExportPreset: 'default_1080p',
  defaultVideoFilename: 'my_video',
  defaultAudioFilename: 'merged_audio',
  defaultScriptFilename: 'script_timestamp',
  autoOpenResult: false,
  confirmBeforeClearHistory: true,
  lastUsedPage: 'landing'
}

const STORAGE_KEY = 'syncframe_settings_v1'

export function loadSettings(): AppSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      const parsed = JSON.parse(data)
      return { ...DEFAULT_APP_SETTINGS, ...parsed }
    }
  } catch (err) {
    console.error("Failed to load settings from localStorage", err)
  }
  
  // Migration from older keys
  try {
    const oldTheme = localStorage.getItem('theme')
    if (oldTheme === 'light' || oldTheme === 'dark') {
      const settings = { ...DEFAULT_APP_SETTINGS, themeMode: oldTheme as ThemeMode }
      saveSettings(settings)
      return settings
    }
  } catch (err) {
    // ignore
  }

  return { ...DEFAULT_APP_SETTINGS }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const current = loadSettings()
  const updated = { ...current, ...settings }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error("Failed to save settings to localStorage", err)
  }
  return updated
}

export function resetSettings(): AppSettings {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.error("Failed to reset settings", err)
  }
  return { ...DEFAULT_APP_SETTINGS }
}

export function applyThemeMode(mode: ThemeMode) {
  const root = document.documentElement
  let isDark = false

  if (mode === 'dark') {
    isDark = true
  } else if (mode === 'light') {
    isDark = false
  } else {
    // system
    isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  if (isDark) {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.remove('dark')
    root.classList.add('light')
  }
}
