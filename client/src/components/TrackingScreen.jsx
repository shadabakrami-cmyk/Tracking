import { useState, useRef, useEffect, useMemo } from 'react'
import DCSAView from './DCSAView'
import { normalizeResponse } from '../utils/normalizeResponse'

const API_URL = 'http://localhost:4000/api'

const TABS = [
    { key: 'bl', label: 'Bill of Lading', placeholder: 'Enter Bill of Lading number' },
    { key: 'booking', label: 'Booking Number', placeholder: 'Enter Booking reference' },
    { key: 'container', label: 'Container Number', placeholder: 'Enter Container number' },
]

export default function TrackingScreen({ auth, onDisconnect }) {
    const [activeTab, setActiveTab] = useState('bl')
    const [reference, setReference] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState(null)
    const [selectedEventIndex, setSelectedEventIndex] = useState(null)

    const rawJsonRef = useRef(null)

    const currentTab = TABS.find((t) => t.key === activeTab)

    // Pre-compute the raw events for JSON highlighting
    const rawEvents = useMemo(() => {
        if (!result) return []
        return normalizeResponse(result).allEvents
    }, [result])

    // Scroll the raw JSON panel to the highlighted event
    useEffect(() => {
        if (selectedEventIndex === null || !rawJsonRef.current) return
        const marker = rawJsonRef.current.querySelector(`[data-event-idx="${selectedEventIndex}"]`)
        if (marker) {
            marker.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [selectedEventIndex])

    const handleTrack = async (e) => {
        e.preventDefault()
        setError('')
        setResult(null)
        setSelectedEventIndex(null)

        const trimmed = reference.trim()
        if (!trimmed) {
            setError('Please enter a reference number.')
            return
        }

        setLoading(true)
        try {
            const params = new URLSearchParams({
                type: activeTab,
                reference: trimmed,
                token: auth.token,
                apiKey: auth.apiKey,
            })

            const res = await fetch(`${API_URL}/track?${params}`)
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || data.message || `Tracking failed (${res.status})`)
                return
            }

            setResult(data)
        } catch (err) {
            setError('Network error — is the proxy server running on port 4000?')
        } finally {
            setLoading(false)
        }
    }

    // Find the event_id of the selected normalized event in the original JSON
    function findEventIdForIndex(idx) {
        if (idx === null || !rawEvents[idx]) return null
        // _raw is camelCase — get eventId
        const raw = rawEvents[idx]._raw
        return raw?.eventId || null
    }

    // Build raw JSON with per-event highlighting
    function renderRawJson() {
        if (!result) return null

        const fullJson = JSON.stringify(result, null, 2)

        const preStyle = {
            background: '#f8fafc',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '11px',
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            color: '#475569',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
        }

        if (selectedEventIndex === null || rawEvents.length === 0) {
            return <pre style={preStyle}>{fullJson}</pre>
        }

        const eventId = findEventIdForIndex(selectedEventIndex)
        if (!eventId) {
            return <pre style={preStyle}>{fullJson}</pre>
        }

        // Find the event block in the original JSON by searching for its event_id
        const idMarker = `"event_id": "${eventId}"`
        const idPos = fullJson.indexOf(idMarker)
        if (idPos === -1) {
            return <pre style={preStyle}>{fullJson}</pre>
        }

        // Walk backwards from idPos to find the opening { of this event object
        let braceStart = idPos
        while (braceStart > 0 && fullJson[braceStart] !== '{') braceStart--

        // Walk forward to find the matching closing } by counting braces
        let depth = 0
        let braceEnd = braceStart
        for (let i = braceStart; i < fullJson.length; i++) {
            if (fullJson[i] === '{') depth++
            if (fullJson[i] === '}') depth--
            if (depth === 0) {
                braceEnd = i + 1
                break
            }
        }

        const before = fullJson.slice(0, braceStart)
        const match = fullJson.slice(braceStart, braceEnd)
        const after = fullJson.slice(braceEnd)

        return (
            <pre style={preStyle}>
                {before}
                <span
                    ref={(el) => {
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                    style={{
                        background: 'rgba(59, 130, 246, 0.3)',
                        borderLeft: '3px solid #3b82f6',
                        marginLeft: '-2px',
                        paddingLeft: '4px',
                        borderRadius: '4px',
                    }}
                >
                    {match}
                </span>
                {after}
            </pre>
        )
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(145deg, var(--bg-primary), var(--bg-secondary))' }}>
            {/* Navigation Bar */}
            <nav className="px-6 py-3 flex items-center justify-between shrink-0"
                style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    borderBottom: '1px solid var(--border-glass)',
                    backdropFilter: 'blur(12px)',
                }}>
                <span className="text-lg font-bold tracking-tight"
                    style={{ fontFamily: "'Outfit', sans-serif", background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Oceanio Tracker
                </span>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"
                            style={{ animation: 'pulse-glow 2s ease-in-out infinite' }} />
                        Connected
                    </div>
                    <button
                        onClick={onDisconnect}
                        className="text-xs transition-colors duration-200 cursor-pointer"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => e.target.style.color = '#f87171'}
                        onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                    >
                        Disconnect
                    </button>
                </div>
            </nav>

            {/* Search Section */}
            <div className="shrink-0" style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255, 255, 255, 0.5)' }}>
                <div className="max-w-4xl mx-auto px-6 pt-5 pb-6">
                    {/* Tabs */}
                    <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.03)' }}>
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => {
                                    setActiveTab(tab.key)
                                    setError('')
                                    setResult(null)
                                    setSelectedEventIndex(null)
                                }}
                                className="flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-300 cursor-pointer"
                                style={{
                                    background: activeTab === tab.key ? 'var(--gradient-brand)' : 'transparent',
                                    color: activeTab === tab.key ? '#ffffff' : 'var(--text-muted)',
                                    boxShadow: activeTab === tab.key ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none',
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Input + Button (inline) */}
                    <form onSubmit={handleTrack} className="flex gap-3">
                        <div className="flex-1 relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder={currentTab?.placeholder}
                                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none"
                                style={{
                                    background: 'rgba(255,255,255,0.9)',
                                    border: '1px solid var(--border-glass)',
                                    color: 'var(--text-primary)',
                                }}
                                onFocus={(e) => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'var(--border-glass)'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            style={{
                                background: loading ? 'rgba(0,0,0,0.08)' : 'var(--gradient-btn)',
                                boxShadow: loading ? 'none' : '0 4px 15px rgba(59, 130, 246, 0.25)',
                            }}
                            onMouseEnter={(e) => { if (!loading) { e.target.style.background = 'var(--gradient-btn-hover)'; e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)'; } }}
                            onMouseLeave={(e) => { if (!loading) { e.target.style.background = 'var(--gradient-btn)'; e.target.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.3)'; } }}
                        >
                            {loading ? (
                                <span className="inline-flex items-center gap-2">
                                    <svg className="w-4 h-4" style={{ animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                    Tracking...
                                </span>
                            ) : 'Track Shipment'}
                        </button>
                    </form>

                    {error && (
                        <div className="mt-3 text-sm rounded-xl px-4 py-3 flex items-start gap-2"
                            style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#dc2626',
                                animation: 'slideUp 0.3s ease-out',
                            }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5" style={{ color: '#f87171' }}>
                                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                            {error}
                        </div>
                    )}
                </div>
            </div>

            {/* Results Section — two scrollable panels */}
            {result && (
                <div className="flex max-w-7xl mx-auto w-full" style={{ animation: 'fadeIn 0.4s ease-out', height: '100vh' }}>
                    {/* Left: DCSA View — scrollable box */}
                    <div className="flex-1 flex flex-col min-h-0" style={{ borderRight: '1px solid var(--border-glass)' }}>
                        <div className="px-6 pt-4 pb-2 shrink-0">
                            <h2 className="text-xs font-semibold uppercase tracking-wider"
                                style={{ color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif" }}>
                                Shipment Events (DCSA)
                            </h2>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                            <DCSAView
                                data={result}
                                selectedIndex={selectedEventIndex}
                                onSelectEvent={setSelectedEventIndex}
                            />
                        </div>
                    </div>

                    {/* Right: Raw JSON — scrollable box */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="px-6 pt-4 pb-2 shrink-0 flex items-center justify-between">
                            <h2 className="text-xs font-semibold uppercase tracking-wider"
                                style={{ color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif" }}>
                                Raw API Response
                            </h2>
                            {selectedEventIndex !== null && (
                                <button
                                    onClick={() => setSelectedEventIndex(null)}
                                    className="text-xs cursor-pointer transition-colors duration-200"
                                    style={{ color: 'var(--text-muted)' }}
                                    onMouseEnter={(e) => e.target.style.color = 'var(--text-secondary)'}
                                    onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                                >
                                    Clear selection
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 pb-6" ref={rawJsonRef}>
                            {renderRawJson()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
