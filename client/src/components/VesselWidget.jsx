import { useState, useRef, useEffect } from 'react'

const API_URL = 'https://tracking-bgr2.onrender.com/api'

// ─── Formatters ─────────────────────────────────────────────────────────────────

function fmtDate(d) {
    if (!d) return null
    try {
        return new Date(d).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        })
    } catch { return d }
}

function stateLabel(s) {
    if (s === 'PAST') return { text: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.12)' }
    if (s === 'ONGOING') return { text: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' }
    if (s === 'FUTURE') return { text: 'Upcoming', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
    return { text: s || '—', color: 'var(--text-muted)', bg: 'rgba(0,0,0,0.04)' }
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function VesselWidget({ auth }) {
    const [open, setOpen] = useState(false)
    const [transportId, setTransportId] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [data, setData] = useState(null)
    const [activeLeg, setActiveLeg] = useState(0)
    const panelRef = useRef(null)

    // Close on outside click
    useEffect(() => {
        if (!open) return
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    const handleFetch = async (e) => {
        e.preventDefault()
        const trimmed = transportId.trim()
        if (!trimmed) return
        setLoading(true)
        setError('')
        setData(null)
        setActiveLeg(0)
        try {
            const res = await fetch(`${API_URL}/vessel-track?id=${trimmed}&token=${auth.token}&apiKey=${auth.apiKey}`)
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
            setData(json)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const legs = data?.transport_tracks || []
    const leg = legs[activeLeg] || null

    return (
        <>
            {/* ── Floating Action Button ── */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    title="Vessel Journey Tracker"
                    style={{
                        position: 'fixed',
                        bottom: '28px',
                        right: '28px',
                        zIndex: 900,
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        background: 'var(--gradient-brand)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 20px rgba(59, 130, 246, 0.35), 0 0 0 3px rgba(59, 130, 246, 0.1)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        animation: 'fadeIn 0.4s ease-out',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(59, 130, 246, 0.5), 0 0 0 4px rgba(59, 130, 246, 0.15)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.35), 0 0 0 3px rgba(59, 130, 246, 0.1)' }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                        <path d="M19.38 20A11.5 11.5 0 0 0 21 12l-9-4-9 4c0 5 2 8 4.62 10" />
                        <path d="M12 2v8" />
                    </svg>
                </button>
            )}

            {/* ── Expanded Panel ── */}
            {open && (
                <div
                    ref={panelRef}
                    style={{
                        position: 'fixed',
                        bottom: '28px',
                        right: '28px',
                        zIndex: 900,
                        width: '440px',
                        maxHeight: 'calc(100vh - 80px)',
                        borderRadius: '16px',
                        background: 'rgba(255,255,255,0.95)',
                        border: '1px solid var(--border-glass)',
                        backdropFilter: 'blur(16px)',
                        boxShadow: '0 12px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(59,130,246,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        animation: 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        borderBottom: '1px solid var(--border-glass)',
                        background: 'rgba(248,250,252,0.8)',
                    }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '10px',
                            background: 'var(--gradient-brand)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                                <path d="M19.38 20A11.5 11.5 0 0 0 21 12l-9-4-9 4c0 5 2 8 4.62 10" />
                                <path d="M12 2v8" />
                            </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }}>
                                Vessel Journey
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Transport Track Viewer</div>
                        </div>
                        {/* Minimize button */}
                        <button onClick={() => setOpen(false)} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-muted)', padding: '4px',
                            display: 'flex', alignItems: 'center',
                            borderRadius: '6px', transition: 'background 0.2s',
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
                            </svg>
                        </button>
                    </div>

                    {/* Search */}
                    <div style={{ padding: '14px 18px', borderBottom: data ? '1px solid var(--border-glass)' : 'none' }}>
                        <form onSubmit={handleFetch} style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                value={transportId}
                                onChange={e => setTransportId(e.target.value)}
                                placeholder="Enter Transport ID (e.g. 6667207)"
                                style={{
                                    flex: 1, padding: '9px 14px',
                                    borderRadius: '10px', fontSize: '13px',
                                    border: '1px solid var(--border-glass)',
                                    background: '#ffffff',
                                    color: 'var(--text-primary)',
                                    outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
                                }}
                                onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)' }}
                                onBlur={e => { e.target.style.borderColor = 'var(--border-glass)'; e.target.style.boxShadow = 'none' }}
                            />
                            <button type="submit" disabled={loading || !transportId.trim()} style={{
                                padding: '9px 16px', borderRadius: '10px',
                                fontSize: '12px', fontWeight: 600,
                                background: loading ? 'rgba(0,0,0,0.06)' : 'var(--gradient-btn)',
                                color: loading ? 'var(--text-muted)' : '#fff',
                                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s', flexShrink: 0,
                                boxShadow: loading ? 'none' : '0 2px 8px rgba(59,130,246,0.25)',
                            }}>
                                {loading ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                ) : 'Fetch'}
                            </button>
                        </form>

                        {error && (
                            <div style={{
                                marginTop: '10px', padding: '10px 12px',
                                borderRadius: '10px', fontSize: '12px',
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.15)',
                                color: '#dc2626',
                                display: 'flex', alignItems: 'center', gap: '8px',
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                                    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Results */}
                    {data && (
                        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 18px' }}>

                            {/* Leg Switcher */}
                            {legs.length > 1 && (
                                <div style={{ display: 'flex', gap: '4px', padding: '12px 0 8px', flexWrap: 'wrap' }}>
                                    {legs.map((l, i) => {
                                        return (
                                            <button key={i} onClick={() => setActiveLeg(i)} style={{
                                                padding: '4px 12px', borderRadius: '8px',
                                                fontSize: '11px', fontWeight: 600,
                                                border: `1px solid ${activeLeg === i ? 'rgba(59,130,246,0.4)' : 'var(--border-glass)'}`,
                                                background: activeLeg === i ? 'rgba(59,130,246,0.08)' : 'transparent',
                                                color: activeLeg === i ? '#3b82f6' : 'var(--text-muted)',
                                                cursor: 'pointer', transition: 'all 0.2s',
                                            }}>
                                                Leg {i + 1} · {l.vessel?.vessel_name || 'Unknown'}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                            {leg && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: legs.length > 1 ? '4px' : '12px' }}>

                                    {/* ── Vessel Info Card ── */}
                                    <div style={{
                                        padding: '14px', borderRadius: '12px',
                                        background: 'rgba(248,250,252,0.8)',
                                        border: '1px solid var(--border-glass)',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                            <div style={{
                                                width: '36px', height: '36px', borderRadius: '10px',
                                                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                                                    <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                                                    <path d="M19.38 20A11.5 11.5 0 0 0 21 12l-9-4-9 4c0 5 2 8 4.62 10" />
                                                </svg>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }}>
                                                    {leg.vessel?.vessel_name || 'Unknown Vessel'}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                                                    {leg.vessel?.vessel_imo_number && `IMO ${leg.vessel.vessel_imo_number}`}
                                                    {leg.vessel?.vessel_mmsi_number && ` · MMSI ${leg.vessel.vessel_mmsi_number}`}
                                                    {leg.vessel?.vessel_country_code && ` · ${leg.vessel.vessel_country_code}`}
                                                </div>
                                            </div>
                                            {/* Status badge */}
                                            {leg.state && (() => {
                                                const st = stateLabel(leg.state)
                                                return (
                                                    <span style={{
                                                        padding: '3px 10px', borderRadius: '6px',
                                                        fontSize: '10px', fontWeight: 700,
                                                        background: st.bg, color: st.color,
                                                        letterSpacing: '0.03em',
                                                    }}>{st.text}</span>
                                                )
                                            })()}
                                        </div>

                                        {/* Quick stats grid */}
                                        <div style={{
                                            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                                            gap: '8px', marginTop: '8px',
                                        }}>
                                            {[
                                                { label: 'Route', value: `${leg.pol_un_location_code || '—'} → ${leg.pod_un_location_code || '—'}` },
                                                { label: 'Speed (SOG)', value: leg.vessel?.vessel_sog != null ? `${leg.vessel.vessel_sog} kn` : '—' },
                                                { label: 'Heading (COG)', value: leg.vessel?.vessel_cog != null ? `${leg.vessel.vessel_cog}°` : '—' },
                                            ].map((item, i) => (
                                                <div key={i} style={{
                                                    padding: '8px 10px', borderRadius: '8px',
                                                    background: '#ffffff',
                                                    border: '1px solid var(--border-glass)',
                                                    textAlign: 'center',
                                                }}>
                                                    <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>
                                                        {item.label}
                                                    </div>
                                                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                        {item.value}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Dates */}
                                        {(leg.start_datetime || leg.end_datetime) && (
                                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                {leg.start_datetime && (
                                                    <div style={{
                                                        flex: 1, padding: '8px 10px', borderRadius: '8px',
                                                        background: '#ffffff',
                                                        border: '1px solid var(--border-glass)',
                                                    }}>
                                                        <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>
                                                            Departure
                                                        </div>
                                                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                            {fmtDate(leg.start_datetime)}
                                                        </div>
                                                    </div>
                                                )}
                                                {leg.end_datetime && (
                                                    <div style={{
                                                        flex: 1, padding: '8px 10px', borderRadius: '8px',
                                                        background: '#ffffff',
                                                        border: '1px solid var(--border-glass)',
                                                    }}>
                                                        <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>
                                                            Arrival
                                                        </div>
                                                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                            {fmtDate(leg.end_datetime)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Port Calls ── */}
                                    {leg.portcalls && leg.portcalls.length > 0 && (
                                        <div>
                                            <div style={{
                                                fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                                                letterSpacing: '0.08em', color: 'var(--text-muted)',
                                                marginBottom: '8px', fontFamily: "'Outfit', sans-serif",
                                            }}>
                                                Port Calls ({leg.portcalls.length})
                                            </div>
                                            <div style={{ position: 'relative' }}>
                                                {leg.portcalls.map((pc, i) => {
                                                    const isDone = !!pc.atd_datetime
                                                    const isLast = i === leg.portcalls.length - 1
                                                    const dotColor = isDone ? '#10b981' : '#f59e0b'
                                                    return (
                                                        <div key={i} style={{ display: 'flex', gap: '10px', position: 'relative' }}>
                                                            {/* Timeline */}
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16px', flexShrink: 0 }}>
                                                                <div style={{
                                                                    width: '10px', height: '10px', borderRadius: '50%',
                                                                    background: dotColor, marginTop: '14px', flexShrink: 0,
                                                                    boxShadow: `0 0 6px ${dotColor}60`,
                                                                    border: '2px solid #fff',
                                                                }} />
                                                                {!isLast && (
                                                                    <div style={{
                                                                        width: '2px', flex: 1, minHeight: '12px',
                                                                        background: `linear-gradient(to bottom, ${dotColor}40, var(--border-glass))`,
                                                                    }} />
                                                                )}
                                                            </div>
                                                            {/* Card */}
                                                            <div style={{
                                                                flex: 1, marginBottom: '6px',
                                                                padding: '10px 12px', borderRadius: '10px',
                                                                background: 'rgba(255,255,255,0.8)',
                                                                border: '1px solid var(--border-glass)',
                                                                transition: 'background 0.2s',
                                                            }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                                        {pc.port_name || pc.un_location_code}
                                                                    </span>
                                                                    <span style={{
                                                                        fontSize: '10px', fontWeight: 600,
                                                                        padding: '1px 6px', borderRadius: '4px',
                                                                        background: 'rgba(0,0,0,0.04)', color: 'var(--text-muted)',
                                                                    }}>
                                                                        {pc.un_location_code}
                                                                    </span>
                                                                    {pc.port_country && (
                                                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                                                            {pc.port_country}
                                                                        </span>
                                                                    )}
                                                                    <span style={{
                                                                        marginLeft: 'auto',
                                                                        fontSize: '9px', fontWeight: 700,
                                                                        color: isDone ? '#10b981' : '#f59e0b',
                                                                    }}>
                                                                        {isDone ? '● Done' : '○ Upcoming'}
                                                                    </span>
                                                                </div>
                                                                {/* Times */}
                                                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                                    {pc.ata_datetime && <span><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>ATA:</span> {fmtDate(pc.ata_datetime)}</span>}
                                                                    {pc.atd_datetime && <span><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>ATD:</span> {fmtDate(pc.atd_datetime)}</span>}
                                                                    {pc.eta_datetime && <span><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>ETA:</span> {fmtDate(pc.eta_datetime)}</span>}
                                                                    {pc.sta_datetime && <span><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>STA:</span> {fmtDate(pc.sta_datetime)}</span>}
                                                                    {pc.etd_datetime && <span><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>ETD:</span> {fmtDate(pc.etd_datetime)}</span>}
                                                                    {pc.std_datetime && <span><span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>STD:</span> {fmtDate(pc.std_datetime)}</span>}
                                                                </div>
                                                                {/* Coordinates */}
                                                                {(pc.latitude || pc.longitude) && (
                                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                                        📍 {pc.latitude?.toFixed(4)}, {pc.longitude?.toFixed(4)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Positions Summary ── */}
                                    {leg.positions && leg.positions.length > 0 && (() => {
                                        const historic = leg.positions.filter(p => p.tag === 'historic')
                                        const latest = leg.positions.find(p => p.tag === 'latest')
                                        const predicted = leg.positions.filter(p => p.tag === 'predicted')
                                        return (
                                            <div>
                                                <div style={{
                                                    fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                                                    letterSpacing: '0.08em', color: 'var(--text-muted)',
                                                    marginBottom: '8px', fontFamily: "'Outfit', sans-serif",
                                                }}>
                                                    Positions ({leg.positions.length} points)
                                                </div>
                                                <div style={{
                                                    padding: '12px', borderRadius: '10px',
                                                    background: 'rgba(248,250,252,0.8)',
                                                    border: '1px solid var(--border-glass)',
                                                    display: 'flex', gap: '8px',
                                                }}>
                                                    <div style={{
                                                        flex: 1, textAlign: 'center',
                                                        padding: '6px 8px', borderRadius: '8px',
                                                        background: 'rgba(59,130,246,0.06)',
                                                    }}>
                                                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#3b82f6' }}>{historic.length}</div>
                                                        <div style={{ fontSize: '9px', fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Historic</div>
                                                    </div>
                                                    <div style={{
                                                        flex: 1, textAlign: 'center',
                                                        padding: '6px 8px', borderRadius: '8px',
                                                        background: latest ? 'rgba(16,185,129,0.06)' : 'transparent',
                                                    }}>
                                                        <div style={{ fontSize: '18px', fontWeight: 800, color: latest ? '#10b981' : 'var(--text-muted)' }}>
                                                            {latest ? '1' : '0'}
                                                        </div>
                                                        <div style={{ fontSize: '9px', fontWeight: 600, color: latest ? '#10b981' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Latest</div>
                                                    </div>
                                                    <div style={{
                                                        flex: 1, textAlign: 'center',
                                                        padding: '6px 8px', borderRadius: '8px',
                                                        background: predicted.length > 0 ? 'rgba(245,158,11,0.06)' : 'transparent',
                                                    }}>
                                                        <div style={{ fontSize: '18px', fontWeight: 800, color: predicted.length > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                                                            {predicted.length}
                                                        </div>
                                                        <div style={{ fontSize: '9px', fontWeight: 600, color: predicted.length > 0 ? '#f59e0b' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Predicted</div>
                                                    </div>
                                                </div>

                                                {/* Current position */}
                                                {latest && (
                                                    <div style={{
                                                        marginTop: '8px',
                                                        padding: '10px 12px', borderRadius: '10px',
                                                        background: 'rgba(16,185,129,0.06)',
                                                        border: '1px solid rgba(16,185,129,0.15)',
                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                    }}>
                                                        <div style={{
                                                            width: '8px', height: '8px', borderRadius: '50%',
                                                            background: '#10b981',
                                                            boxShadow: '0 0 8px rgba(16,185,129,0.5)',
                                                            animation: 'pulse-glow 2s ease-in-out infinite',
                                                        }} />
                                                        <div>
                                                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>Current Position</div>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                                {latest.latitude?.toFixed(5)}, {latest.longitude?.toFixed(5)}
                                                            </div>
                                                            {latest.position_datetime && (
                                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                                                                    {fmtDate(latest.position_datetime)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })()}

                                    {/* ── Raw JSON Toggle ── */}
                                    <RawJsonSection data={data} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </>
    )
}

// ─── Collapsible Raw JSON ───────────────────────────────────────────────────────

function RawJsonSection({ data }) {
    const [showRaw, setShowRaw] = useState(false)
    return (
        <div>
            <button
                onClick={() => setShowRaw(v => !v)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    width: '100%', padding: '10px 12px',
                    borderRadius: '10px', background: 'rgba(0,0,0,0.02)',
                    border: '1px solid var(--border-glass)',
                    cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                    color: 'var(--text-muted)', transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ transform: showRaw ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    <polyline points="9 18 15 12 9 6" />
                </svg>
                Raw API Response
            </button>
            {showRaw && (
                <pre style={{
                    marginTop: '8px',
                    padding: '14px', borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid var(--border-glass)',
                    fontSize: '10px',
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    color: '#475569',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    animation: 'slideUp 0.2s ease-out',
                }}>
                    {JSON.stringify(data, null, 2)}
                </pre>
            )}
        </div>
    )
}
