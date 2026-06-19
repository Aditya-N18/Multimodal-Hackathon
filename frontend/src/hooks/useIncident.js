import { useCallback, useEffect, useState } from 'react'
import { REALTIME_CHANNEL, REALTIME_EVENT } from '@/lib/constants'
import { insforge, isInsforgeConfigured } from '@/lib/insforge'
import { getMockIncident } from '@/lib/mock-incidents'

export function useIncident(id) {
  const [incident, setIncident] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchIncident = useCallback(async () => {
    if (!id) return

    if (!isInsforgeConfigured) {
      setIncident(getMockIncident(id))
      setError(getMockIncident(id) ? null : 'Incident not found')
      setLoading(false)
      return
    }

    const { data, error: fetchError } = await insforge.database
      .from('incidents')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      setError(fetchError.message)
      setIncident(null)
    } else {
      setIncident(data)
      setError(null)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    setLoading(true)
    fetchIncident()
  }, [fetchIncident])

  useEffect(() => {
    if (!isInsforgeConfigured || !id) return undefined

    let cancelled = false

    async function setupRealtime() {
      await insforge.realtime.connect()
      const response = await insforge.realtime.subscribe(REALTIME_CHANNEL)

      if (!response.ok || cancelled) return

      const handleUpdate = (payload) => {
        const record = payload?.record ?? payload
        const incidentId = record?.id ?? payload?.incident_id

        if (incidentId === id) {
          if (record && record.id) {
            setIncident(record)
          } else {
            fetchIncident()
          }
        }
      }

      insforge.realtime.on(REALTIME_EVENT, handleUpdate)

      return () => {
        insforge.realtime.off(REALTIME_EVENT, handleUpdate)
      }
    }

    const cleanupPromise = setupRealtime()

    return () => {
      cancelled = true
      cleanupPromise.then((cleanup) => cleanup?.())
      insforge.realtime.unsubscribe(REALTIME_CHANNEL)
    }
  }, [id, fetchIncident])

  return { incident, loading, error, refetch: fetchIncident }
}
