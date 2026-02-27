import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'

const API_URL = 'https://tracking-bgr2.onrender.com/api'

// ─── Helpers ────────────────────────────────────────────────────────────────────

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
    if (s === 'PAST') return { text: 'Completed', color: '#059669', bg: 'rgba(5,150,105,0.1)', border: 'rgba(5,150,105,0.2)' }
    if (s === 'ONGOING') return { text: 'In Transit', color: '#d97706', bg: 'rgba(217,119,6,0.1)', border: 'rgba(217,119,6,0.2)' }
    if (s === 'FUTURE') return { text: 'Scheduled', color: '#6366f1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)' }
    return { text: s || '—', color: 'var(--text-muted)', bg: 'rgba(0,0,0,0.04)', border: 'var(--border-glass)' }
}

function portLabel(code, name) {
    if (name && code) return `${name} (${code})`
    return name || code || '—'
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function VesselSection({ auth }) {
    const [transportId, setTransportId] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [data, setData] = useState(null)
    const [activeLeg, setActiveLeg] = useState(0)
    const [vesselDetailsOpen, setVesselDetailsOpen] = useState(false)


    // ── flyToPort ref for the map ──
    const mapRef = useRef(null)
    const handleFetch = async (e) => {
        e.preventDefault()
        const trimmed = transportId.trim()
        if (!trimmed) return
        setLoading(true)
        setError('')
        setData(null)
        setActiveLeg(0)
        setVesselDetailsOpen(false)
        try {
            const res = await fetch(
                `${API_URL}/vessel-track?id=${trimmed}&token=${auth.token}&apiKey=${auth.apiKey}`
            )
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
    const vessel = leg?.vessel || {}
    const portcalls = leg?.portcalls || []
    const positions = leg?.positions || []

    const historicPositions = useMemo(() => positions.filter(p => p.tag === 'historic'), [positions])
    const predictedPositions = useMemo(() => positions.filter(p => p.tag === 'predicted'), [positions])
    const latestPosition = useMemo(() => positions.find(p => p.tag === 'latest') || null, [positions])

    // ── Fly to port ──
    const flyToPort = useCallback((pc) => {
        if (mapRef.current && pc.latitude && pc.longitude) {
            mapRef.current.flyTo([pc.latitude, pc.longitude], 10, { duration: 1 })
        }
    }, [])

    // ── Origin / Destination labels ──
    const origin = portcalls.length > 0 ? portcalls[0] : null
    const destination = portcalls.length > 1 ? portcalls[portcalls.length - 1] : null

    return (
        <div className="flex-1 flex flex-col min-h-0" style={{ animation: 'fadeIn 0.4s ease-out' }}>
            {/* ═══ Input Bar ═══ */}
            <div className="shrink-0 max-w-4xl mx-auto w-full px-6 pt-5 pb-4">
                <div className="flex items-center gap-3 mb-3">
                    <div style={{
                        width: '30px', height: '30px', borderRadius: '9px',
                        background: 'var(--gradient-brand)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                            <path d="M19.38 20A11.5 11.5 0 0 0 21 12l-9-4-9 4c0 5 2 8 4.62 10" />
                            <path d="M12 2v8" />
                        </svg>
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }}>
                            Vessel Journey Tracker
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            Enter a Transport ID to view the vessel's route, ports, and position
                        </div>
                    </div>
                </div>

                <form onSubmit={handleFetch} className="flex gap-3">
                    <div className="flex-1 relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            value={transportId}
                            onChange={e => setTransportId(e.target.value)}
                            placeholder="e.g. 6667207"
                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all duration-200 outline-none"
                            style={{
                                background: 'rgba(255,255,255,0.9)',
                                border: '1px solid var(--border-glass)',
                                color: 'var(--text-primary)',
                            }}
                            onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)' }}
                            onBlur={e => { e.target.style.borderColor = 'var(--border-glass)'; e.target.style.boxShadow = 'none' }}
                        />
                    </div>
                    <button type="submit" disabled={loading || !transportId.trim()} className="px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer shrink-0" style={{
                        background: loading ? 'rgba(0,0,0,0.06)' : 'var(--gradient-btn)',
                        color: loading ? 'var(--text-muted)' : '#fff',
                        boxShadow: loading ? 'none' : '0 4px 12px rgba(59,130,246,0.3)',
                        cursor: loading ? 'not-allowed' : 'pointer',
                    }}>
                        {loading ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                        ) : 'Fetch Track'}
                    </button>
                </form>

                {error && (
                    <div className="mt-3 flex items-center gap-2" style={{
                        padding: '10px 14px', borderRadius: '10px', fontSize: '12px',
                        background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#dc2626',
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        {error}
                    </div>
                )}
            </div>

            {/* ═══ Data ═══ */}
            {data && leg && (
                <div className="flex-1 flex flex-col min-h-0" style={{ borderTop: '1px solid var(--border-glass)' }}>

                    {/* ─── 1. Summary Card ─── */}
                    <div className="shrink-0" style={{ background: 'rgba(255,255,255,0.55)', borderBottom: '1px solid var(--border-glass)' }}>
                        <div className="max-w-6xl mx-auto px-6 py-4">
                            {/* Leg switcher (if multi-leg) */}
                            {legs.length > 1 && (
                                <div className="flex gap-1.5 mb-3 flex-wrap">
                                    {legs.map((l, i) => (
                                        <button key={i} onClick={() => setActiveLeg(i)} className="transition-all duration-200 cursor-pointer" style={{
                                            padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                                            border: `1px solid ${activeLeg === i ? 'rgba(59,130,246,0.4)' : 'var(--border-glass)'}`,
                                            background: activeLeg === i ? 'rgba(59,130,246,0.08)' : 'transparent',
                                            color: activeLeg === i ? '#3b82f6' : 'var(--text-muted)',
                                        }}>
                                            Leg {i + 1} — {l.vessel?.vessel_name || 'Unknown'}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center gap-4 flex-wrap">
                                {/* Status Badge */}
                                {(() => {
                                    const st = stateLabel(leg.state)
                                    return (
                                        <span style={{
                                            padding: '5px 14px', borderRadius: '20px',
                                            fontSize: '12px', fontWeight: 700,
                                            background: st.bg, color: st.color,
                                            border: `1px solid ${st.border}`,
                                            letterSpacing: '0.02em',
                                        }}>{st.text}</span>
                                    )
                                })()}

                                {/* Vessel Name */}
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }}>
                                        {vessel.vessel_name || 'Unknown Vessel'}
                                    </div>
                                    {vessel.vessel_imo_number && (
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            IMO {vessel.vessel_imo_number}
                                            {vessel.vessel_mmsi_number && ` · MMSI ${vessel.vessel_mmsi_number}`}
                                        </div>
                                    )}
                                </div>

                                {/* Route: Origin → Destination */}
                                <div className="flex items-center gap-2 ml-auto" style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                                    <div className="text-right">
                                        <div style={{ fontWeight: 700 }}>{origin?.port_name || leg.pol_un_location_code || '—'}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{leg.pol_un_location_code || ''}</div>
                                    </div>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        color: 'var(--accent-blue)', fontWeight: 700, fontSize: '16px',
                                        padding: '0 6px',
                                    }}>
                                        <div style={{ width: '20px', height: '2px', background: 'var(--accent-blue)', borderRadius: '1px' }} />
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{destination?.port_name || leg.pod_un_location_code || '—'}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{leg.pod_un_location_code || ''}</div>
                                    </div>
                                </div>

                                {/* Key Dates */}
                                <div className="flex gap-4 ml-4" style={{ fontSize: '11px' }}>
                                    {leg.start_datetime && (
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '9px', marginBottom: '1px' }}>Departed</div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fmtDate(leg.start_datetime)}</div>
                                        </div>
                                    )}
                                    {leg.end_datetime && (
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '9px', marginBottom: '1px' }}>Arrived</div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fmtDate(leg.end_datetime)}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── 2 & 3. Map + Timeline ─── */}
                    <div className="flex-1 flex min-h-0">
                        {/* LEFT: Vertical Timeline Sidebar */}
                        <div style={{
                            width: '300px', flexShrink: 0,
                            borderRight: '1px solid var(--border-glass)',
                            background: 'rgba(255,255,255,0.5)',
                            overflowY: 'auto',
                            display: 'flex', flexDirection: 'column',
                        }}>
                            <div style={{
                                padding: '14px 16px 6px',
                                fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                                letterSpacing: '0.1em', color: 'var(--text-muted)',
                                fontFamily: "'Outfit', sans-serif",
                            }}>
                                Journey Timeline
                            </div>

                            <div style={{ padding: '6px 16px 16px', flex: 1 }}>
                                {portcalls.map((pc, i) => {
                                    const isDone = !!pc.atd_datetime
                                    const isLast = i === portcalls.length - 1
                                    const dotColor = isDone ? '#059669' : '#94a3b8'
                                    const dotBorder = isDone ? '#059669' : '#cbd5e1'

                                    return (
                                        <div key={i} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                                            {/* Timeline track */}
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '18px', flexShrink: 0 }}>
                                                {/* Dot: filled for done, outlined for upcoming */}
                                                <div style={{
                                                    width: '12px', height: '12px', borderRadius: '50%',
                                                    background: isDone ? dotColor : 'transparent',
                                                    border: `2.5px solid ${dotBorder}`,
                                                    marginTop: '14px', flexShrink: 0,
                                                    boxShadow: isDone ? `0 0 8px ${dotColor}40` : 'none',
                                                    transition: 'all 0.3s',
                                                }} />
                                                {/* Connecting line */}
                                                {!isLast && (
                                                    <div style={{
                                                        width: '2px', flex: 1, minHeight: '16px',
                                                        background: isDone
                                                            ? 'linear-gradient(to bottom, #059669, #05966940)'
                                                            : 'linear-gradient(to bottom, #cbd5e1, #e2e8f0)',
                                                    }} />
                                                )}
                                            </div>

                                            {/* Port info card */}
                                            <button
                                                onClick={() => flyToPort(pc)}
                                                style={{
                                                    flex: 1, marginBottom: '4px',
                                                    padding: '10px 12px', borderRadius: '10px',
                                                    background: 'rgba(255,255,255,0.7)',
                                                    border: '1px solid var(--border-glass)',
                                                    textAlign: 'left', cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = 'rgba(59,130,246,0.04)'
                                                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'
                                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(59,130,246,0.06)'
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.7)'
                                                    e.currentTarget.style.borderColor = 'var(--border-glass)'
                                                    e.currentTarget.style.boxShadow = 'none'
                                                }}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                        {pc.port_name || pc.un_location_code}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '9px', fontWeight: 600,
                                                        padding: '1px 5px', borderRadius: '4px',
                                                        background: isDone ? 'rgba(5,150,105,0.08)' : 'rgba(0,0,0,0.04)',
                                                        color: isDone ? '#059669' : 'var(--text-muted)',
                                                    }}>
                                                        {pc.un_location_code}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                                                    {pc.ata_datetime && (
                                                        <div><span style={{ color: 'var(--text-muted)', fontWeight: 600, width: '28px', display: 'inline-block' }}>ATA</span> {fmtDate(pc.ata_datetime)}</div>
                                                    )}
                                                    {pc.atd_datetime && (
                                                        <div><span style={{ color: 'var(--text-muted)', fontWeight: 600, width: '28px', display: 'inline-block' }}>ATD</span> {fmtDate(pc.atd_datetime)}</div>
                                                    )}
                                                    {!isDone && pc.eta_datetime && (
                                                        <div><span style={{ color: '#f59e0b', fontWeight: 600, width: '28px', display: 'inline-block' }}>ETA</span> {fmtDate(pc.eta_datetime)}</div>
                                                    )}
                                                    {!isDone && pc.sta_datetime && !pc.eta_datetime && (
                                                        <div><span style={{ color: '#f59e0b', fontWeight: 600, width: '28px', display: 'inline-block' }}>STA</span> {fmtDate(pc.sta_datetime)}</div>
                                                    )}
                                                </div>
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* RIGHT: Map (main focus) */}
                        <div className="flex-1 relative" style={{ minHeight: '400px' }}>
                            <MapContainer
                                center={[15, 90]}
                                zoom={3}
                                style={{ position: 'absolute', inset: 0 }}
                                zoomControl={true}
                                ref={mapRef}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; OpenStreetMap contributors'
                                    maxZoom={19}
                                />

                                {/* Auto-fit bounds */}
                                <FitBoundsHelper positions={positions} portcalls={portcalls} />

                                {/* Historic polyline (cyan) */}
                                {(() => {
                                    const coords = historicPositions.map(p => [p.latitude, p.longitude])
                                    if (latestPosition) coords.push([latestPosition.latitude, latestPosition.longitude])
                                    return coords.length > 1 ? (
                                        <Polyline positions={coords} pathOptions={{ color: '#06b6d4', weight: 3.5, opacity: 0.9 }} />
                                    ) : null
                                })()}

                                {/* Historic dots (every 5th) */}
                                {historicPositions.filter((_, i) => i % 5 === 0).map((p, i) => (
                                    <CircleMarker key={`h-${i}`} center={[p.latitude, p.longitude]}
                                        radius={2.5} pathOptions={{ fillColor: '#06b6d4', fillOpacity: 0.6, color: '#06b6d4', weight: 0.5, opacity: 0.4 }} />
                                ))}

                                {/* Predicted polyline (amber dashed) */}
                                {(() => {
                                    const coords = []
                                    if (latestPosition) coords.push([latestPosition.latitude, latestPosition.longitude])
                                    predictedPositions.forEach(p => coords.push([p.latitude, p.longitude]))
                                    return coords.length > 1 ? (
                                        <Polyline positions={coords} pathOptions={{ color: '#f59e0b', weight: 3, opacity: 0.7, dashArray: '10 6' }} />
                                    ) : null
                                })()}

                                {/* Latest position (green dot) */}
                                {latestPosition && (
                                    <Marker
                                        position={[latestPosition.latitude, latestPosition.longitude]}
                                        icon={L.divIcon({
                                            className: '',
                                            html: '<div style="width:16px;height:16px;border-radius:50%;background:#10b981;border:3px solid #fff;box-shadow:0 0 12px rgba(16,185,129,0.6);position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)"></div>',
                                            iconSize: [16, 16], iconAnchor: [8, 8],
                                        })}
                                    >
                                        <Popup>
                                            <div style={{ fontSize: '12px', fontFamily: "'Inter',sans-serif" }}>
                                                <div style={{ fontWeight: 700, color: '#10b981', marginBottom: 4 }}>📍 Current Position</div>
                                                <div style={{ color: '#334155' }}>{latestPosition.latitude?.toFixed(5)}°, {latestPosition.longitude?.toFixed(5)}°</div>
                                                {latestPosition.position_datetime && (
                                                    <div style={{ color: '#64748b', marginTop: 3, fontSize: 11 }}>{fmtDate(latestPosition.position_datetime)}</div>
                                                )}
                                            </div>
                                        </Popup>
                                    </Marker>
                                )}

                                {/* Port markers */}
                                {portcalls.filter(pc => pc.latitude && pc.longitude).map((pc, idx) => {
                                    const isDone = !!pc.atd_datetime
                                    const isEdge = idx === 0 || idx === portcalls.length - 1
                                    const sz = isEdge ? 14 : 10
                                    const color = isDone ? '#059669' : '#f59e0b'
                                    return (
                                        <Marker key={`port-${idx}`}
                                            position={[pc.latitude, pc.longitude]}
                                            icon={L.divIcon({
                                                className: '',
                                                html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 0 8px ${color}80"></div>`,
                                                iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
                                            })}
                                        >
                                            <Popup>
                                                <div style={{ fontSize: 12, fontFamily: "'Inter',sans-serif", minWidth: 180 }}>
                                                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 2 }}>🚢 {pc.port_name || pc.un_location_code}</div>
                                                    <div style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>{pc.port_country || ''} · {pc.un_location_code || ''}</div>
                                                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                        {pc.ata_datetime && <div style={{ fontSize: 11 }}><b style={{ color: '#64748b' }}>ATA</b> {fmtDate(pc.ata_datetime)}</div>}
                                                        {pc.atd_datetime && <div style={{ fontSize: 11 }}><b style={{ color: '#64748b' }}>ATD</b> {fmtDate(pc.atd_datetime)}</div>}
                                                        {pc.eta_datetime && <div style={{ fontSize: 11 }}><b style={{ color: '#f59e0b' }}>ETA</b> {fmtDate(pc.eta_datetime)}</div>}
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    )
                                })}
                            </MapContainer>

                            {/* Map Legend */}
                            <div style={{
                                position: 'absolute', bottom: '16px', left: '16px', zIndex: 1000,
                                padding: '10px 14px', borderRadius: '10px',
                                background: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(8px)',
                                border: '1px solid var(--border-glass)',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                                fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '5px',
                            }}>
                                <div className="flex items-center gap-2">
                                    <div style={{ width: '16px', height: '3px', background: '#06b6d4', borderRadius: '2px' }} />
                                    <span style={{ color: 'var(--text-secondary)' }}>Historic Route</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div style={{ width: '16px', height: '3px', background: '#f59e0b', borderRadius: '2px', borderTop: '1px dashed #f59e0b' }} />
                                    <span style={{ color: 'var(--text-secondary)' }}>Predicted Route</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 4px rgba(16,185,129,0.5)' }} />
                                    <span style={{ color: 'var(--text-secondary)' }}>Current Position</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669', border: '2px solid #fff', boxShadow: '0 0 3px rgba(0,0,0,0.2)' }} />
                                    <span style={{ color: 'var(--text-secondary)' }}>Port (Completed)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', border: '2px solid #fff', boxShadow: '0 0 3px rgba(0,0,0,0.2)' }} />
                                    <span style={{ color: 'var(--text-secondary)' }}>Port (Upcoming)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── 4. Collapsible Vessel Details ─── */}
                    <div className="shrink-0" style={{ borderTop: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.55)' }}>
                        <button
                            onClick={() => setVesselDetailsOpen(v => !v)}
                            className="w-full flex items-center gap-2 transition-colors duration-200 cursor-pointer"
                            style={{
                                padding: '12px 24px', fontSize: '12px', fontWeight: 600,
                                color: 'var(--text-muted)', background: 'transparent', border: 'none',
                                textAlign: 'left',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                style={{ transform: vesselDetailsOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                                <path d="M19.38 20A11.5 11.5 0 0 0 21 12l-9-4-9 4c0 5 2 8 4.62 10" />
                            </svg>
                            Vessel Details
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '4px' }}>
                                — {vessel.vessel_name || 'N/A'}
                            </span>
                        </button>

                        {vesselDetailsOpen && (
                            <div style={{
                                padding: '0 24px 16px',
                                animation: 'slideUp 0.2s ease-out',
                            }}>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                    gap: '8px',
                                }}>
                                    {[
                                        { label: 'Vessel Name', value: vessel.vessel_name },
                                        { label: 'IMO Number', value: vessel.vessel_imo_number },
                                        { label: 'MMSI Number', value: vessel.vessel_mmsi_number },
                                        { label: 'Country', value: vessel.vessel_country_code },
                                        { label: 'Type', value: vessel.vessel_type },
                                        { label: 'Speed (SOG)', value: vessel.vessel_sog != null ? `${vessel.vessel_sog} knots` : null },
                                        { label: 'Heading (COG)', value: vessel.vessel_cog != null ? `${vessel.vessel_cog}°` : null },
                                        { label: 'Length', value: vessel.vessel_length != null ? `${vessel.vessel_length} m` : null },
                                        { label: 'Width', value: vessel.vessel_width != null ? `${vessel.vessel_width} m` : null },
                                        { label: 'Draught', value: vessel.vessel_draught != null ? `${vessel.vessel_draught} m` : null },
                                        { label: 'Year Built', value: vessel.vessel_year_built },
                                        { label: 'Navigation Status', value: vessel.vessel_navigation_status },
                                    ].filter(item => item.value != null).map((item, i) => (
                                        <div key={i} style={{
                                            padding: '10px 12px', borderRadius: '8px',
                                            background: 'rgba(255,255,255,0.7)',
                                            border: '1px solid var(--border-glass)',
                                        }}>
                                            <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                                                {item.label}
                                            </div>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {item.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ Empty state ═══ */}
            {!data && !loading && !error && (
                <div className="flex-1 flex items-center justify-center" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    <div style={{ textAlign: 'center', maxWidth: '320px' }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '20px',
                            background: 'rgba(59,130,246,0.06)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px',
                        }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                                <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                                <path d="M19.38 20A11.5 11.5 0 0 0 21 12l-9-4-9 4c0 5 2 8 4.62 10" />
                                <path d="M12 2v8" />
                            </svg>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                            Track a Vessel Journey
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            Enter a Transport ID above to view the vessel's route, port calls, and live position on the map.
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Loading ═══ */}
            {loading && (
                <div className="flex-1 flex items-center justify-center">
                    <div style={{ textAlign: 'center' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }}>
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Fetching transport track data...</div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Map helper: auto-fit bounds ────────────────────────────────────────────────

function FitBoundsHelper({ positions, portcalls }) {
    const map = useMap()

    useEffect(() => {
        const pts = []
        positions.forEach(p => {
            if (p.latitude && p.longitude) pts.push([p.latitude, p.longitude])
        })
        portcalls.forEach(pc => {
            if (pc.latitude && pc.longitude) pts.push([pc.latitude, pc.longitude])
        })

        if (pts.length > 1) {
            map.fitBounds(L.latLngBounds(pts), { padding: [60, 60] })
        } else if (pts.length === 1) {
            map.setView(pts[0], 8)
        }
    }, [positions, portcalls, map])

    return null
}
