const COLOR_MAP = {
    TRANSPORT: { background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' },
    EQUIPMENT: { background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' },
    SHIPMENT: { background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' },
}

const DEFAULT_STYLE = { background: 'rgba(0,0,0,0.04)', color: 'var(--text-secondary)' }

export default function EventBadge({ code, eventType }) {
    const colorStyle = COLOR_MAP[eventType] || DEFAULT_STYLE

    return (
        <span
            className="inline-block px-2 py-0.5 rounded-md text-xs font-semibold tracking-wide"
            style={colorStyle}
        >
            {code}
        </span>
    )
}
