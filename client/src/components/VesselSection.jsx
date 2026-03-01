import { useState, useMemo, useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'
import { douglasPeucker, segmentVoyage } from '../utils/mapHelpers'

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4000/api' : 'https://tracking-bgr2.onrender.com/api')

// ---- DESIGN TOKENS ----
const T = {
    bg: '#f1f5f9', card: '#ffffff', border: '#e2e8f0',
    shadow: '0 1px 4px rgba(0,0,0,0.05)',
    primary: '#0369a1', success: '#16a34a', warning: '#d97706', future: '#2563eb',
    text: '#0f172a', textMuted: '#64748b', textLight: '#94a3b8',
    font: "'Segoe UI', system-ui, -apple-system, sans-serif",
    mono: "'Segoe UI Mono', 'SF Mono', 'Consolas', monospace",
    past: { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
    fut: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
    portColors: { origin: '#3b82f6', mid: '#22c55e', dest: '#a855f7' },
    r: '6px',
}

// ---- HELPERS ----
function fmt(d) {
    if (!d) return '-'
    try {
        return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    } catch { return d }
}
function fmtShort(d) {
    if (!d) return '-'
    try { return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) } catch { return d }
}
function sortDate(pc) {
    const d = pc.ata_datetime || pc.atd_datetime || pc.eta_datetime || pc.sta_datetime
    return d ? new Date(d).getTime() : Infinity
}
function dwell(pc) {
    if (!pc.ata_datetime || !pc.atd_datetime) return null
    const ms = new Date(pc.atd_datetime) - new Date(pc.ata_datetime)
    if (ms < 0) return null
    const h = Math.floor(ms / 3600000)
    const m = Math.round((ms % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
}
function journeyTime(start, end) {
    if (!start || !end) return '-'
    const ms = new Date(end) - new Date(start)
    if (ms < 0) return '-'
    const d = Math.floor(ms / 86400000)
    const h = Math.floor((ms % 86400000) / 3600000)
    return d > 0 ? `${d}d ${h}h` : `${h}h`
}
function findPort(pcs, code) {
    return pcs.find(pc => pc.un_location_code === code) || null
}
function countryFlag(code) {
    if (!code || code.length < 2) return ''
    const c = code.slice(0, 2).toUpperCase()
    return String.fromCodePoint(...[...c].map(ch => 0x1F1E6 + ch.charCodeAt(0) - 65))
}

// ---- MAIN COMPONENT ----
export default function VesselSection({ auth }) {
    const [transportId, setTransportId] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [data, setData] = useState(null)
    const [activeLeg, setActiveLeg] = useState(0)

    const handleFetch = async (e) => {
        e.preventDefault()
        const id = transportId.trim()
        if (!id) return
        setLoading(true); setError(''); setData(null); setActiveLeg(0)
        try {
            const res = await fetch(`${API_URL}/vessel-track?id=${id}&token=${auth.token}&apiKey=${auth.apiKey}`)
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
            setData(json)
        } catch (err) { setError(err.message) }
        finally { setLoading(false) }
    }

    const legs = data?.transport_tracks || []
    const isMultiLeg = legs.length > 1
    const leg = legs[activeLeg] || null

    return (
        <div style={{ flex: 1, background: T.bg, fontFamily: T.font, fontSize: '12px', color: T.text, overflowY: 'auto' }}>
            {/* Input Bar */}
            <div style={{ maxWidth: 600, margin: '20px auto 0', padding: '0 16px' }}>
                <form onSubmit={handleFetch} style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.textLight }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input
                            value={transportId} onChange={e => setTransportId(e.target.value)}
                            placeholder="Transport ID, e.g. 6667053"
                            style={{
                                width: '100%', padding: '8px 8px 8px 32px', borderRadius: T.r,
                                border: `1px solid ${T.border}`, fontSize: 12, fontFamily: T.font,
                                background: '#fff', outline: 'none', color: T.text,
                            }}
                        />
                    </div>
                    <button type="submit" disabled={loading || !transportId.trim()} style={{
                        padding: '8px 18px', borderRadius: T.r, border: 'none', cursor: 'pointer',
                        background: T.primary, color: '#fff', fontSize: 11, fontWeight: 600,
                        opacity: (loading || !transportId.trim()) ? 0.5 : 1,
                    }}>
                        {loading ? 'Loading...' : 'Fetch'}
                    </button>
                </form>
                {error && <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: T.r, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 11 }}>! {error}</div>}
            </div>

            {/* Loading */}
            {loading && <div style={{ textAlign: 'center', padding: 40, color: T.textMuted }}>Loading vessel data...</div>}

            {/* Data Loaded */}
            {data && leg && !loading && (
                <div style={{ padding: '12px 16px', maxWidth: 1200, margin: '0 auto' }}>
                    <TopBar leg={leg} legs={legs} data={data} />
                    {isMultiLeg && <JourneyStepper legs={legs} activeLeg={activeLeg} setActiveLeg={setActiveLeg} />}
                    {isMultiLeg
                        ? <MultiLegView legs={legs} activeLeg={activeLeg} setActiveLeg={setActiveLeg} />
                        : <SingleLegView leg={leg} />
                    }
                </div>
            )}

            {/* Empty state */}
            {!data && !loading && !error && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: T.textMuted }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="1.5" style={{ marginBottom: 8 }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Vessel Journey Tracker</div>
                    <div>Enter a Transport ID above to view the vessel's route, ports, and positions.</div>
                </div>
            )}
        </div>
    )
}

// ---- TOP BAR ----
function TopBar({ leg, legs, data }) {
    const v = leg?.vessel || {}
    const state = leg?.state
    const isComplete = state === 'PAST'
    const pc = leg?.portcalls || []
    const sorted = [...pc].sort((a, b) => sortDate(a) - sortDate(b))
    const origin = findPort(sorted, leg?.pol_un_location_code) || sorted[0]
    const dest = findPort(sorted, leg?.pod_un_location_code) || sorted[sorted.length - 1]

    const divider = <div style={{ width: 1, height: 20, background: T.border, flexShrink: 0 }} />

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
            background: T.card, border: `1px solid ${T.border}`, borderRadius: T.r,
            boxShadow: T.shadow, marginBottom: 10, flexWrap: 'wrap',
        }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: T.primary, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                VesselTrack
            </span>
            {divider}
            <span style={{ fontSize: 11, color: T.textMuted }}>Shipment <b style={{ color: T.text }}>{data?.shipment_id || data?.transport_document_reference || '-'}</b></span>
            {divider}
            <span style={{ fontSize: 11, color: T.textMuted }}>Carrier <b style={{ color: T.text }}>{leg?.carrier_name || v?.carrier_code || '-'}</b></span>
            {divider}
            <span style={{ fontSize: 11, color: T.textMuted }}>
                {origin?.port_name || leg?.pol_un_location_code || '?'} {'>'} {dest?.port_name || leg?.pod_un_location_code || '?'}
            </span>
            {v.vessel_country_code && <>
                {divider}
                <span style={{ fontSize: 13 }}>{countryFlag(v.vessel_country_code)}</span>
            </>}
            <div style={{ marginLeft: 'auto' }}>
                <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                    background: isComplete ? T.past.bg : T.fut.bg,
                    color: isComplete ? T.past.color : T.fut.color,
                    border: `1px solid ${isComplete ? T.past.border : T.fut.border}`,
                }}>
                    {isComplete ? 'COMPLETED' : state === 'ONGOING' ? 'IN TRANSIT' : 'UPCOMING'}
                </span>
            </div>
        </div>
    )
}

// ---- JOURNEY STEPPER ----
function JourneyStepper({ legs, activeLeg, setActiveLeg }) {
    const steps = []
    legs.forEach((l, li) => {
        const pcs = [...(l.portcalls || [])].sort((a, b) => sortDate(a) - sortDate(b))
        pcs.forEach((pc) => {
            if (steps.length && steps[steps.length - 1].code === pc.un_location_code) return
            steps.push({ ...pc, legIdx: li, isPast: l.state === 'PAST', vessel: l.vessel?.vessel_name, legLabel: `Leg ${li + 1}` })
        })
    })

    return (
        <div style={{
            background: T.card, border: `1px solid ${T.border}`, borderRadius: T.r,
            boxShadow: T.shadow, marginBottom: 10, overflowX: 'auto', padding: '12px 16px',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', minWidth: steps.length * 140 }}>
                {steps.map((s, i) => {
                    const isLast = i === steps.length - 1
                    const dotColor = i === 0 ? T.portColors.origin : isLast ? T.portColors.dest : T.portColors.mid
                    const nextIsPast = !isLast && steps[i + 1].isPast
                    const lineColor = s.isPast && nextIsPast ? T.success : T.future
                    const lineDash = s.isPast && nextIsPast ? 'none' : '4 3'
                    return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: isLast ? '0 0 auto' : 1 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 60, flexShrink: 0, cursor: 'pointer' }}
                                onClick={() => setActiveLeg(s.legIdx)}>
                                <div style={{
                                    width: 16, height: 16, borderRadius: '50%', background: dotColor, border: '3px solid #fff',
                                    boxShadow: `0 0 0 2px ${dotColor}40`, marginBottom: 4,
                                }} />
                                <div style={{ fontSize: 10, fontWeight: 600, color: T.text, textAlign: 'center', lineHeight: 1.2 }}>
                                    {s.port_name || s.un_location_code}
                                </div>
                                <div style={{ fontSize: 8, color: dotColor, fontWeight: 600 }}>{s.un_location_code}</div>
                                <div style={{ fontSize: 8, color: T.textLight }}>{fmtShort(s.ata_datetime || s.eta_datetime)}</div>
                            </div>
                            {!isLast && (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 4px', minWidth: 40 }}>
                                    <svg width="100%" height="6" style={{ overflow: 'visible' }}>
                                        <line x1="0" y1="3" x2="100%" y2="3" stroke={lineColor} strokeWidth="2" strokeDasharray={lineDash} />
                                    </svg>
                                    {s.vessel && <div style={{ fontSize: 7, color: T.textLight, marginTop: 2, whiteSpace: 'nowrap' }}>{s.vessel}</div>}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ---- STATS BAR ----
function StatsBar({ leg }) {
    const v = leg?.vessel || {}
    const pcs = leg?.portcalls || []
    const pos = leg?.positions || []
    const jt = journeyTime(leg?.start_datetime, leg?.end_datetime)
    const size = v.vessel_length && v.vessel_width ? `${v.vessel_length}x${v.vessel_width}m` : '-'

    const pills = [
        { val: jt, label: 'Journey Time' },
        { val: `${pcs.length}`, label: 'Port Calls' },
        { val: size, label: 'Vessel Size' },
        { val: `${pos.length}`, label: 'AIS Positions' },
        { val: v.vessel_sog != null ? `${v.vessel_sog} kn` : '-', label: 'Speed (SOG)' },
    ]

    return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${pills.length}, 1fr)`, gap: 8, marginBottom: 10 }}>
            {pills.map((p, i) => (
                <div key={i} style={{
                    background: T.card, border: `1px solid ${T.border}`, borderRadius: T.r,
                    boxShadow: T.shadow, padding: '10px 12px', textAlign: 'center',
                }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: T.primary }}>{p.val}</div>
                    <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.textMuted, marginTop: 2 }}>{p.label}</div>
                </div>
            ))}
        </div>
    )
}

// ---- SINGLE-LEG VIEW ----
function SingleLegView({ leg }) {
    return (
        <>
            <StatsBar leg={leg} />
            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 10, alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <VesselInfoCard leg={leg} />
                    <PortTimeline leg={leg} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <LeafletRouteMap leg={leg} wide />
                    <AisTable leg={leg} />
                </div>
            </div>
        </>
    )
}

// ---- VESSEL INFO CARD ----
function VesselInfoCard({ leg, mini = false }) {
    const v = leg?.vessel || {}
    const rows = [
        { label: 'Vessel Name', value: v.vessel_name, color: T.primary },
        { label: 'IMO', value: v.vessel_imo_number },
        { label: 'MMSI', value: v.vessel_mmsi_number },
        { label: 'Call Sign', value: v.vessel_call_sign },
        { label: 'Flag', value: v.vessel_country_code ? `${countryFlag(v.vessel_country_code)} ${v.vessel_country_code}` : null },
        { label: 'Type', value: v.vessel_type },
        { label: 'Length', value: v.vessel_length ? `${v.vessel_length} m` : null },
        { label: 'Width', value: v.vessel_width ? `${v.vessel_width} m` : null },
        { label: 'Speed (SOG)', value: v.vessel_sog != null ? `${v.vessel_sog} kn` : null },
        { label: 'Course (COG)', value: v.vessel_cog != null ? `${v.vessel_cog} deg` : null },
        { label: 'Draught', value: v.vessel_draught ? `${v.vessel_draught} m` : null },
        { label: 'Year Built', value: v.vessel_year_built },
        { label: 'Nav Status', value: v.vessel_navigation_status },
        { label: 'Carrier', value: leg?.carrier_name || v.carrier_code, color: T.success },
    ].filter(r => r.value != null)

    const display = mini ? rows.slice(0, 6) : rows

    return (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.r, boxShadow: T.shadow, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}`, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.textMuted }}>
                VESSEL INFORMATION
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {display.map((r, i) => (
                    <div key={i} style={{ padding: '6px 12px', borderBottom: `1px solid ${T.border}`, borderRight: i % 2 === 0 ? `1px solid ${T.border}` : 'none' }}>
                        <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.textMuted, marginBottom: 1 }}>{r.label}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: r.color || T.text }}>{r.value}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ---- PORT CALL TIMELINE ----
function PortTimeline({ leg, mini = false }) {
    const raw = leg?.portcalls || []
    const pcs = useMemo(() => [...raw].sort((a, b) => sortDate(a) - sortDate(b)), [raw])
    const polCode = leg?.pol_un_location_code
    const podCode = leg?.pod_un_location_code

    return (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.r, boxShadow: T.shadow, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}`, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.textMuted }}>
                PORT CALL TIMELINE
            </div>
            <div style={{ padding: '8px 12px' }}>
                {pcs.map((pc, i) => {
                    const isLast = i === pcs.length - 1
                    const isOrigin = pc.un_location_code === polCode
                    const isDest = pc.un_location_code === podCode
                    const dotColor = isOrigin ? T.portColors.origin : isDest ? T.portColors.dest : T.portColors.mid
                    const isDocked = pc.ata_datetime && !pc.atd_datetime
                    const dw = dwell(pc)
                    const hasAnyDep = !!pc.atd_datetime

                    return (
                        <div key={i} style={{ display: 'flex', gap: 10, position: 'relative' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 18, flexShrink: 0 }}>
                                <div style={{
                                    width: 12, height: 12, borderRadius: '50%',
                                    background: hasAnyDep || isDocked ? dotColor : '#e2e8f0',
                                    border: `2px solid ${dotColor}`, marginTop: 4, flexShrink: 0,
                                    boxShadow: `0 0 0 3px ${dotColor}18`,
                                }} />
                                {!isLast && (
                                    <div style={{
                                        width: 2, flex: 1, minHeight: 14,
                                        background: hasAnyDep ? `linear-gradient(${T.success}, ${T.success}80)` : `linear-gradient(${T.border}, ${T.border})`,
                                    }} />
                                )}
                            </div>
                            <div style={{ flex: 1, paddingBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: dotColor }}>{pc.port_name || pc.un_location_code}</span>
                                    <span style={{ fontSize: 9, fontWeight: 600, color: dotColor, opacity: 0.7 }}>{pc.un_location_code}</span>
                                </div>
                                {pc.port_country && (
                                    <div style={{ fontSize: 9, color: T.textLight, marginBottom: 2 }}>
                                        {countryFlag(pc.un_location_code)} {pc.port_country}
                                        {pc.latitude && pc.longitude && <span style={{ fontFamily: T.mono, marginLeft: 6 }}>{pc.latitude.toFixed(2)}, {pc.longitude.toFixed(2)}</span>}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 9 }}>
                                    {pc.ata_datetime && <span><b style={{ color: T.textMuted }}>ATA</b> {fmt(pc.ata_datetime)}</span>}
                                    {pc.atd_datetime && <span><b style={{ color: T.textMuted }}>ATD</b> {fmt(pc.atd_datetime)}</span>}
                                    {!pc.ata_datetime && pc.eta_datetime && <span><b style={{ color: T.warning }}>ETA</b> {fmt(pc.eta_datetime)}</span>}
                                    {dw && <span style={{ color: T.warning, fontWeight: 600 }}>Dwell: {dw}</span>}
                                    {isDocked && <span style={{ color: '#ea580c', fontWeight: 700 }}>Still Docked</span>}
                                </div>
                                {leg?.voyage_no && !mini && (
                                    <span style={{
                                        display: 'inline-block', marginTop: 3, padding: '1px 6px',
                                        borderRadius: 3, fontSize: 8, fontFamily: T.mono,
                                        background: '#f8fafc', border: `1px solid ${T.border}`, color: T.textMuted,
                                    }}>
                                        {leg.voyage_no}
                                    </span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ---- LEAFLET ROUTE MAP ----
function LeafletRouteMap({ leg, wide = false }) {
    const positions = leg?.positions || []
    const raw = leg?.portcalls || []
    const pcs = useMemo(() => [...raw].sort((a, b) => sortDate(a) - sortDate(b)), [raw])
    const polCode = leg?.pol_un_location_code
    const podCode = leg?.pod_un_location_code

    const historic = useMemo(() => positions.filter(p => p.tag === 'historic'), [positions])
    const predicted = useMemo(() => positions.filter(p => p.tag === 'predicted'), [positions])
    const latest = useMemo(() => positions.find(p => p.tag === 'latest') || null, [positions])

    const histCoords = useMemo(() => {
        const pts = historic.filter(p => p.latitude && p.longitude).map(p => [p.latitude, p.longitude])
        if (latest) pts.push([latest.latitude, latest.longitude])
        return douglasPeucker(pts, 0.003)
    }, [historic, latest])

    const predCoords = useMemo(() => {
        const pts = []
        if (latest) pts.push([latest.latitude, latest.longitude])
        predicted.filter(p => p.latitude && p.longitude).forEach(p => pts.push([p.latitude, p.longitude]))
        return douglasPeucker(pts, 0.003)
    }, [predicted, latest])

    return (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.r, boxShadow: T.shadow, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}`, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.textMuted }}>
                ROUTE MAP
            </div>
            <div style={{ height: wide ? 380 : 240, position: 'relative' }}>
                <MapContainer center={[10, 80]} zoom={3} style={{ position: 'absolute', inset: 0 }} zoomControl={true}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap'
                        maxZoom={19}
                    />
                    <FitBounds positions={positions} portcalls={pcs} />

                    {/* Historic route - solid green */}
                    {histCoords.length > 1 && (
                        <Polyline positions={histCoords} pathOptions={{ color: T.success, weight: 3, opacity: 0.9 }} />
                    )}

                    {/* Predicted route - dashed blue */}
                    {predCoords.length > 1 && (
                        <Polyline positions={predCoords} pathOptions={{ color: T.future, weight: 2.5, opacity: 0.7, dashArray: '8 5' }} />
                    )}

                    {/* Waypoint dots */}
                    {histCoords.filter((_, i) => i > 0 && i < histCoords.length - 1 && i % 6 === 0).map((c, i) => (
                        <CircleMarker key={`wp-${i}`} center={c} radius={2} pathOptions={{ fillColor: T.success, fillOpacity: 0.5, color: T.success, weight: 0.5, opacity: 0.3 }} />
                    ))}

                    {/* Latest position */}
                    {latest && (
                        <Marker
                            position={[latest.latitude, latest.longitude]}
                            icon={L.divIcon({
                                className: '',
                                html: '<div style="width:14px;height:14px;border-radius:50%;background:' + T.success + ';border:3px solid #fff;box-shadow:0 0 10px ' + T.success + '99;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)"></div>',
                                iconSize: [14, 14], iconAnchor: [7, 7],
                            })}
                        >
                            <Popup>
                                <div style={{ fontSize: 11, fontFamily: T.font }}>
                                    <div style={{ fontWeight: 700, color: T.success, marginBottom: 3 }}>Current Position</div>
                                    <div style={{ fontFamily: T.mono, color: T.text }}>{latest.latitude?.toFixed(5)}, {latest.longitude?.toFixed(5)}</div>
                                    {latest.position_datetime && <div style={{ color: T.textMuted, marginTop: 2, fontSize: 10 }}>{fmt(latest.position_datetime)}</div>}
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Port markers */}
                    {pcs.filter(pc => pc.latitude && pc.longitude).map((pc, idx) => {
                        const isOrigin = pc.un_location_code === polCode
                        const isDest = pc.un_location_code === podCode
                        const c = isOrigin ? T.portColors.origin : isDest ? T.portColors.dest : T.portColors.mid
                        const sz = (isOrigin || isDest) ? 14 : 10
                        return (
                            <Marker key={`port-${idx}`}
                                position={[pc.latitude, pc.longitude]}
                                icon={L.divIcon({
                                    className: '',
                                    html: '<div style="width:' + sz + 'px;height:' + sz + 'px;border-radius:50%;background:#fff;border:2.5px solid ' + c + ';box-shadow:0 0 6px ' + c + '60;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)"><div style="width:' + (sz - 6) + 'px;height:' + (sz - 6) + 'px;border-radius:50%;background:' + c + ';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)"></div></div>',
                                    iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
                                })}
                            >
                                <Popup>
                                    <div style={{ fontSize: 11, fontFamily: T.font, minWidth: 160 }}>
                                        <div style={{ fontWeight: 700, fontSize: 12, color: T.text, marginBottom: 1 }}>{pc.port_name || pc.un_location_code}</div>
                                        <div style={{ color: T.textMuted, fontSize: 10, marginBottom: 5 }}>{countryFlag(pc.un_location_code)} {pc.port_country || ''} | {pc.un_location_code}</div>
                                        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            {pc.ata_datetime && <div style={{ fontSize: 10 }}><b style={{ color: T.textMuted }}>ATA</b> {fmt(pc.ata_datetime)}</div>}
                                            {pc.atd_datetime && <div style={{ fontSize: 10 }}><b style={{ color: T.textMuted }}>ATD</b> {fmt(pc.atd_datetime)}</div>}
                                            {pc.eta_datetime && <div style={{ fontSize: 10 }}><b style={{ color: T.warning }}>ETA</b> {fmt(pc.eta_datetime)}</div>}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    })}
                </MapContainer>

                {/* Legend */}
                <div style={{
                    position: 'absolute', bottom: 10, right: 10, zIndex: 1000,
                    padding: '6px 10px', borderRadius: T.r,
                    background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)',
                    border: `1px solid ${T.border}`, boxShadow: T.shadow,
                    fontSize: 9, display: 'flex', flexDirection: 'column', gap: 3,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 14, height: 2.5, background: T.success, borderRadius: 2 }} />
                        <span style={{ color: T.textMuted }}>Historic Route</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 14, height: 2.5, background: T.future, borderRadius: 2, borderTop: `1px dashed ${T.future}` }} />
                        <span style={{ color: T.textMuted }}>Predicted Route</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: T.success, boxShadow: `0 0 3px ${T.success}80` }} />
                        <span style={{ color: T.textMuted }}>Current Position</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

/* Auto-fit map bounds */
function FitBounds({ positions, portcalls }) {
    const map = useMap()
    useEffect(() => {
        const pts = []
        positions.forEach(p => { if (p.latitude && p.longitude) pts.push([p.latitude, p.longitude]) })
        portcalls.forEach(pc => { if (pc.latitude && pc.longitude) pts.push([pc.latitude, pc.longitude]) })
        if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] })
        else if (pts.length === 1) map.setView(pts[0], 8)
    }, [positions, portcalls, map])
    return null
}

// ---- AIS POSITION LOG TABLE ----
function AisTable({ leg, maxRows = 100 }) {
    const positions = leg?.positions || []

    const historic = positions.filter(p => p.tag === 'historic')
    const predicted = positions.filter(p => p.tag === 'predicted')
    const latest = positions.find(p => p.tag === 'latest')
    const all = [...historic, ...(latest ? [latest] : []), ...predicted].slice(0, maxRows)

    const thStyle = {
        padding: '6px 8px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: T.textMuted, borderBottom: `2px solid ${T.border}`,
        textAlign: 'left', position: 'sticky', top: 0, background: T.card,
    }
    const tdStyle = (i) => ({
        padding: '5px 8px', fontSize: 10, borderBottom: `1px solid ${T.border}`,
        background: i % 2 === 0 ? '#fff' : '#f8fafc',
    })

    return (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.r, boxShadow: T.shadow, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}`, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.textMuted, display: 'flex', justifyContent: 'space-between' }}>
                <span>AIS POSITION LOG</span>
                <span style={{ fontWeight: 400, color: T.textLight }}>{positions.length} records</span>
            </div>
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={thStyle}>#</th>
                            <th style={thStyle}>Latitude</th>
                            <th style={thStyle}>Longitude</th>
                            <th style={thStyle}>Date/Time UTC</th>
                            <th style={thStyle}>Context</th>
                        </tr>
                    </thead>
                    <tbody>
                        {all.map((p, i) => {
                            const isH = p.tag === 'historic'
                            const isL = p.tag === 'latest'
                            return (
                                <tr key={i} style={{ transition: 'background 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#f8fafc'}>
                                    <td style={tdStyle(i)}>{i + 1}</td>
                                    <td style={{ ...tdStyle(i), fontFamily: T.mono, color: T.primary, fontWeight: 500 }}>{p.latitude?.toFixed(5)}</td>
                                    <td style={{ ...tdStyle(i), fontFamily: T.mono, color: T.primary, fontWeight: 500 }}>{p.longitude?.toFixed(5)}</td>
                                    <td style={tdStyle(i)}>{fmt(p.position_datetime)}</td>
                                    <td style={tdStyle(i)}>
                                        <span style={{
                                            display: 'inline-block', padding: '1px 6px', borderRadius: 10, fontSize: 8, fontWeight: 600,
                                            background: isH ? T.past.bg : isL ? '#fef3c7' : T.fut.bg,
                                            color: isH ? T.past.color : isL ? T.warning : T.fut.color,
                                            border: `1px solid ${isH ? T.past.border : isL ? '#fde68a' : T.fut.border}`,
                                        }}>
                                            {isH ? 'Historic' : isL ? 'Latest' : 'Predicted'}
                                        </span>
                                        {p.position_context && <span style={{ marginLeft: 4, color: T.textMuted }}>{p.position_context}</span>}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ---- MULTI-LEG VIEW ----
function MultiLegView({ legs, activeLeg, setActiveLeg }) {
    return (
        <>
            <StatsBar leg={legs[activeLeg]} />
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(legs.length, 3)}, 1fr)`, gap: 10, marginBottom: 10 }}>
                {legs.map((l, i) => {
                    const isFuture = l.state === 'FUTURE'
                    const isActive = i === activeLeg
                    const pcs = [...(l.portcalls || [])].sort((a, b) => sortDate(a) - sortDate(b))
                    const origin = findPort(pcs, l.pol_un_location_code) || pcs[0]
                    const dest = findPort(pcs, l.pod_un_location_code) || pcs[pcs.length - 1]
                    const st = l.state === 'PAST' ? T.past : T.fut

                    return (
                        <div key={i} onClick={() => setActiveLeg(i)} style={{
                            background: T.card, borderRadius: T.r, boxShadow: T.shadow, overflow: 'hidden', cursor: 'pointer',
                            border: isActive ? `2px solid ${T.primary}` : isFuture ? `1px solid ${T.fut.border}` : `1px solid ${T.border}`,
                            opacity: isActive ? 1 : 0.85,
                            transition: 'all 0.2s',
                        }}>
                            <div style={{
                                padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: isFuture ? '#eff6ff' : isActive ? '#f0f9ff' : '#f8fafc',
                                borderBottom: `1px solid ${T.border}`,
                            }}>
                                <span style={{
                                    fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                                    background: i === 0 ? T.portColors.origin : i === legs.length - 1 ? T.portColors.dest : T.portColors.mid,
                                    color: '#fff',
                                }}>
                                    LEG {i + 1}
                                </span>
                                <span style={{ fontSize: 10, color: T.textMuted }}>
                                    {origin?.port_name || l.pol_un_location_code} {'>'} {dest?.port_name || l.pod_un_location_code}
                                </span>
                                <span style={{
                                    fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 10,
                                    background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                                }}>
                                    {l.state}
                                </span>
                            </div>
                            <div style={{ padding: '8px 12px' }}>
                                <VesselInfoCard leg={l} mini />
                                <div style={{ marginTop: 8 }}><PortTimeline leg={l} mini /></div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <LeafletRouteMap leg={legs[activeLeg]} wide />
                <AisTable leg={legs[activeLeg]} />
            </div>
        </>
    )
}
