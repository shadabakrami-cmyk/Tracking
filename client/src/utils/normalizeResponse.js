/**
 * Normalizes any Oceanio / DCSA-like API response into a standardized
 * array of DCSA events, regardless of the original response shape.
 *
 * Handles:
 *  - snake_case vs camelCase field names
 *  - Oceanio containers[].events nesting
 *  - Various response envelopes (events, data, results, items, root array)
 *  - Nested transport call / location / vessel structures
 *  - Missing or partial fields
 */

// ─── Helpers ───────────────────────────────────────────────────────────────────

function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

/** Recursively convert all keys in an object/array from snake_case to camelCase */
function deepCamelCase(obj) {
    if (Array.isArray(obj)) return obj.map(deepCamelCase)
    if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [snakeToCamel(k), deepCamelCase(v)])
        )
    }
    return obj
}

// ─── Event Extraction ──────────────────────────────────────────────────────────

/** Try every common envelope shape to find the events array */
function extractEventsArray(data) {
    if (!data) return []

    // Already an array at the top level
    if (Array.isArray(data)) return data

    // ── Oceanio-specific: containers[].events ──
    // The Oceanio API wraps events inside a containers array:
    // { containers: [{ equipmentReference, events: [...] }] }
    if (Array.isArray(data.containers)) {
        const all = []
        for (const container of data.containers) {
            if (Array.isArray(container.events)) {
                all.push(...container.events)
            }
        }
        if (all.length > 0) return all
    }

    // Common wrapper keys (check in priority order)
    const keys = ['events', 'data', 'results', 'items', 'records', 'payload']
    for (const key of keys) {
        if (Array.isArray(data[key])) return data[key]
    }

    // Nested one level deeper  (e.g. { data: { events: [...] } })
    for (const key of keys) {
        if (data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
            for (const innerKey of keys) {
                if (Array.isArray(data[key][innerKey])) return data[key][innerKey]
            }
        }
    }

    // Last resort: if the response itself looks like a single event object, wrap it
    if (data.eventType || data.event_type || data.eventID || data.event_id) {
        return [data]
    }

    return []
}

// ─── Single-Event Normalizer ───────────────────────────────────────────────────

function classifyEventType(evt) {
    // Explicit eventType
    if (evt.eventType) return evt.eventType.toUpperCase()

    // Infer from which type-code field is present
    if (evt.transportEventTypeCode) return 'TRANSPORT'
    if (evt.equipmentEventTypeCode) return 'EQUIPMENT'
    if (evt.shipmentEventTypeCode) return 'SHIPMENT'

    return 'TRANSPORT' // default fallback
}

function getTypeCode(evt) {
    return (
        evt.transportEventTypeCode ||
        evt.equipmentEventTypeCode ||
        evt.shipmentEventTypeCode ||
        evt.eventTypeCode ||
        evt.typeCode ||
        null
    )
}

function getDateTime(evt) {
    return (
        evt.eventDateTime ||
        evt.eventDatetime ||
        evt.eventCreatedDateTime ||
        evt.eventCreatedDatetime ||
        evt.eventDatetimeLocale ||
        evt.eventDate ||
        evt.createdAt ||
        evt.timestamp ||
        null
    )
}

function getClassifier(evt) {
    return evt.eventClassifierCode || evt.classifierCode || null
}

function getLocation(evt) {
    // DCSA standard: transportCall.location.locationName
    const tc = evt.transportCall || evt.transportCallObject || {}
    const loc = tc.location || evt.location || {}
    return {
        locationName:
            loc.locationName ||
            loc.facilityName ||
            loc.name ||
            loc.unLocationCode ||
            loc.UNLocationCode ||
            tc.unLocationCode ||
            null,
        unLocationCode:
            loc.unLocationCode ||
            loc.UNLocationCode ||
            tc.unLocationCode ||
            loc.locode ||
            null,
    }
}

function getVessel(evt) {
    const tc = evt.transportCall || {}
    const v = tc.vessel || evt.vessel || {}
    return {
        vesselName: v.vesselName || v.name || null,
        voyageNumber:
            tc.carrierVoyageNumber ||
            tc.voyageNumber ||
            v.voyageNumber ||
            evt.carrierVoyageNumber ||
            null,
    }
}

function normalizeEvent(raw) {
    const eventType = classifyEventType(raw)

    const typeCode = getTypeCode(raw)
    const codeField = `${eventType.toLowerCase()}EventTypeCode`

    const location = getLocation(raw)
    const vessel = getVessel(raw)

    // Extra Oceanio-specific nested fields
    const tc = raw.transportCall || {}
    const loc = tc.location || {}

    return {
        // Core DCSA fields
        eventType,
        [codeField]: typeCode,
        eventClassifierCode: getClassifier(raw),
        eventDateTime: getDateTime(raw),

        // Human-readable description from Oceanio
        eventDescription: raw.eventDescription || null,

        // Nested structures in DCSA format
        transportCall: {
            location: {
                locationName: location.locationName,
                facilityName: loc.facilityName || null,
                country: loc.country || null,
                locode: loc.locode || location.unLocationCode || null,
            },
            vessel: { vesselName: vessel.vesselName },
            carrierVoyageNumber: vessel.voyageNumber,
            modeOfTransport: tc.modeOfTransport || null,
            transportCallType: tc.transportCallType || null,
        },

        // Shipment context
        legNumber: raw.legNumber || null,
        legType: raw.legType || null,
        sourceType: raw.sourceType || null,
        equipmentReference: raw.equipmentReference || null,
        emptyIndicatorCode: raw.emptyIndicatorCode || null,
        isoEquipmentCode: raw.isoEquipmentCode || null,

        // Keep the original for reference
        _raw: raw,
    }
}

// ─── Metadata Extraction ───────────────────────────────────────────────────────

function extractMetadata(data) {
    return {
        identifier: data.identifier || null,
        identifierType: data.identifierType || null,
        transportStatus: data.transportStatus || null,
        numberOfRelatedEquipments: data.numberOfRelatedEquipments || null,
    }
}

// ─── Main Export ───────────────────────────────────────────────────────────────

/**
 * @param {any} rawResponse  — raw JSON from Oceanio API
 * @returns {{ totalEvents, transportEvents, equipmentEvents, shipmentEvents, allEvents, metadata }}
 */
export function normalizeResponse(rawResponse) {
    // 1. Convert everything to camelCase so the rest of the pipeline is consistent
    const camel = deepCamelCase(rawResponse)

    // 2. Extract top-level metadata
    const metadata = extractMetadata(camel)

    // 3. Find the events array no matter the envelope
    const rawEvents = extractEventsArray(camel)

    // 4. Normalize every event to DCSA standard shape
    const allEvents = rawEvents.map(normalizeEvent)

    return {
        totalEvents: allEvents.length,
        transportEvents: allEvents.filter((e) => e.eventType === 'TRANSPORT'),
        equipmentEvents: allEvents.filter((e) => e.eventType === 'EQUIPMENT'),
        shipmentEvents: allEvents.filter((e) => e.eventType === 'SHIPMENT'),
        allEvents,
        metadata,
    }
}
