import { useState, useMemo } from 'react'
import { douglasPeucker, segmentVoyage, computeBounds, lngToX, latToY } from '../utils/mapHelpers'

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4000/api' : 'https://tracking-bgr2.onrender.com/api')

/* ═══════════════════════════════════════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */
function fmt(d) {
    if (!d) return '—'
    try {
        return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    } catch { return d }
}
function fmtShort(d) {
    if (!d) return '—'
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
    if (!start || !end) return '—'
    const ms = new Date(end) - new Date(start)
    if (ms < 0) return '—'
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

/* ═══════════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */
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
            {/* ──── Input Bar ──── */}
            <div style={{ maxWidth: 600, margin: '20px auto 0', padding: '0 16px' }}>
                <form onSubmit={handleFetch} style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.textLight, fontSize: 14 }}>🔍</span>
                        <input
                            value={transportId} onChange={e => setTransportId(e.target.value)}
                            placeholder="Transport ID, e.g. 6667207"
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
                        {loading ? '⏳' : 'Fetch'}
                    </button>
                </form>
                {error && <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: T.r, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 11 }}>⚠ {error}</div>}
            </div>

            {/* ──── Loading ──── */}
            {loading && <div style={{ textAlign: 'center', padding: 40, color: T.textMuted }}>Loading vessel data...</div>}

            {/* ──── Data Loaded ──── */}
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

            {/* ──── Empty state ──── */}
            {!data && !loading && !error && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: T.textMuted }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>⚓</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Vessel Journey Tracker</div>
                    <div>Enter a Transport ID above to view the vessel's route, ports, and position.</div>
                </div>
            )}
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TOP BAR
   ═══════════════════════════════════════════════════════════════════════════════ */
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
            <span style={{ fontWeight: 700, fontSize: 13, color: T.primary, whiteSpace: 'nowrap' }}>⚓ VesselTrack</span>
            {divider}
            <span style={{ fontSize: 11, color: T.textMuted }}>Shipment <b style={{ color: T.text }}>{data?.shipment_id || data?.transport_document_reference || '—'}</b></span>
            {divider}
            <span style={{ fontSize: 11, color: T.textMuted }}>Carrier <b style={{ color: T.text }}>{leg?.carrier_name || v?.carrier_code || '—'}</b></span>
            {divider}
            <span style={{ fontSize: 11, color: T.textMuted }}>
                {origin?.port_name || leg?.pol_un_location_code || '?'} → {dest?.port_name || leg?.pod_un_location_code || '?'}
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
                    {isComplete ? '✓ COMPLETED' : state === 'ONGOING' ? '⏳ IN TRANSIT' : '⏳ UPCOMING'}
                </span>
            </div>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   JOURNEY STEPPER
   ═══════════════════════════════════════════════════════════════════════════════ */
function JourneyStepper({ legs, activeLeg, setActiveLeg }) {
    // Collect all ports across all legs in order
    const steps = []
    legs.forEach((l, li) => {
        const pcs = [...(l.portcalls || [])].sort((a, b) => sortDate(a) - sortDate(b))
        pcs.forEach((pc, pi) => {
            // avoid duplicate consecutive ports
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
                            {/* Port dot + label */}
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
                            {/* Connecting line */}
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

/* ═══════════════════════════════════════════════════════════════════════════════
   STATS BAR
   ═══════════════════════════════════════════════════════════════════════════════ */
function StatsBar({ leg }) {
    const v = leg?.vessel || {}
    const pcs = leg?.portcalls || []
    const pos = leg?.positions || []
    const jt = journeyTime(leg?.start_datetime, leg?.end_datetime)
    const size = v.vessel_length && v.vessel_width ? `${v.vessel_length}×${v.vessel_width}m` : '—'

    const pills = [
        { val: jt, label: 'Journey Time' },
        { val: `${pcs.length}`, label: 'Port Calls' },
        { val: size, label: 'Vessel Size' },
        { val: `${pos.length}`, label: 'AIS Positions' },
        { val: v.vessel_sog != null ? `${v.vessel_sog} kn` : '—', label: 'Speed (SOG)' },
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

/* ═══════════════════════════════════════════════════════════════════════════════
   SINGLE-LEG VIEW (2-column)
   ═══════════════════════════════════════════════════════════════════════════════ */
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
                    <SvgRouteMap leg={leg} wide />
                    <AisTable leg={leg} />
                </div>
            </div>
        </>
    )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   VESSEL INFO CARD
   ═══════════════════════════════════════════════════════════════════════════════ */
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
        { label: 'Course (COG)', value: v.vessel_cog != null ? `${v.vessel_cog}°` : null },
        { label: 'Draught', value: v.vessel_draught ? `${v.vessel_draught} m` : null },
        { label: 'Year Built', value: v.vessel_year_built },
        { label: 'Nav Status', value: v.vessel_navigation_status },
        { label: 'Carrier', value: leg?.carrier_name || v.carrier_code, color: T.success },
    ].filter(r => r.value != null)

    const display = mini ? rows.slice(0, 6) : rows

    return (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.r, boxShadow: T.shadow, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}`, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.textMuted }}>
                🚢 Vessel Information
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

/* ═══════════════════════════════════════════════════════════════════════════════
   PORT CALL TIMELINE
   ═══════════════════════════════════════════════════════════════════════════════ */
function PortTimeline({ leg, mini = false }) {
    const raw = leg?.portcalls || []
    const pcs = useMemo(() => [...raw].sort((a, b) => sortDate(a) - sortDate(b)), [raw])
    const polCode = leg?.pol_un_location_code
    const podCode = leg?.pod_un_location_code

    return (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.r, boxShadow: T.shadow, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}`, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.textMuted }}>
                📍 Port Call Timeline
            </div>
            <div style={{ padding: '8px 12px' }}>
                {pcs.map((pc, i) => {
                    const isFirst = i === 0
                    const isLast = i === pcs.length - 1
                    const isOrigin = pc.un_location_code === polCode
                    const isDest = pc.un_location_code === podCode
                    const dotColor = isOrigin ? T.portColors.origin : isDest ? T.portColors.dest : T.portColors.mid
                    const isDocked = pc.ata_datetime && !pc.atd_datetime
                    const dw = dwell(pc)
                    const hasAnyDep = !!pc.atd_datetime

                    return (
                        <div key={i} style={{ display: 'flex', gap: 10, position: 'relative' }}>
                            {/* Line + Dot */}
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
                            {/* Content */}
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
                                    {dw && <span style={{ color: T.warning, fontWeight: 600 }}>⏱ {dw}</span>}
                                    {isDocked && <span style={{ color: '#ea580c', fontWeight: 700 }}>🔶 Still Docked</span>}
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

/* ═══════════════════════════════════════════════════════════════════════════════
   SVG ROUTE MAP
   ═══════════════════════════════════════════════════════════════════════════════ */
function SvgRouteMap({ leg, wide = false }) {
    const positions = leg?.positions || []
    const raw = leg?.portcalls || []
    const pcs = useMemo(() => [...raw].sort((a, b) => sortDate(a) - sortDate(b)), [raw])
    const polCode = leg?.pol_un_location_code
    const podCode = leg?.pod_un_location_code

    const W = wide ? 1100 : 540
    const H = wide ? 340 : 200

    const historic = positions.filter(p => p.tag === 'historic')
    const predicted = positions.filter(p => p.tag === 'predicted')
    const latest = positions.find(p => p.tag === 'latest')

    const bounds = useMemo(() => computeBounds(positions, pcs, 3), [positions, pcs])

    const toX = lng => lngToX(lng, bounds, W)
    const toY = lat => latToY(lat, bounds, H)

    // Simplify
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

    const histPath = histCoords.map(([lat, lng]) => `${toX(lng).toFixed(1)},${toY(lat).toFixed(1)}`).join(' ')
    const predPath = predCoords.map(([lat, lng]) => `${toX(lng).toFixed(1)},${toY(lat).toFixed(1)}`).join(' ')

    // Waypoint dots along historic route (every 10th simplified point)
    const waypoints = histCoords.filter((_, i) => i > 0 && i < histCoords.length - 1 && i % 4 === 0)

    return (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: T.r, boxShadow: T.shadow, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}`, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.textMuted, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🗺️ Route Map</span>
                <span style={{ fontSize: 8, fontWeight: 400, color: T.textLight }}>
                    {bounds.minLng.toFixed(0)}°E – {bounds.maxLng.toFixed(0)}°E · {bounds.minLat.toFixed(0)}° – {bounds.maxLat.toFixed(0)}°
                </span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', background: '#e0f2fe' }}>
                {/* Ocean grid */}
                {Array.from({ length: 6 }).map((_, i) => (
                    <line key={`g${i}`} x1={0} y1={H * i / 5} x2={W} y2={H * i / 5} stroke="#bae6fd" strokeWidth="0.5" strokeDasharray="4 4" />
                ))}

                {/* Historic route (solid green) */}
                {histCoords.length > 1 && (
                    <>
                        <polyline points={histPath} fill="none" stroke={T.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {/* Animated ship along historic */}
                        <text fontSize="14" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
                            <animateMotion dur={`${Math.max(4, histCoords.length * 0.3)}s`} repeatCount="indefinite"
                                path={`M${histCoords.map(([lat, lng]) => `${toX(lng).toFixed(1)} ${toY(lat).toFixed(1)}`).join(' L ')}`} />
                            🚢
                        </text>
                    </>
                )}

                {/* Waypoint dots */}
                {waypoints.map(([lat, lng], i) => (
                    <circle key={`wp${i}`} cx={toX(lng)} cy={toY(lat)} r="2" fill={T.success} opacity="0.4" />
                ))}

                {/* Predicted route (dashed blue) */}
                {predCoords.length > 1 && (
                    <>
                        <polyline points={predPath} fill="none" stroke={T.future} strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" />
                        <text fontSize="12" opacity="0.8">
                            <animateMotion dur={`${Math.max(3, predCoords.length * 0.3)}s`} repeatCount="indefinite"
                                path={`M${predCoords.map(([lat, lng]) => `${toX(lng).toFixed(1)} ${toY(lat).toFixed(1)}`).join(' L ')}`} />
                            🚢
                        </text>
                    </>
                )}

                {/* Latest position glow */}
                {latest && (
                    <>
                        <circle cx={toX(latest.longitude)} cy={toY(latest.latitude)} r="8" fill={T.success} opacity="0.15">
                            <animate attributeName="r" values="6;12;6" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <circle cx={toX(latest.longitude)} cy={toY(latest.latitude)} r="4" fill={T.success} stroke="#fff" strokeWidth="1.5" />
                    </>
                )}

                {/* Port markers */}
                {pcs.filter(pc => pc.latitude && pc.longitude).map((pc, i) => {
                    const isOrigin = pc.un_location_code === polCode
                    const isDest = pc.un_location_code === podCode
                    const c = isOrigin ? T.portColors.origin : isDest ? T.portColors.dest : T.portColors.mid
                    const x = toX(pc.longitude), y = toY(pc.latitude)
                    const labelY = i % 2 === 0 ? y - 12 : y + 16
                    return (
                        <g key={`port-${i}`}>
                            <circle cx={x} cy={y} r="6" fill="#fff" stroke={c} strokeWidth="2.5" />
                            <circle cx={x} cy={y} r="2.5" fill={c} />
                            <text x={x} y={labelY} textAnchor="middle" fontSize="8" fontWeight="600" fill={c} fontFamily={T.font}>
                                {pc.port_name || pc.un_location_code}
                            </text>
                        </g>
                    )
                })}

                {/* Region label */}
                <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="10" fill="#93c5fd" opacity="0.4" fontStyle="italic" fontFamily={T.font}>
                    {getSeaName(bounds)}
                </text>
            </svg>
        </div>
    )
}

function getSeaName(bounds) {
    const cLat = (bounds.minLat + bounds.maxLat) / 2
    const cLng = (bounds.minLng + bounds.maxLng) / 2
    if (cLng > 95 && cLng < 125 && cLat > 0 && cLat < 25) return 'South China Sea'
    if (cLng > 75 && cLng < 100 && cLat > -5 && cLat < 20) return 'Indian Ocean'
    if (cLng > 55 && cLng < 75 && cLat > 10 && cLat < 30) return 'Arabian Sea'
    if (cLng > 25 && cLng < 45 && cLat > 10 && cLat < 35) return 'Red Sea'
    if (cLng > -10 && cLng < 40 && cLat > 30 && cLat < 50) return 'Mediterranean Sea'
    if (cLng > -80 && cLng < -10 && cLat > 10 && cLat < 50) return 'Atlantic Ocean'
    if (cLng > 120 && cLng < 180 && cLat > -50 && cLat < 10) return 'Pacific Ocean'
    return 'Open Waters'
}

/* ═══════════════════════════════════════════════════════════════════════════════
   AIS POSITION LOG TABLE
   ═══════════════════════════════════════════════════════════════════════════════ */
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
                <span>📡 AIS Position Log</span>
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
                            const isP = p.tag === 'predicted'
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

/* ═══════════════════════════════════════════════════════════════════════════════
   MULTI-LEG VIEW
   ═══════════════════════════════════════════════════════════════════════════════ */
function MultiLegView({ legs, activeLeg, setActiveLeg }) {
    return (
        <>
            <StatsBar leg={legs[activeLeg]} />
            {/* Leg cards side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(legs.length, 3)}, 1fr)`, gap: 10, marginBottom: 10 }}>
                {legs.map((l, i) => {
                    const isFuture = l.state === 'FUTURE'
                    const isActive = i === activeLeg
                    const v = l.vessel || {}
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
                            {/* Header */}
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
                                    {origin?.port_name || l.pol_un_location_code} → {dest?.port_name || l.pod_un_location_code}
                                </span>
                                <span style={{
                                    fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 10,
                                    background: st.bg, color: st.color, border: `1px solid ${st.border}`,
                                }}>
                                    {l.state === 'PAST' ? '✓' : '⏳'} {l.state}
                                </span>
                            </div>
                            {/* Mini content */}
                            <div style={{ padding: '8px 12px' }}>
                                <VesselInfoCard leg={l} mini />
                                <div style={{ marginTop: 8 }}><PortTimeline leg={l} mini /></div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Expanded active leg below */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <SvgRouteMap leg={legs[activeLeg]} wide />
                <AisTable leg={legs[activeLeg]} />
            </div>
        </>
    )
}
