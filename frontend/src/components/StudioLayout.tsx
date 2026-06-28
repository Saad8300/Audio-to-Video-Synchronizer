import React, { ReactNode, useState } from 'react'
import {
  IconZap,
  IconSun,
  IconMoon,
  IconSettings,
  IconHistory,
  IconDashboard,
  IconMenu,
  IconX
} from './icons'

export type StudioTab = 'tools' | 'dashboard' | 'history' | 'settings'

interface StudioLayoutProps {
  children: ReactNode
  activeTab: StudioTab | string
  onNavigate: (tab: StudioTab) => void
  isDark: boolean
  toggleTheme: () => void
  backendStatus: ReactNode
}

export default function StudioLayout({ children, activeTab, onNavigate, isDark, toggleTheme, backendStatus }: StudioLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const tabs: { id: StudioTab; label: string; icon: ReactNode }[] = [
    { id: 'tools', label: 'Tools', icon: <IconZap size={18} /> },
    { id: 'dashboard', label: 'Dashboard', icon: <IconDashboard size={18} /> },
    { id: 'history', label: 'History', icon: <IconHistory size={18} /> },
    { id: 'settings', label: 'Settings', icon: <IconSettings size={18} /> },
  ]

  const handleNav = (tab: StudioTab) => {
    onNavigate(tab)
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: 'var(--bg-default)', color: 'var(--text-primary)' }}>
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-gradient text-lg">SyncFrame Studio</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
          {mobileMenuOpen ? <IconX size={24} /> : <IconMenu size={24} />}
        </button>
      </div>

      {/* Sidebar (Desktop) / Mobile Menu */}
      <div className={`md:flex flex-col w-full md:w-64 shrink-0 border-r md:h-screen sticky top-0 ${mobileMenuOpen ? 'block' : 'hidden'}`}
           style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
        
        {/* Desktop Header */}
        <div className="hidden md:flex items-center gap-2 p-6 pb-2">
          <span className="font-bold text-gradient text-xl">SyncFrame Studio</span>
        </div>

        <div className="px-6 py-2 hidden md:block">
          {backendStatus}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id || (activeTab.startsWith('tool:') && tab.id === 'tools')
            return (
              <button
                key={tab.id}
                onClick={() => handleNav(tab.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm"
                style={{
                  background: isActive ? 'var(--accent-subtle)' : 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            )
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t space-y-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="md:hidden flex justify-center pb-2">
            {backendStatus}
          </div>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: 'var(--text-secondary)' }}
          >
            {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </div>
      
    </div>
  )
}
