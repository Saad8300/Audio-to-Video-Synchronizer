import React, { ReactNode, useState, useEffect } from 'react'
import {
  IconZap,
  IconSun,
  IconMoon,
  IconSettings,
  IconHistory,
  IconDashboard,
  IconMenu,
  IconX,
  IconHelpCircle,
  IconLayers,
  IconChevronRight,
} from './icons'

export type StudioTab = 'tools' | 'batch_video' | 'dashboard' | 'history' | 'templates' | 'settings' | 'help'

interface StudioLayoutProps {
  children: ReactNode
  activeTab: StudioTab | string
  onNavigate: (tab: StudioTab) => void
  isDark: boolean
  toggleTheme: () => void
  backendStatus: ReactNode
}

const SIDEBAR_COLLAPSED_KEY = 'studio_sidebar_collapsed'

export default function StudioLayout({ children, activeTab, onNavigate, isDark, toggleTheme, backendStatus }: StudioLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true' } catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed)) } catch { /* noop */ }
  }, [collapsed])

  const tabs: { id: StudioTab; label: string; icon: ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard',   icon: <IconDashboard size={17} /> },
    { id: 'tools',     label: 'Tools',       icon: <IconZap size={17} /> },
    { id: 'history',   label: 'History',     icon: <IconHistory size={17} /> },
    { id: 'templates', label: 'Templates',   icon: <IconLayers size={17} /> },
    { id: 'settings',  label: 'Settings',    icon: <IconSettings size={17} /> },
  ]

  const handleNav = (tab: StudioTab) => {
    onNavigate(tab)
    setMobileMenuOpen(false)
  }

  const sidebarW = collapsed ? 'md:w-[60px]' : 'md:w-56'

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>

      {/* ── Mobile Header ── */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
        <span className="font-bold text-gradient text-base">SyncFrame Studio</span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10"
            style={{ color: 'var(--text-secondary)' }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
            {mobileMenuOpen ? <IconX size={20} /> : <IconMenu size={20} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Backdrop ── */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          flex flex-col shrink-0 border-r md:sticky md:top-0 md:h-screen
          ${sidebarW}
          transition-all duration-200
          ${mobileMenuOpen
            ? 'fixed inset-y-0 left-0 z-50 shadow-2xl w-56 flex'
            : 'hidden md:flex'}
        `}
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}
      >
        {/* Brand header */}
        <div className={`flex items-center gap-2 px-4 py-4 border-b ${collapsed ? 'justify-center' : ''}`} style={{ borderColor: 'var(--border-subtle)' }}>
          {!collapsed && (
            <span className="font-bold text-gradient text-base leading-tight truncate flex-1">
              SyncFrame<br />Studio
            </span>
          )}
          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="hidden md:flex p-1 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
            style={{ color: 'var(--text-muted)' }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span style={{ display: 'inline-block', transition: 'transform 0.2s', transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}>
              <IconChevronRight size={15} />
            </span>
          </button>
        </div>

        {/* Backend status — only when expanded */}
        {!collapsed && (
          <div className="px-3 pt-2 pb-1">
            {backendStatus}
          </div>
        )}

        {/* Navigation */}
        <nav className={`flex-1 py-3 space-y-0.5 overflow-y-auto ${collapsed ? 'px-2' : 'px-2'}`}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id || (activeTab.startsWith('tool:') && tab.id === 'tools')
            return (
              <button
                key={tab.id}
                onClick={() => handleNav(tab.id)}
                title={collapsed ? tab.label : undefined}
                className={`w-full flex items-center rounded-xl transition-all duration-150 font-medium text-[13px] ${collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2.5'}`}
                style={{
                  background: isActive ? 'var(--accent-subtle)' : 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  borderLeft: isActive && !collapsed ? '2px solid var(--accent-primary)' : '2px solid transparent',
                }}
              >
                <span className="shrink-0">{tab.icon}</span>
                {!collapsed && <span className="truncate">{tab.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Mobile backend status */}
        <div className="md:hidden px-3 pb-2">
          {backendStatus}
        </div>

        {/* Footer: compact theme toggle */}
        <div className={`border-t p-3 ${collapsed ? 'flex justify-center' : 'flex items-center gap-2'}`} style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={toggleTheme}
            className={`flex items-center justify-center rounded-xl transition-colors hover:bg-black/10 dark:hover:bg-white/10 ${collapsed ? 'w-10 h-10' : 'w-10 h-10'}`}
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
          </button>
          {!collapsed && (
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
              {isDark ? 'Light mode' : 'Dark mode'}
            </span>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto min-h-screen">
        <div className="w-full h-full">
          {children}
        </div>
      </div>

    </div>
  )
}
