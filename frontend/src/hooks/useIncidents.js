import { useCallback, useEffect, useRef, useState } from 'react'
import { REALTIME_CHANNEL, REALTIME_EVENT } from '@/lib/constants'
import {
  extractIncidentFromPayload,
  isAwaitingPhotosTransition,
  mergeIncidentUpdate,
} from '@/lib/incident-updates'
import { insforge, isInsforgeConfigured } from '@/lib/insforge'
import { MOCK_INCIDENTS } from '@/lib/mock-incidents'

const LIST_COLUMNS =
  'id, case_number, incident_type, status, created_at, caller_name, location'

const POLL_MS = 5000

export function useIncidents() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  /** Incident IDs that should show the inline upload widget (Stage 1 trigger). */
  const [uploadPromptIds, setUploadPromptIds] = useState(() => new Set())
  /** Incident IDs with upload submitted, awaiting analysis (Stage 2). */
  const [analyzingIds, setAnalyzingIds] = useState(() => new Set())

  const prevStatusRef = useRef(new Map())
  const incidentsRef = useRef([])
  const fetchIncidentsRef = useRef(null)

  const markUploadPrompt = useCallback((incidentId) => {
    setUploadPromptIds((prev) => {
      if (prev.has(incidentId)) return prev
      const next = new Set(prev)
      next.add(incidentId)
      return next
    })
  }, [])

  const handleUploadSuccess = useCallback((incidentId) => {
    setUploadPromptIds((prev) => {
      const next = new Set(prev)
      next.delete(incidentId)
      return next
    })
    setAnalyzingIds((prev) => {
      const next = new Set(prev)
      next.add(incidentId)
      return next
    })
    fetchIncidentsRef.current?.()
  }, [])

  const applyStatusTransitions = useCallback(
    (rows) => {
      for (const row of rows) {
        const prev = prevStatusRef.current.get(row.id)
        const next = row.status

        if (isAwaitingPhotosTransition(prev, next)) {
          markUploadPrompt(row.id)
        }

        prevStatusRef.current.set(row.id, next)
      }
    },
    [markUploadPrompt],
  )

  const setIncidentsWithTransitions = useCallback(
    (rows) => {
      applyStatusTransitions(rows)
      incidentsRef.current = rows
      setIncidents(rows)
    },
    [applyStatusTransitions],
  )

  const fetchIncidents = useCallback(async () => {
    if (!isInsforgeConfigured) {
      setIncidentsWithTransitions(MOCK_INCIDENTS)
      setError(null)
      setLoading(false)
      return
    }

    const { data, error: fetchError } = await insforge.database
      .from('incidents')
      .select(LIST_COLUMNS)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setIncidentsWithTransitions(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [setIncidentsWithTransitions])

  fetchIncidentsRef.current = fetchIncidents

  const handleRealtimePayload = useCallback(
    (payload) => {
      const updated = extractIncidentFromPayload(payload)
      if (!updated?.id) {
        fetchIncidents()
        return
      }

      const merged = mergeIncidentUpdate(incidentsRef.current, updated)
      if (merged) {
        setIncidentsWithTransitions(merged)
      } else {
        fetchIncidents()
      }
    },
    [fetchIncidents, setIncidentsWithTransitions],
  )

  useEffect(() => {
    fetchIncidents()
  }, [fetchIncidents])

  useEffect(() => {
    if (!isInsforgeConfigured) return undefined

    let cancelled = false
    let pollTimer = null

    async function setupRealtime() {
      try {
        await insforge.realtime.connect()
        const response = await insforge.realtime.subscribe(REALTIME_CHANNEL)

        if (cancelled) return

        if (!response.ok) {
          throw new Error(response.error?.message ?? 'Realtime subscribe failed')
        }

        insforge.realtime.on(REALTIME_EVENT, handleRealtimePayload)
      } catch {
        // Anon key may not support Realtime — poll so manual InsForge updates still appear.
        if (!cancelled) {
          pollTimer = setInterval(fetchIncidents, POLL_MS)
        }
      }
    }

    setupRealtime()

    return () => {
      cancelled = true
      if (pollTimer) clearInterval(pollTimer)
      insforge.realtime.off(REALTIME_EVENT, handleRealtimePayload)
      insforge.realtime.unsubscribe(REALTIME_CHANNEL)
    }
  }, [fetchIncidents, handleRealtimePayload])

  return {
    incidents,
    loading,
    error,
    uploadPromptIds,
    analyzingIds,
    handleUploadSuccess,
    refetch: fetchIncidents,
  }
}
