import { normalizeResponse } from '../utils/normalizeResponse'

// ─── DCSA Event Type Code → Human-Readable Label ──────────────────────────────
const EVENT_CODE_LABELS = {
    ARRI: 'Arrived',
    DEPA: 'Departed',
    LOAD: 'Loaded',
    DISC: 'Discharged',
    GTIN: 'Gate In',
    GTOT: 'Gate Out',
    STUF: 'Stuffed',
    STRP: 'Stripped',
    PICK: 'Picked Up',
    DROP: 'Dropped Off',
    INSP: 'Inspected',
    MALU: 'Malfunction',
    BOOT: 'Booked',
    CONF: 'Confirmed',
    RECE: 'Received',
    REJE: 'Rejected',
    SURR: 'Surrendered',
    SUBM: 'Submitted',
    ISSU: 'Issued',
    AVAV: 'Available',
    CANN: 'Cancelled',
    HOLD: 'On Hold',
    RELS: 'Released',
    TRSH: 'Transshipped',
}

const LEG_TYPE_LABELS = {
    PRE_SHIPMENT: 'Pre-Shipment',
    PRE_OCEAN: 'Pre-Ocean',
    OCEAN: 'Ocean',
    POST_OCEAN: 'Post-Ocean',
    POST_SHIPMENT: 'Post-Shipment',
}

const TRANSPORT_CALL_TYPE_LABELS = {
    PORT_OF_LOADING: 'Port of Loading',
    PORT_OF_DESTINATION: 'Port of Destination',
    TRANSSHIPMENT_PORT: 'Transshipment Port',
    INTERMEDIATE_PORT: 'Intermediate Port',
    DEPOT_RELEASE_LOCATION: 'Depot Release',
    DEPOT_RETURN_LOCATION: 'Depot Return',
}

// ─── SVG Symbols ──────────────────────────────────────────────────────────────

function TransportIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#60a5fa' }} className="shrink-0">
            <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7-4H7L2 8z" />
            <path d="M2 8h20" />
            <path d="M12 4v4" />
        </svg>
    )
}

function EquipmentIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#34d399' }} className="shrink-0">
            <rect x="1" y="4" width="22" height="14" rx="2" />
            <path d="M1 10h22" />
            <circle cx="7" cy="21" r="1" />
            <circle cx="17" cy="21" r="1" />
        </svg>
    )
}

function ShipmentIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#a78bfa' }} className="shrink-0">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
    )
}

function LocationPin() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }} className="shrink-0">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    )
}

function VesselSvg() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }} className="shrink-0">
            <path d="M2 20l.9-4A3 3 0 0 1 5.8 14H18.2a3 3 0 0 1 2.9 2l.9 4" />
            <path d="M4 14V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8" />
            <path d="M12 4v4" />
        </svg>
    )
}

function CalendarSvg() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }} className="shrink-0">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
    )
}

function TruckSvg() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }} className="shrink-0">
            <path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7V8z" />
            <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
    )
}

function AnchorSvg() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }} className="shrink-0">
            <circle cx="12" cy="5" r="3" /><line x1="12" y1="22" x2="12" y2="8" />
            <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
        </svg>
    )
}

const EVENT_TYPE_ICON = {
    TRANSPORT: TransportIcon,
    EQUIPMENT: EquipmentIcon,
    SHIPMENT: ShipmentIcon,
}

const EVENT_TYPE_LABEL = {
    TRANSPORT: 'Transport Event',
    EQUIPMENT: 'Equipment Event',
    SHIPMENT: 'Shipment Event',
}

// Light mode color scheme
const DOT_COLORS = {
    TRANSPORT: '#3b82f6',
    EQUIPMENT: '#10b981',
    SHIPMENT: '#8b5cf6',
}

const DOT_GLOW = {
    TRANSPORT: '0 0 8px rgba(59, 130, 246, 0.5)',
    EQUIPMENT: '0 0 8px rgba(16, 185, 129, 0.5)',
    SHIPMENT: '0 0 8px rgba(139, 92, 246, 0.5)',
}

const SELECTED_BORDER = {
    TRANSPORT: 'rgba(59, 130, 246, 0.4)',
    EQUIPMENT: 'rgba(16, 185, 129, 0.4)',
    SHIPMENT: 'rgba(139, 92, 246, 0.4)',
}

const SELECTED_GLOW = {
    TRANSPORT: '0 0 16px rgba(59, 130, 246, 0.12), inset 0 1px 0 rgba(59, 130, 246, 0.08)',
    EQUIPMENT: '0 0 16px rgba(16, 185, 129, 0.12), inset 0 1px 0 rgba(16, 185, 129, 0.08)',
    SHIPMENT: '0 0 16px rgba(139, 92, 246, 0.12), inset 0 1px 0 rgba(139, 92, 246, 0.08)',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEventCode(event) {
    return (
        event.transportEventTypeCode ||
        event.equipmentEventTypeCode ||
        event.shipmentEventTypeCode ||
        null
    )
}

function getEventLabel(code) {
    if (!code) return null
    return EVENT_CODE_LABELS[code] || code
}

function formatDateTime(raw) {
    if (!raw) return null
    try {
        return new Date(raw).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    } catch {
        return raw
    }
}

function getModeIcon(mode) {
    if (!mode) return null
    if (mode === 'VESSEL') return VesselSvg
    if (mode === 'TRUCK') return TruckSvg
    return AnchorSvg
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DCSAView({ data, selectedIndex, onSelectEvent }) {
    const parsed = normalizeResponse(data)

    if (parsed.totalEvents === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-muted)' }}>
                No events found for this reference.
            </div>
        )
    }

    return (
        <div>
            {/* Metadata Bar */}
            {parsed.metadata?.identifier && (
                <div className="rounded-xl px-4 py-3 mb-4 text-xs" style={{
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-glass)',
                    animation: 'slideUp 0.3s ease-out',
                }}>
                    <div className="flex items-center gap-4 flex-wrap">
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{parsed.metadata.identifier}</span>
                        {parsed.metadata.transportStatus && (
                            <span className="px-2 py-0.5 rounded-md font-semibold text-xs"
                                style={{
                                    background: parsed.metadata.transportStatus === 'COMPLETED'
                                        ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                    color: parsed.metadata.transportStatus === 'COMPLETED'
                                        ? '#059669' : '#d97706',
                                }}>
                                {parsed.metadata.transportStatus}
                            </span>
                        )}
                        {parsed.metadata.identifierType && (
                            <span style={{ color: 'var(--text-muted)' }}>
                                {parsed.metadata.identifierType.replace(/_/g, ' ')}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Summary Bar */}
            <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 mb-5 text-xs flex-wrap" style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                animation: 'slideUp 0.4s ease-out',
            }}>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{parsed.totalEvents} events</span>
                <span className="w-px h-4" style={{ background: 'var(--border-glass-hover)' }} />
                {parsed.transportEvents.length > 0 && (
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#3b82f6' }} />
                        Transport: {parsed.transportEvents.length}
                    </span>
                )}
                {parsed.equipmentEvents.length > 0 && (
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#10b981' }} />
                        Equipment: {parsed.equipmentEvents.length}
                    </span>
                )}
                {parsed.shipmentEvents.length > 0 && (
                    <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#8b5cf6' }} />
                        Shipment: {parsed.shipmentEvents.length}
                    </span>
                )}
            </div>

            {/* Timeline */}
            <div className="relative">
                {parsed.allEvents.map((event, idx) => {
                    const dotColor = DOT_COLORS[event.eventType] || '#64748b'
                    const dotGlow = DOT_GLOW[event.eventType] || 'none'
                    const isLast = idx === parsed.allEvents.length - 1
                    const isSelected = selectedIndex === idx
                    const TypeIcon = EVENT_TYPE_ICON[event.eventType] || TransportIcon
                    const typeLabel = EVENT_TYPE_LABEL[event.eventType] || 'Event'
                    const code = getEventCode(event)
                    const label = getEventLabel(code)
                    const dateTime = formatDateTime(event.eventDateTime)
                    const location = event.transportCall?.location?.locationName
                    const facility = event.transportCall?.location?.facilityName
                    const locode = event.transportCall?.location?.locode
                    const vesselName = event.transportCall?.vessel?.vesselName
                    const voyage = event.transportCall?.carrierVoyageNumber
                    const mode = event.transportCall?.modeOfTransport
                    const callType = event.transportCall?.transportCallType
                    const ModeIcon = getModeIcon(mode)
                    const legLabel = LEG_TYPE_LABELS[event.legType]
                    const callTypeLabel = TRANSPORT_CALL_TYPE_LABELS[callType]

                    return (
                        <div key={idx} className="flex gap-3 relative" style={{
                            animation: `slideUp 0.4s ease-out ${idx * 0.05}s both`,
                        }}>
                            {/* Dot + Line */}
                            <div className="flex flex-col items-center">
                                <div
                                    className="w-3 h-3 rounded-full mt-2 shrink-0 transition-all duration-300"
                                    style={{
                                        background: dotColor,
                                        boxShadow: isSelected ? dotGlow : 'none',
                                        transform: isSelected ? 'scale(1.3)' : 'scale(1)',
                                    }}
                                />
                                {!isLast && (
                                    <div className="w-px flex-1 min-h-[24px]" style={{
                                        background: `linear-gradient(to bottom, ${dotColor}40, var(--border-glass))`,
                                    }} />
                                )}
                            </div>

                            {/* Event Card */}
                            <button
                                onClick={() => onSelectEvent(isSelected ? null : idx)}
                                className="mb-2 flex-1 min-w-0 text-left rounded-xl px-4 py-3 transition-all duration-300 cursor-pointer"
                                style={{
                                    background: isSelected ? 'var(--bg-glass-hover)' : 'var(--bg-glass)',
                                    border: `1px solid ${isSelected ? (SELECTED_BORDER[event.eventType] || 'var(--border-glass-hover)') : 'var(--border-glass)'}`,
                                    boxShadow: isSelected ? (SELECTED_GLOW[event.eventType] || 'none') : 'none',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isSelected) {
                                        e.currentTarget.style.background = 'var(--bg-glass-hover)'
                                        e.currentTarget.style.borderColor = 'var(--border-glass-hover)'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected) {
                                        e.currentTarget.style.background = 'var(--bg-glass)'
                                        e.currentTarget.style.borderColor = 'var(--border-glass)'
                                    }
                                }}
                            >
                                {/* Row 1: Icon + Type + Code Badge */}
                                <div className="flex items-center gap-2 mb-1">
                                    <TypeIcon />
                                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{typeLabel}</span>
                                    {code && (
                                        <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold"
                                            style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--text-secondary)' }}>
                                            {code}
                                            {label && label !== code && (
                                                <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>/ {label}</span>
                                            )}
                                        </span>
                                    )}
                                </div>

                                {/* Description */}
                                {event.eventDescription && (
                                    <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                                        {event.eventDescription}
                                    </div>
                                )}

                                {/* Classifier + Leg */}
                                <div className="flex items-center gap-3 text-xs mb-1.5 flex-wrap" style={{ color: 'var(--text-muted)' }}>
                                    {event.eventClassifierCode && (
                                        <span>
                                            {event.eventClassifierCode === 'ACT' && 'Actual'}
                                            {event.eventClassifierCode === 'PLN' && 'Planned'}
                                            {event.eventClassifierCode === 'EST' && 'Estimated'}
                                            {event.eventClassifierCode === 'REQ' && 'Requested'}
                                            {!['ACT', 'PLN', 'EST', 'REQ'].includes(event.eventClassifierCode) && event.eventClassifierCode}
                                        </span>
                                    )}
                                    {legLabel && (
                                        <>
                                            <span className="w-px h-3" style={{ background: 'var(--border-glass-hover)' }} />
                                            <span>{legLabel}</span>
                                        </>
                                    )}
                                    {event.legNumber && (
                                        <>
                                            <span className="w-px h-3" style={{ background: 'var(--border-glass-hover)' }} />
                                            <span>Leg {event.legNumber}</span>
                                        </>
                                    )}
                                    {callTypeLabel && (
                                        <>
                                            <span className="w-px h-3" style={{ background: 'var(--border-glass-hover)' }} />
                                            <span>{callTypeLabel}</span>
                                        </>
                                    )}
                                </div>

                                {/* Date/Time */}
                                {dateTime && (
                                    <div className="flex items-center gap-1.5 text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                                        <CalendarSvg />
                                        {dateTime}
                                    </div>
                                )}

                                {/* Location + Locode */}
                                {(location || locode) && (
                                    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                        <LocationPin />
                                        <span>
                                            {location}
                                            {locode && <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>({locode})</span>}
                                        </span>
                                    </div>
                                )}

                                {/* Facility */}
                                {facility && facility !== location && (
                                    <div className="flex items-center gap-1.5 text-xs mt-0.5 ml-[18px]" style={{ color: 'var(--text-muted)' }}>
                                        {facility}
                                    </div>
                                )}

                                {/* Vessel + Mode */}
                                {(vesselName || voyage || mode) && (
                                    <div className="flex items-center gap-1.5 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                        {ModeIcon && <ModeIcon />}
                                        <span>
                                            {mode && <span>{mode}</span>}
                                            {vesselName && <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{mode ? ' — ' : ''}{vesselName}</span>}
                                            {voyage && <span style={{ color: 'var(--text-muted)' }}> / Voyage {voyage}</span>}
                                        </span>
                                    </div>
                                )}

                                {/* Equipment info */}
                                {event.equipmentReference && (
                                    <div className="flex items-center gap-2 text-xs mt-1 pt-1" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-glass)' }}>
                                        <span>Container: <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{event.equipmentReference}</span></span>
                                        {event.isoEquipmentCode && <span>ISO: {event.isoEquipmentCode}</span>}
                                        {event.emptyIndicatorCode && (
                                            <span className="px-1.5 py-0 rounded text-[10px] font-semibold"
                                                style={{
                                                    background: event.emptyIndicatorCode === 'LADEN' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0,0,0,0.04)',
                                                    color: event.emptyIndicatorCode === 'LADEN' ? '#d97706' : 'var(--text-muted)',
                                                }}>
                                                {event.emptyIndicatorCode}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
