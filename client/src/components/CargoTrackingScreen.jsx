import { useState, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

// Human-readable event code labels
const EVENT_LABELS = {
    BKD: 'Booked',
    PRE: 'Prepared for Loading',
    MAN: 'Manifested',
    DEP: 'Departed',
    ARR: 'Arrived',
    RCF: 'Received from Flight',
    NFD: 'Notified for Delivery',
    DLV: 'Delivered',
    CCD: 'Customs Cleared',
    TRM: 'Transfer Manifest',
    FOH: 'Freight on Hand',
    AWD: 'Docs Delivered',
    CRC: 'Cargo Receipt',
    DDL: 'Door Delivery',
    TFD: 'Transferred',
    AWR: 'Docs Received',
    RCS: 'Received from Shipper',
}

function getEventLabel(code) {
    return EVENT_LABELS[code] || code
}

function formatDate(dateStr) {
    if (!dateStr) return '—'
    try {
        const d = new Date(dateStr)
        return d.toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
        })
    } catch { return dateStr }
}

// Event status color
function getEventColor(code) {
    switch (code) {
        case 'DLV': case 'DDL': return { bg: 'rgba(5, 150, 105, 0.1)', border: 'rgba(5, 150, 105, 0.3)', text: '#059669' }
        case 'DEP': return { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6' }
        case 'ARR': return { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)', text: '#8b5cf6' }
        case 'BKD': return { bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.3)', text: '#6b7280' }
        case 'PRE': case 'MAN': case 'RCS': return { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#d97706' }
        default: return { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6' }
    }
}

// Status badge color
function getStatusColor(status) {
    const s = (status || '').toUpperCase()
    if (s === 'DELIVERED') return { bg: 'rgba(5, 150, 105, 0.12)', text: '#059669' }
    if (s === 'IN_TRANSIT' || s === 'IN TRANSIT') return { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6' }
    if (s === 'DEPARTED') return { bg: 'rgba(139, 92, 246, 0.12)', text: '#8b5cf6' }
    return { bg: 'rgba(107, 114, 128, 0.12)', text: '#6b7280' }
}

export default function CargoTrackingScreen({ rapidApiKey }) {
    const [awb, setAwb] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState(null)
    const [selectedEventIndex, setSelectedEventIndex] = useState(null)
    const rawJsonRef = useRef(null)

    const handleTrack = async (e) => {
        e.preventDefault()
        setError('')
        setResult(null)
        setSelectedEventIndex(null)

        const trimmed = awb.trim()
        if (!trimmed) {
            setError('Please enter an AWB number.')
            return
        }

        setLoading(true)
        try {
            const params = new URLSearchParams({ awb: trimmed, rapidApiKey })
            const res = await fetch(`${API_URL}/cargo-track?${params}`)
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

    // Extract first shipment from API response array
    const shipment = Array.isArray(result) && result.length > 0 ? result[0] : null
    const events = shipment?.events || []

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

        if (selectedEventIndex === null || events.length === 0) {
            return <pre style={preStyle}>{fullJson}</pre>
        }

        const selectedEvent = events[selectedEventIndex]
        if (!selectedEvent) {
            return <pre style={preStyle}>{fullJson}</pre>
        }

        // Find a unique marker for this event in the JSON string
        const eventDate = selectedEvent.eventDate
        const eventCode = selectedEvent.code

        // Count how many events before this index share the same code+date
        let occurrenceIndex = 0
        for (let i = 0; i < selectedEventIndex; i++) {
            if (events[i].code === eventCode && events[i].eventDate === eventDate) {
                occurrenceIndex++
            }
        }

        // Search for the marker in the JSON
        const marker = `"code": "${eventCode}"`
        let searchStart = 0
        let markerPos = -1
        let currentOccurrence = -1

        while (searchStart < fullJson.length) {
            const pos = fullJson.indexOf(marker, searchStart)
            if (pos === -1) break

            // Check if eventDate is nearby (within the same object)
            const dateMarker = `"eventDate": "${eventDate}"`
            const windowStart = Math.max(0, pos - 50)
            const windowEnd = Math.min(fullJson.length, pos + 500)
            const window = fullJson.slice(windowStart, windowEnd)

            if (window.includes(dateMarker)) {
                currentOccurrence++
                if (currentOccurrence === occurrenceIndex) {
                    markerPos = pos
                    break
                }
            }

            searchStart = pos + marker.length
        }

        if (markerPos === -1) {
            return <pre style={preStyle}>{fullJson}</pre>
        }

        // Walk back to find the opening brace of this event object
        let braceStart = markerPos
        while (braceStart > 0 && fullJson[braceStart] !== '{') braceStart--

        // Walk forward to find the closing brace
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
        <div className="flex-1 flex flex-col min-h-0">
            {/* Search Bar */}
            <div className="shrink-0" style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255, 255, 255, 0.5)' }}>
                <div className="max-w-4xl mx-auto px-6 pt-5 pb-5">
                    <form onSubmit={handleTrack} className="flex gap-3">
                        <div className="flex-1 relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                value={awb}
                                onChange={(e) => setAwb(e.target.value)}
                                placeholder="Enter AWB number (e.g. 000-11223343)"
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
                            ) : 'Track Cargo'}
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

            {/* Results */}
            {shipment && (
                <div className="flex flex-1 max-w-7xl mx-auto w-full min-h-0" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                    {/* Left: Parsed View */}
                    <div className="flex-1 flex flex-col min-h-0" style={{ borderRight: '1px solid var(--border-glass)' }}>
                        <div className="px-6 pt-4 pb-2 shrink-0">
                            <h2 className="text-xs font-semibold uppercase tracking-wider"
                                style={{ color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif" }}>
                                Shipment Details
                            </h2>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                            {/* Summary Card */}
                            <div className="rounded-2xl p-5 mb-4" style={{
                                background: 'rgba(255,255,255,0.8)',
                                border: '1px solid var(--border-glass)',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                                animation: 'slideUp 0.4s ease-out',
                            }}>
                                {/* AWB & Status */}
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>AWB Number</div>
                                        <div className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }}>{shipment.awb}</div>
                                    </div>
                                    {shipment.status && (() => {
                                        const sc = getStatusColor(shipment.status)
                                        return (
                                            <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: sc.bg, color: sc.text }}>
                                                {shipment.status}
                                            </span>
                                        )
                                    })()}
                                </div>

                                {/* Route */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="text-center">
                                        <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{shipment.origin}</div>
                                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Origin</div>
                                    </div>
                                    <div className="flex-1 flex items-center gap-2">
                                        <div className="flex-1 h-px" style={{ background: 'var(--border-glass-hover)' }} />
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                                        </svg>
                                        <div className="flex-1 h-px" style={{ background: 'var(--border-glass-hover)' }} />
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{shipment.destination}</div>
                                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Destination</div>
                                    </div>
                                </div>

                                {/* Stats Row */}
                                <div className="grid grid-cols-2 gap-3 mt-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                                    {shipment.distance && (
                                        <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(59,130,246,0.06)' }}>
                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Distance</div>
                                            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{parseFloat(shipment.distance).toLocaleString()} km</div>
                                        </div>
                                    )}
                                    {shipment.time && (
                                        <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(139,92,246,0.06)' }}>
                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Duration</div>
                                            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{shipment.time}</div>
                                        </div>
                                    )}
                                    {shipment.carbonEmission && (
                                        <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(5,150,105,0.06)' }}>
                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>CO₂ Emission</div>
                                            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{shipment.carbonEmission}</div>
                                        </div>
                                    )}
                                    {shipment.weight && (
                                        <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(245,158,11,0.06)' }}>
                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Weight</div>
                                            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{shipment.weight} kg · {shipment.pieces || '—'} pc · {shipment.volume || '—'} m³</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Event Timeline */}
                            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)', fontFamily: "'Outfit', sans-serif" }}>
                                Event Timeline ({events.length})
                            </div>
                            <div className="relative">
                                {/* Vertical line */}
                                <div className="absolute left-4 top-3 bottom-3 w-px" style={{ background: 'var(--border-glass-hover)' }} />

                                {events.map((evt, i) => {
                                    const colors = getEventColor(evt.code)
                                    const isSelected = selectedEventIndex === i
                                    return (
                                        <div
                                            key={i}
                                            onClick={() => setSelectedEventIndex(isSelected ? null : i)}
                                            className="relative pl-10 pb-4 cursor-pointer transition-all duration-200"
                                            style={{
                                                animation: `slideUp 0.3s ease-out ${i * 0.05}s both`,
                                            }}
                                        >
                                            {/* Dot */}
                                            <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 transition-all duration-200"
                                                style={{
                                                    background: isSelected ? colors.text : '#fff',
                                                    borderColor: colors.text,
                                                    boxShadow: isSelected ? `0 0 8px ${colors.text}40` : 'none',
                                                }}
                                            />

                                            {/* Card */}
                                            <div className="rounded-xl px-4 py-3 transition-all duration-200"
                                                style={{
                                                    background: isSelected ? colors.bg : 'rgba(255,255,255,0.7)',
                                                    border: `1px solid ${isSelected ? colors.border : 'var(--border-glass)'}`,
                                                    boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                                                }}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                                                            {evt.code}
                                                        </span>
                                                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                            {getEventLabel(evt.code)}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                        {evt.eventLocation}
                                                    </span>
                                                </div>
                                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                    {formatDate(evt.eventDate)}
                                                </div>

                                                {/* Flight info (expanded on select) */}
                                                {isSelected && evt.flight && (
                                                    <div className="mt-3 pt-3 grid grid-cols-2 gap-2 text-xs" style={{ borderTop: `1px solid ${colors.border}` }}>
                                                        <div>
                                                            <span style={{ color: 'var(--text-muted)' }}>Flight: </span>
                                                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{evt.flight.number}</span>
                                                        </div>
                                                        <div>
                                                            <span style={{ color: 'var(--text-muted)' }}>Route: </span>
                                                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{evt.flight.origin} → {evt.flight.destination}</span>
                                                        </div>
                                                        {evt.flight.scheduledDeparture && (
                                                            <div>
                                                                <span style={{ color: 'var(--text-muted)' }}>Sched. Dep: </span>
                                                                <span style={{ color: 'var(--text-primary)' }}>{formatDate(evt.flight.scheduledDeparture)}</span>
                                                            </div>
                                                        )}
                                                        {evt.flight.scheduledArrival && (
                                                            <div>
                                                                <span style={{ color: 'var(--text-muted)' }}>Sched. Arr: </span>
                                                                <span style={{ color: 'var(--text-primary)' }}>{formatDate(evt.flight.scheduledArrival)}</span>
                                                            </div>
                                                        )}
                                                        {evt.flight.carbonEmission && (
                                                            <div>
                                                                <span style={{ color: 'var(--text-muted)' }}>CO₂: </span>
                                                                <span style={{ color: '#059669' }}>{evt.flight.carbonEmission}</span>
                                                            </div>
                                                        )}
                                                        {evt.flight.distance && (
                                                            <div>
                                                                <span style={{ color: 'var(--text-muted)' }}>Distance: </span>
                                                                <span style={{ color: 'var(--text-primary)' }}>{parseFloat(evt.flight.distance).toLocaleString()} km</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right: Raw JSON */}
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
