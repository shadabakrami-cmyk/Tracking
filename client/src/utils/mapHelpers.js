// ─── Douglas-Peucker Path Simplification ────────────────────────────────────

function perpendicularDistance(point, lineStart, lineEnd) {
    const dx = lineEnd[0] - lineStart[0]
    const dy = lineEnd[1] - lineStart[1]
    const mag = Math.sqrt(dx * dx + dy * dy)
    if (mag === 0) return Math.sqrt((point[0] - lineStart[0]) ** 2 + (point[1] - lineStart[1]) ** 2)
    const u = ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / (mag * mag)
    const closestX = lineStart[0] + u * dx
    const closestY = lineStart[1] + u * dy
    return Math.sqrt((point[0] - closestX) ** 2 + (point[1] - closestY) ** 2)
}

export function douglasPeucker(points, epsilon = 0.005) {
    if (points.length <= 2) return points
    let maxDist = 0, idx = 0
    for (let i = 1; i < points.length - 1; i++) {
        const d = perpendicularDistance(points[i], points[0], points[points.length - 1])
        if (d > maxDist) { maxDist = d; idx = i }
    }
    if (maxDist > epsilon) {
        const left = douglasPeucker(points.slice(0, idx + 1), epsilon)
        const right = douglasPeucker(points.slice(idx), epsilon)
        return left.slice(0, -1).concat(right)
    }
    return [points[0], points[points.length - 1]]
}

// ─── Bearing Calculation ─────────────────────────────────────────────────────

export function bearing(lat1, lng1, lat2, lng2) {
    const toRad = d => d * Math.PI / 180
    const toDeg = r => r * 180 / Math.PI
    const dLng = toRad(lng2 - lng1)
    const y = Math.sin(dLng) * Math.cos(toRad(lat2))
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
        Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng)
    return (toDeg(Math.atan2(y, x)) + 360) % 360
}

// ─── Voyage Segmentation ─────────────────────────────────────────────────────

/**
 * Groups positions into port-to-port segments based on portcall timestamps.
 * @param {Array} positions - sorted by position_datetime
 * @param {Array} portcalls - sorted chronologically
 * @returns {Array<{from, to, positions, color}>}
 */
export function segmentVoyage(positions, portcalls) {
    if (!positions.length || portcalls.length < 2) {
        return [{ from: null, to: null, positions, segIndex: 0 }]
    }

    // Build departure windows from portcall ATD timestamps
    const windows = []
    for (let i = 0; i < portcalls.length - 1; i++) {
        const departTime = portcalls[i].atd_datetime || portcalls[i].etd_datetime || portcalls[i].std_datetime
        const arriveTime = portcalls[i + 1].ata_datetime || portcalls[i + 1].eta_datetime || portcalls[i + 1].sta_datetime
        windows.push({
            from: portcalls[i],
            to: portcalls[i + 1],
            departMs: departTime ? new Date(departTime).getTime() : -Infinity,
            arriveMs: arriveTime ? new Date(arriveTime).getTime() : Infinity,
        })
    }

    // Assign each position to a segment
    const segments = windows.map((w, i) => ({
        from: w.from,
        to: w.to,
        positions: [],
        segIndex: i,
    }))

    for (const pos of positions) {
        if (!pos.position_datetime) {
            // No timestamp — put in last segment
            segments[segments.length - 1].positions.push(pos)
            continue
        }
        const t = new Date(pos.position_datetime).getTime()
        let placed = false
        for (let i = 0; i < windows.length; i++) {
            if (t >= windows[i].departMs && t <= windows[i].arriveMs) {
                segments[i].positions.push(pos)
                placed = true
                break
            }
        }
        if (!placed) {
            // Find closest segment by time
            let closest = 0, minDiff = Infinity
            for (let i = 0; i < windows.length; i++) {
                const mid = (windows[i].departMs + windows[i].arriveMs) / 2
                const diff = Math.abs(t - mid)
                if (diff < minDiff) { minDiff = diff; closest = i }
            }
            segments[closest].positions.push(pos)
        }
    }

    return segments.filter(s => s.positions.length > 0)
}

// ─── Segment Color Palette ───────────────────────────────────────────────────

const SEGMENT_COLORS = [
    '#38bdf8', // sky-400
    '#06b6d4', // cyan-500
    '#0891b2', // cyan-600
    '#0e7490', // cyan-700
    '#155e75', // cyan-800
    '#164e63', // cyan-900
    '#1e40af', // blue-800
    '#1e3a5f', // navy
]

export function getSegmentColor(index) {
    return SEGMENT_COLORS[index % SEGMENT_COLORS.length]
}
