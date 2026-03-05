import { useState } from 'react'

export default function Navbar({ activeSection, onSectionChange, oceanAuth, cargoAuth, onOceanDisconnect, onCargoDisconnect }) {
    const [collapsed, setCollapsed] = useState(true)

    const sections = [
        {
            key: 'ocean', label: 'Oceanio Tracking', shortLabel: 'Ocean',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 20l.9-4A3 3 0 0 1 5.8 14H18.2a3 3 0 0 1 2.9 2l.9 4" />
                    <path d="M4 14V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8" />
                    <path d="M12 4v4" />
                </svg>
            ),
            connected: !!oceanAuth,
            onDisconnect: onOceanDisconnect,
        },
        {
            key: 'cargo', label: 'Air Cargo Tracking', shortLabel: 'Cargo',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                </svg>
            ),
            connected: !!cargoAuth,
            onDisconnect: onCargoDisconnect,
        },
    ]

    return (
        <aside
            className="shrink-0 flex flex-col h-screen"
            style={{
                width: collapsed ? '68px' : '240px',
                background: 'rgba(255, 255, 255, 0.88)',
                borderRight: '1px solid var(--border-glass)',
                backdropFilter: 'blur(16px)',
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'sticky',
                top: 0,
                zIndex: 50,
            }}
        >
            {/* Brand */}
            <div className="px-4 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-glass)' }}>
                <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-glow-blue)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12h20" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                </div>
                {!collapsed && (
                    <span className="text-base font-bold tracking-tight whitespace-nowrap"
                        style={{
                            fontFamily: "'Outfit', sans-serif",
                            background: 'var(--gradient-brand)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            animation: 'fadeIn 0.2s ease-out',
                        }}>
                        OceanioTracker
                    </span>
                )}
            </div>

            {/* Section Navigation */}
            <div className="flex-1 px-3 py-4 flex flex-col gap-1">
                <div className="mb-2">
                    {!collapsed && (
                        <span className="text-[10px] font-semibold uppercase tracking-widest px-2"
                            style={{ color: 'var(--text-muted)', animation: 'fadeIn 0.2s ease-out' }}>
                            Sections
                        </span>
                    )}
                </div>

                {sections.map((section) => {
                    const isActive = activeSection === section.key
                    return (
                        <button
                            key={section.key}
                            onClick={() => onSectionChange(section.key)}
                            className="relative flex items-center gap-3 rounded-xl transition-all duration-200 cursor-pointer"
                            style={{
                                padding: collapsed ? '12px' : '10px 14px',
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                background: isActive ? 'var(--gradient-brand)' : 'transparent',
                                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                                boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.25)' : 'none',
                            }}
                            title={collapsed ? section.label : undefined}
                            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
                            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                        >
                            <span className="shrink-0">{section.icon}</span>
                            {!collapsed && (
                                <span className="text-sm font-medium whitespace-nowrap" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                                    {section.label}
                                </span>
                            )}

                            {/* Connection dot */}
                            {section.connected && (
                                <span
                                    className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                                    style={{
                                        animation: 'pulse-glow 2s ease-in-out infinite',
                                        position: collapsed ? 'absolute' : 'relative',
                                        top: collapsed ? '8px' : 'auto',
                                        right: collapsed ? '8px' : 'auto',
                                        marginLeft: collapsed ? '0' : 'auto',
                                    }}
                                />
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Connection Status Section */}
            {(() => {
                const active = sections.find(s => s.key === activeSection)
                if (!active?.connected) return null
                return (
                    <div className="px-3 pb-3">
                        <div className="rounded-xl px-3 py-2.5"
                            style={{
                                background: 'rgba(5, 150, 105, 0.06)',
                                border: '1px solid rgba(5, 150, 105, 0.15)',
                                animation: 'fadeIn 0.3s ease-out',
                            }}>
                            {!collapsed ? (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"
                                            style={{ animation: 'pulse-glow 2s ease-in-out infinite' }} />
                                        Connected
                                    </div>
                                    <button
                                        onClick={active.onDisconnect}
                                        className="text-xs transition-colors duration-200 cursor-pointer"
                                        style={{ color: 'var(--text-muted)' }}
                                        onMouseEnter={(e) => e.target.style.color = '#f87171'}
                                        onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={active.onDisconnect}
                                    className="w-full flex items-center justify-center cursor-pointer"
                                    title="Disconnect"
                                    style={{ color: 'var(--text-muted)' }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                        <polyline points="16 17 21 12 16 7" />
                                        <line x1="21" y1="12" x2="9" y2="12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                )
            })()}

            {/* Collapse Toggle */}
            <div className="px-3 pb-4" style={{ borderTop: '1px solid var(--border-glass)' }}>
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full mt-3 flex items-center gap-2 rounded-xl py-2.5 transition-all duration-200 cursor-pointer"
                    style={{
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        paddingLeft: collapsed ? '0' : '14px',
                        paddingRight: collapsed ? '0' : '14px',
                        color: 'var(--text-muted)',
                        background: 'transparent',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <svg
                        width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{
                            transition: 'transform 0.3s ease',
                            transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                    >
                        <polyline points="11 17 6 12 11 7" />
                        <polyline points="18 17 13 12 18 7" />
                    </svg>
                    {!collapsed && (
                        <span className="text-xs font-medium" style={{ animation: 'fadeIn 0.2s ease-out' }}>Collapse</span>
                    )}
                </button>
            </div>
        </aside>
    )
}
