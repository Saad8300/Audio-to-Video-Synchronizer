// components/ProgressOverlay.tsx – Loading/progress state during generation

import React from 'react'
import { IconLoader, IconZap } from './icons'

interface ProgressOverlayProps {
  status: 'uploading' | 'generating'
}

const MESSAGES = [
  'Extracting images from ZIP…',
  'Validating timestamp CSV…',
  'Preprocessing images…',
  'Applying effects and transitions…',
  'Encoding video with FFmpeg…',
  'Muxing audio track…',
  'Finalizing MP4…',
]

export default function ProgressOverlay({ status }: ProgressOverlayProps) {
  const [msgIndex, setMsgIndex] = React.useState(0)

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length)
    }, 2800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="card p-8 w-80 text-center space-y-6 shadow-2xl">
        {/* Animated icon */}
        <div className="flex justify-center">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-brand-gradient opacity-20 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-brand-gradient/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
              {status === 'uploading' ? (
                <IconLoader size={32} />
              ) : (
                <IconZap size={32} className="text-violet-400" />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-100">
            {status === 'uploading' ? 'Uploading Files…' : 'Generating Video'}
          </h3>
          <p className="text-sm text-slate-400 min-h-[20px] transition-all duration-500">
            {status === 'generating' ? MESSAGES[msgIndex] : 'Sending files to server…'}
          </p>
        </div>

        {/* Indeterminate progress bar */}
        <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand-500 to-violet-500 rounded-full animate-[progress_2s_ease-in-out_infinite]" />
        </div>

        <p className="text-xs text-slate-500">
          This may take a moment depending on video length.
        </p>
      </div>

      <style>{`
        @keyframes progress {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  )
}
