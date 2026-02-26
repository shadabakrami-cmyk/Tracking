import { useState, useRef, useEffect, useCallback } from 'react'

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
    if (s === 'PAST') return { text: 'COMPLETED', color: '#10b981', bg: 'rgba(16,185,129,0.15)' }
    if (s === 'ONGOING') return { text: 'IN TRANSIT', color: '#00e5ff', bg: 'rgba(0,229,255,0.12)' }
    if (s === 'FUTURE') return { text: 'UPCOMING', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
    return { text: s || '—', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function VesselDrawer({ open, onClose, transportId, auth }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [data, setData] = useState(null)
    const [activeLeg, setActiveLeg] = useState(0)

    // Playback state
    const [playing, setPlaying] = useState(false)
    const [playbackIdx, setPlaybackIdx] = useState(0)
    const [playbackSpeed, setPlaybackSpeed] = useState(1)
    const timerRef = useRef(null)

    // Map refs
    const mapContainerRef = useRef(null)
    const mapRef = useRef(null)
    const historicLineRef = useRef(null)
    const predictedLineRef = useRef(null)
    const vesselMarkerRef = useRef(null)
    const portMarkersRef = useRef([])

    // ── Fetch Data ──
    useEffect(() => {
        if (!open || !transportId || !auth) return
        // Don't re-fetch if we already have data for this transport
        if (data && data._fetchedId === transportId) return

        setLoading(true)
        setError('')
        setData(null)
        setActiveLeg(0)
        setPlaybackIdx(0)
        setPlaying(false)

        const fetchData = async () => {
            try {
                const res = await fetch(
                    `${API_URL}/vessel-track?id=${encodeURIComponent(transportId)}&token=${auth.token}&apiKey=${auth.apiKey}`
                )
                const json = await res.json()
                if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
                json._fetchedId = transportId
                setData(json)
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [open, transportId, auth])

    // ── Derived ──
    const legs = data?.transport_tracks || []
    const leg = legs[activeLeg] || null

    const historicPositions = (leg?.positions || []).filter(p => p.tag === 'historic')
    const latestPosition = (leg?.positions || []).find(p => p.tag === 'latest')
    const predictedPositions = (leg?.positions || []).filter(p => p.tag === 'predicted')

    // Build full route: historic + latest + predicted
    const allPositions = [
        ...historicPositions,
        ...(latestPosition ? [latestPosition] : []),
        ...predictedPositions,
    ]
    const historicEnd = historicPositions.length + (latestPosition ? 1 : 0)

    // ── Map Initialization ──
    useEffect(() => {
        if (!open || !mapContainerRef.current) return

        // Small delay for DOM to settle after drawer animation
        const timeout = setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize()
                return
            }
            if (!mapContainerRef.current) return

            const L = window.L
            if (!L) return

            const map = L.map(mapContainerRef.current, {
                center: [20, 0],
                zoom: 3,
                zoomControl: false,
                attributionControl: false,
            })

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 19,
            }).addTo(map)

            L.control.zoom({ position: 'topright' }).addTo(map)

            mapRef.current = map
        }, 350)

        return () => clearTimeout(timeout)
    }, [open])

    // ── Draw Route on Map ──
    useEffect(() => {
        const L = window.L
        const map = mapRef.current
        if (!L || !map || !leg) return

        // Clean previous layers
        if (historicLineRef.current) { map.removeLayer(historicLineRef.current); historicLineRef.current = null }
        if (predictedLineRef.current) { map.removeLayer(predictedLineRef.current); predictedLineRef.current = null }
        if (vesselMarkerRef.current) { map.removeLayer(vesselMarkerRef.current); vesselMarkerRef.current = null }
        portMarkersRef.current.forEach(m => map.removeLayer(m))
        portMarkersRef.current = []

        // Historic polyline (solid cyan)
        const historicCoords = [...historicPositions, ...(latestPosition ? [latestPosition] : [])]
            .filter(p => p.latitude && p.longitude)
            .map(p => [p.latitude, p.longitude])

        if (historicCoords.length > 0) {
            historicLineRef.current = L.polyline(historicCoords, {
                color: '#00e5ff',
                weight: 3,
                opacity: 0.9,
            }).addTo(map)
        }

        // Predicted polyline (dashed amber)
        const predStart = latestPosition ? [latestPosition.latitude, latestPosition.longitude] : null
        const predCoords = [
            ...(predStart ? [predStart] : []),
            ...predictedPositions.filter(p => p.latitude && p.longitude).map(p => [p.latitude, p.longitude]),
        ]

        if (predCoords.length > 1) {
            predictedLineRef.current = L.polyline(predCoords, {
                color: '#f59e0b',
                weight: 2.5,
                opacity: 0.7,
                dashArray: '8, 8',
            }).addTo(map)
        }

        // Vessel marker (pulsing cyan dot)
        const currentPos = latestPosition || historicPositions[historicPositions.length - 1]
        if (currentPos?.latitude && currentPos?.longitude) {
            const vesselIcon = L.divIcon({
                className: '',
                html: `<div style="
                    width: 14px; height: 14px; border-radius: 50%;
                    background: #00e5ff;
                    border: 2px solid #0b1426;
                    animation: vesselPulse 2s ease-in-out infinite;
                "></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7],
            })
            vesselMarkerRef.current = L.marker([currentPos.latitude, currentPos.longitude], { icon: vesselIcon }).addTo(map)
        }

        // Port markers
        const portcalls = leg.portcalls || []
        portcalls.forEach((pc) => {
            if (!pc.latitude || !pc.longitude) return
            const isDone = !!pc.atd_datetime
            const portIcon = L.divIcon({
                className: '',
                html: `<div style="
                    width: 10px; height: 10px; border-radius: 50%;
                    background: ${isDone ? '#10b981' : '#f59e0b'};
                    border: 2px solid #0b1426;
                    box-shadow: 0 0 6px ${isDone ? 'rgba(16,185,129,0.5)' : 'rgba(245,158,11,0.5)'};
                "></div>`,
                iconSize: [10, 10],
                iconAnchor: [5, 5],
            })
            const marker = L.marker([pc.latitude, pc.longitude], { icon: portIcon })
                .bindPopup(`<div style="padding:4px 0;">
                    <div style="font-weight:700;font-size:13px;margin-bottom:2px;">${pc.port_name || pc.un_location_code || 'Port'}</div>
                    <div style="font-size:11px;color:#94a3b8;">${pc.un_location_code || ''} ${pc.port_country || ''}</div>
                    ${pc.ata_datetime ? `<div style="font-size:10px;margin-top:4px;color:#10b981;">ATA: ${fmtDate(pc.ata_datetime)}</div>` : ''}
                    ${pc.atd_datetime ? `<div style="font-size:10px;color:#10b981;">ATD: ${fmtDate(pc.atd_datetime)}</div>` : ''}
                    ${pc.eta_datetime ? `<div style="font-size:10px;color:#f59e0b;">ETA: ${fmtDate(pc.eta_datetime)}</div>` : ''}
                </div>`)
                .addTo(map)
            portMarkersRef.current.push(marker)
        })

        // Fit bounds
        const allBoundsCoords = [
            ...historicCoords,
            ...predCoords,
            ...portcalls.filter(p => p.latitude && p.longitude).map(p => [p.latitude, p.longitude]),
        ]
        if (allBoundsCoords.length > 1) {
            map.fitBounds(allBoundsCoords, { padding: [40, 40], maxZoom: 8 })
        } else if (allBoundsCoords.length === 1) {
            map.setView(allBoundsCoords[0], 6)
        }
    }, [leg, activeLeg])

    // ── Playback Logic ──
    useEffect(() => {
        if (!playing) {
            if (timerRef.current) clearInterval(timerRef.current)
            return
        }

        const interval = Math.max(50, 300 / playbackSpeed)
        timerRef.current = setInterval(() => {
            setPlaybackIdx(prev => {
                if (prev >= allPositions.length - 1) {
                    setPlaying(false)
                    return prev
                }
                return prev + 1
            })
        }, interval)

        return () => clearInterval(timerRef.current)
    }, [playing, playbackSpeed, allPositions.length])

    // Move vessel marker on playback
    useEffect(() => {
        const L = window.L
        const map = mapRef.current
        if (!L || !map || allPositions.length === 0) return

        const pos = allPositions[playbackIdx]
        if (!pos?.latitude || !pos?.longitude) return

        if (vesselMarkerRef.current) {
            vesselMarkerRef.current.setLatLng([pos.latitude, pos.longitude])
        }

        // Update historic line progressively
        if (historicLineRef.current) {
            const coords = allPositions.slice(0, playbackIdx + 1)
                .filter(p => p.latitude && p.longitude)
                .map(p => [p.latitude, p.longitude])
            historicLineRef.current.setLatLngs(coords)
        }

        if (playing) {
            map.panTo([pos.latitude, pos.longitude], { animate: true, duration: 0.3 })
        }
    }, [playbackIdx])

    const handlePortClick = useCallback((pc) => {
        const map = mapRef.current
        if (!map || !pc.latitude || !pc.longitude) return
        map.flyTo([pc.latitude, pc.longitude], 8, { duration: 1 })
    }, [])

    // ── Cleanup on close ──
    useEffect(() => {
        if (!open && mapRef.current) {
            mapRef.current.remove()
            mapRef.current = null
            historicLineRef.current = null
            predictedLineRef.current = null
            vesselMarkerRef.current = null
            portMarkersRef.current = []
        }
    }, [open])

    if (!open) return null

    const st = leg ? stateLabel(leg.state) : null

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 998,
                    background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)',
                    animation: 'overlayFadeIn 0.3s ease-out forwards',
                }}
            />

            {/* Drawer Panel */}
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                width: '55vw', minWidth: '520px', maxWidth: '900px',
                zIndex: 999,
                background: '#0b1426',
                color: '#e2e8f0',
                display: 'flex', flexDirection: 'column',
                animation: 'drawerSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
                boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
            }}>

                {/* ── Header ── */}
                <div style={{
                    padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(11,20,38,0.95)',
                    flexShrink: 0,
                }}>
                    {/* Ship icon */}
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, #00e5ff, #0891b2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                            <path d="M19.38 20A11.5 11.5 0 0 0 21 12l-9-4-9 4c0 5 2 8 4.62 10" />
                            <path d="M12 2v8" />
                        </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            fontSize: '16px', fontWeight: 700,
                            fontFamily: "'Syne', sans-serif",
                            letterSpacing: '-0.02em',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {leg?.vessel?.vessel_name || 'Vessel Journey'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontFamily: "'IBM Plex Mono', monospace" }}>
                            {leg?.vessel?.vessel_imo_number ? `IMO ${leg.vessel.vessel_imo_number}` : `Transport #${transportId}`}
                            {leg?.vessel?.vessel_mmsi_number && ` · MMSI ${leg.vessel.vessel_mmsi_number}`}
                        </div>
                    </div>
                    {st && (
                        <span style={{
                            padding: '4px 12px', borderRadius: '6px',
                            fontSize: '10px', fontWeight: 700,
                            background: st.bg, color: st.color,
                            letterSpacing: '0.06em',
                        }}>{st.text}</span>
                    )}
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        padding: '6px', cursor: 'pointer',
                        color: '#94a3b8', display: 'flex',
                        transition: 'all 0.2s',
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#e2e8f0' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8' }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* ── Leg Switcher ── */}
                {legs.length > 1 && (
                    <div style={{
                        padding: '10px 20px',
                        display: 'flex', gap: '6px', flexWrap: 'wrap',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        flexShrink: 0,
                    }}>
                        {legs.map((l, i) => (
                            <button key={i} onClick={() => { setActiveLeg(i); setPlaybackIdx(0); setPlaying(false) }}
                                style={{
                                    padding: '4px 14px', borderRadius: '6px',
                                    fontSize: '11px', fontWeight: 600,
                                    border: `1px solid ${activeLeg === i ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                    background: activeLeg === i ? 'rgba(0,229,255,0.1)' : 'transparent',
                                    color: activeLeg === i ? '#00e5ff' : '#64748b',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }}>
                                Leg {i + 1}{l.vessel?.vessel_name ? ` · ${l.vessel.vessel_name}` : ''}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Loading / Error ── */}
                {loading && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#64748b' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        <span style={{ fontSize: '13px' }}>Loading vessel track...</span>
                    </div>
                )}

                {error && (
                    <div style={{ margin: '20px', padding: '14px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '13px' }}>
                        {error}
                    </div>
                )}

                {/* ── Content ── */}
                {leg && !loading && (
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                        {/* HUD Strip */}
                        <div style={{
                            padding: '12px 20px',
                            display: 'flex', gap: '8px', flexWrap: 'wrap',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            background: 'rgba(255,255,255,0.02)',
                            flexShrink: 0,
                        }}>
                            {[
                                { label: 'SOG', value: leg.vessel?.vessel_sog != null ? `${leg.vessel.vessel_sog} kn` : '—', icon: '⚡' },
                                { label: 'COG', value: leg.vessel?.vessel_cog != null ? `${leg.vessel.vessel_cog}°` : '—', icon: '🧭' },
                                { label: 'Route', value: `${leg.pol_un_location_code || '—'} → ${leg.pod_un_location_code || '—'}`, icon: '🛤️' },
                                { label: 'Position', value: latestPosition ? `${latestPosition.latitude?.toFixed(4)}, ${latestPosition.longitude?.toFixed(4)}` : '—', mono: true, icon: '📍' },
                                { label: 'ETA', value: fmtDate(leg.end_datetime) || '—', icon: '🕐' },
                            ].map((item, i) => (
                                <div key={i} style={{
                                    flex: item.label === 'Position' ? '1 1 140px' : '0 1 auto',
                                    padding: '8px 12px', borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    minWidth: '80px',
                                }}>
                                    <div style={{ fontSize: '9px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>
                                        {item.icon} {item.label}
                                    </div>
                                    <div style={{
                                        fontSize: '12px', fontWeight: 700, color: '#e2e8f0',
                                        fontFamily: item.mono ? "'IBM Plex Mono', monospace" : 'inherit',
                                    }}>
                                        {item.value}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Map Section */}
                        <div style={{ position: 'relative', height: '45%', minHeight: '250px', flexShrink: 0 }}>
                            <div ref={mapContainerRef} style={{
                                position: 'absolute', inset: 0,
                                background: '#0d1b2a',
                            }} />

                            {/* Port sidebar overlay */}
                            {leg.portcalls && leg.portcalls.length > 0 && (
                                <div style={{
                                    position: 'absolute', top: '8px', left: '8px', bottom: '8px',
                                    width: '160px', zIndex: 500,
                                    background: 'rgba(11,20,38,0.9)',
                                    backdropFilter: 'blur(8px)',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    overflowY: 'auto',
                                    padding: '8px',
                                }}>
                                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', padding: '2px 4px' }}>
                                        Ports
                                    </div>
                                    {leg.portcalls.map((pc, i) => {
                                        const isDone = !!pc.atd_datetime
                                        return (
                                            <button key={i} onClick={() => handlePortClick(pc)}
                                                style={{
                                                    width: '100%', textAlign: 'left',
                                                    padding: '6px 8px', borderRadius: '6px',
                                                    background: 'transparent',
                                                    border: 'none', cursor: 'pointer',
                                                    color: '#e2e8f0', fontSize: '11px',
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    transition: 'background 0.2s',
                                                    marginBottom: '2px',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <span style={{
                                                    width: '6px', height: '6px', borderRadius: '50%',
                                                    background: isDone ? '#10b981' : '#f59e0b',
                                                    flexShrink: 0,
                                                }} />
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, fontSize: '10px' }}>
                                                    {pc.port_name || pc.un_location_code}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Playback Controls */}
                        {allPositions.length > 1 && (
                            <div style={{
                                padding: '10px 20px',
                                display: 'flex', alignItems: 'center', gap: '10px',
                                borderTop: '1px solid rgba(255,255,255,0.06)',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                background: 'rgba(255,255,255,0.02)',
                                flexShrink: 0,
                            }}>
                                {/* Play/Pause */}
                                <button onClick={() => setPlaying(p => !p)} style={{
                                    background: playing ? 'rgba(239,68,68,0.15)' : 'rgba(0,229,255,0.15)',
                                    border: `1px solid ${playing ? 'rgba(239,68,68,0.3)' : 'rgba(0,229,255,0.3)'}`,
                                    borderRadius: '8px', padding: '6px 10px',
                                    cursor: 'pointer', color: playing ? '#f87171' : '#00e5ff',
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    fontSize: '11px', fontWeight: 600,
                                }}>
                                    {playing ? (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                                    ) : (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                                    )}
                                    {playing ? 'Pause' : 'Play'}
                                </button>

                                {/* Reset */}
                                <button onClick={() => { setPlaybackIdx(0); setPlaying(false) }} style={{
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#94a3b8', display: 'flex',
                                }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                                </button>

                                {/* Step backward */}
                                <button onClick={() => setPlaybackIdx(i => Math.max(0, i - 1))} style={{
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#94a3b8', display: 'flex',
                                }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                                </button>

                                {/* Step forward */}
                                <button onClick={() => setPlaybackIdx(i => Math.min(allPositions.length - 1, i + 1))} style={{
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#94a3b8', display: 'flex',
                                }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                                </button>

                                {/* Speed */}
                                <button onClick={() => setPlaybackSpeed(s => s === 1 ? 3 : s === 3 ? 6 : 1)} style={{
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '8px', padding: '4px 10px',
                                    cursor: 'pointer', color: '#00e5ff',
                                    fontSize: '10px', fontWeight: 700,
                                    fontFamily: "'IBM Plex Mono', monospace",
                                }}>
                                    {playbackSpeed}×
                                </button>

                                {/* Scrubber */}
                                <input
                                    type="range" min={0} max={allPositions.length - 1}
                                    value={playbackIdx}
                                    onChange={e => { setPlaybackIdx(Number(e.target.value)); setPlaying(false) }}
                                    className="vessel-scrubber"
                                    style={{ flex: 1 }}
                                />
                                <span style={{ fontSize: '10px', color: '#64748b', fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'nowrap' }}>
                                    {playbackIdx + 1}/{allPositions.length}
                                </span>
                            </div>
                        )}

                        {/* Port Call Itinerary */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                            {/* Dates row */}
                            {(leg.start_datetime || leg.end_datetime) && (
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                                    {leg.start_datetime && (
                                        <div style={{
                                            flex: 1, padding: '8px 12px', borderRadius: '8px',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                        }}>
                                            <div style={{ fontSize: '9px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Departure</div>
                                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#e2e8f0' }}>{fmtDate(leg.start_datetime)}</div>
                                        </div>
                                    )}
                                    {leg.end_datetime && (
                                        <div style={{
                                            flex: 1, padding: '8px 12px', borderRadius: '8px',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                        }}>
                                            <div style={{ fontSize: '9px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Arrival</div>
                                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#e2e8f0' }}>{fmtDate(leg.end_datetime)}</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Port Calls Timeline */}
                            {leg.portcalls && leg.portcalls.length > 0 && (
                                <>
                                    <div style={{
                                        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                                        letterSpacing: '0.08em', color: '#64748b',
                                        marginBottom: '10px', fontFamily: "'Syne', sans-serif",
                                    }}>
                                        Port Calls ({leg.portcalls.length})
                                    </div>
                                    {leg.portcalls.map((pc, i) => {
                                        const isDone = !!pc.atd_datetime
                                        const isLast = i === leg.portcalls.length - 1
                                        const dotColor = isDone ? '#10b981' : '#f59e0b'
                                        return (
                                            <div key={i} style={{ display: 'flex', gap: '10px' }}>
                                                {/* Timeline */}
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16px', flexShrink: 0 }}>
                                                    <div style={{
                                                        width: '10px', height: '10px', borderRadius: '50%',
                                                        background: dotColor, marginTop: '14px', flexShrink: 0,
                                                        boxShadow: `0 0 6px ${dotColor}60`,
                                                        border: '2px solid #0b1426',
                                                    }} />
                                                    {!isLast && (
                                                        <div style={{
                                                            width: '2px', flex: 1, minHeight: '12px',
                                                            background: `linear-gradient(to bottom, ${dotColor}40, rgba(255,255,255,0.04))`,
                                                        }} />
                                                    )}
                                                </div>
                                                {/* Card */}
                                                <div style={{
                                                    flex: 1, marginBottom: '6px',
                                                    padding: '10px 12px', borderRadius: '10px',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                    cursor: pc.latitude ? 'pointer' : 'default',
                                                    transition: 'background 0.2s',
                                                }}
                                                    onClick={() => handlePortClick(pc)}
                                                    onMouseEnter={e => { if (pc.latitude) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>
                                                            {pc.port_name || pc.un_location_code}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '10px', fontWeight: 600, padding: '1px 6px',
                                                            borderRadius: '4px', background: 'rgba(255,255,255,0.06)',
                                                            color: '#94a3b8',
                                                        }}>
                                                            {pc.un_location_code}
                                                        </span>
                                                        {pc.port_country && (
                                                            <span style={{ fontSize: '10px', color: '#64748b' }}>{pc.port_country}</span>
                                                        )}
                                                        <span style={{
                                                            marginLeft: 'auto', fontSize: '9px', fontWeight: 700,
                                                            color: isDone ? '#10b981' : '#f59e0b',
                                                        }}>
                                                            {isDone ? '● Done' : '○ Upcoming'}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '11px', color: '#94a3b8' }}>
                                                        {pc.ata_datetime && <span><span style={{ color: '#64748b', fontWeight: 600 }}>ATA:</span> {fmtDate(pc.ata_datetime)}</span>}
                                                        {pc.atd_datetime && <span><span style={{ color: '#64748b', fontWeight: 600 }}>ATD:</span> {fmtDate(pc.atd_datetime)}</span>}
                                                        {pc.eta_datetime && <span><span style={{ color: '#64748b', fontWeight: 600 }}>ETA:</span> {fmtDate(pc.eta_datetime)}</span>}
                                                        {pc.sta_datetime && <span><span style={{ color: '#64748b', fontWeight: 600 }}>STA:</span> {fmtDate(pc.sta_datetime)}</span>}
                                                        {pc.etd_datetime && <span><span style={{ color: '#64748b', fontWeight: 600 }}>ETD:</span> {fmtDate(pc.etd_datetime)}</span>}
                                                        {pc.std_datetime && <span><span style={{ color: '#64748b', fontWeight: 600 }}>STD:</span> {fmtDate(pc.std_datetime)}</span>}
                                                    </div>
                                                    {(pc.latitude || pc.longitude) && (
                                                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', fontFamily: "'IBM Plex Mono', monospace" }}>
                                                            📍 {pc.latitude?.toFixed(4)}, {pc.longitude?.toFixed(4)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </>
                            )}

                            {/* Positions summary */}
                            {allPositions.length > 0 && (
                                <div style={{ marginTop: '14px' }}>
                                    <div style={{
                                        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                                        letterSpacing: '0.08em', color: '#64748b',
                                        marginBottom: '8px', fontFamily: "'Syne', sans-serif",
                                    }}>
                                        Track Points ({allPositions.length})
                                    </div>
                                    <div style={{
                                        padding: '12px', borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        display: 'flex', gap: '8px',
                                    }}>
                                        {[
                                            { n: historicPositions.length, label: 'Historic', color: '#00e5ff' },
                                            { n: latestPosition ? 1 : 0, label: 'Latest', color: '#10b981' },
                                            { n: predictedPositions.length, label: 'Predicted', color: '#f59e0b' },
                                        ].map((s, i) => (
                                            <div key={i} style={{
                                                flex: 1, textAlign: 'center',
                                                padding: '6px 8px', borderRadius: '8px',
                                                background: s.n > 0 ? `${s.color}10` : 'transparent',
                                            }}>
                                                <div style={{ fontSize: '18px', fontWeight: 800, color: s.n > 0 ? s.color : '#334155' }}>{s.n}</div>
                                                <div style={{ fontSize: '9px', fontWeight: 600, color: s.n > 0 ? s.color : '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
