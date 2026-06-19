import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { assistantId, getVapiClient, isVapiConfigured } from '@/lib/vapi'

const VapiContext = createContext(null)

function formatMessage(message) {
  if (message.type === 'transcript') {
    const text = message.transcript?.trim()
    if (!text) return null

    // Partial transcripts stream word-by-word — only render complete turns.
    if (message.transcriptType === 'partial') return null

    return {
      role: message.role,
      text,
      label: message.role === 'user' ? 'You' : 'Agent',
    }
  }
  if (message.type === 'tool-calls') {
    const names = (message.toolCallList ?? [])
      .map((tc) => tc.name ?? tc.function?.name)
      .filter(Boolean)
    if (names.length === 0) return null
    return {
      role: 'system',
      text: `Tool called: ${names.join(', ')}`,
      label: 'System',
    }
  }
  return null
}

export function VapiProvider({ children }) {
  const [status, setStatus] = useState('idle')
  const [messages, setMessages] = useState([])
  const [error, setError] = useState(null)
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false)
  const [micLevel, setMicLevel] = useState(0)
  const [micTestStatus, setMicTestStatus] = useState(null)
  const [micTestMessage, setMicTestMessage] = useState('')
  const [isMicTesting, setIsMicTesting] = useState(false)
  const [micTestLevel, setMicTestLevel] = useState(0)
  const [sdkReady, setSdkReady] = useState(false)

  const handlersRef = useRef(null)
  const listenersBoundRef = useRef(false)
  const callActiveRef = useRef(false)
  const testStreamRef = useRef(null)
  const testAudioContextRef = useRef(null)
  const testAnimationRef = useRef(null)

  const stopMicTest = useCallback(() => {
    if (testAnimationRef.current) {
      cancelAnimationFrame(testAnimationRef.current)
      testAnimationRef.current = null
    }
    testStreamRef.current?.getTracks().forEach((track) => track.stop())
    testStreamRef.current = null
    testAudioContextRef.current?.close().catch(() => {})
    testAudioContextRef.current = null
    setMicTestLevel(0)
    setIsMicTesting(false)
  }, [])

  const appendMessage = useCallback((entry) => {
    if (!entry?.text?.trim()) return
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (
        last &&
        last.role === entry.role &&
        last.text === entry.text
      ) {
        return prev
      }
      return [...prev, { ...entry, id: `${entry.role}-${prev.length}` }]
    })
  }, [])

  const bindListeners = useCallback(
    async (vapi) => {
      if (!vapi || listenersBoundRef.current) return

      const onCallStart = () => {
        callActiveRef.current = true
        setStatus('active')
        setError(null)
      }

      const onCallEnd = () => {
        callActiveRef.current = false
        setStatus('ended')
        setIsAgentSpeaking(false)
        setMicLevel(0)
      }

      const onSpeechStart = () => setIsAgentSpeaking(true)
      const onSpeechEnd = () => setIsAgentSpeaking(false)
      const onVolumeLevel = (level) => {
        setMicLevel(typeof level === 'number' ? level : 0)
      }
      const onMessage = (message) => {
        const entry = formatMessage(message)
        if (entry) appendMessage(entry)
      }
      const onError = (err) => {
        callActiveRef.current = false
        setStatus('error')
        setError(err?.message ?? 'Call error')
      }

      vapi.on('call-start', onCallStart)
      vapi.on('call-end', onCallEnd)
      vapi.on('speech-start', onSpeechStart)
      vapi.on('speech-end', onSpeechEnd)
      vapi.on('volume-level', onVolumeLevel)
      vapi.on('message', onMessage)
      vapi.on('error', onError)

      handlersRef.current = {
        vapi,
        onCallStart,
        onCallEnd,
        onSpeechStart,
        onSpeechEnd,
        onVolumeLevel,
        onMessage,
        onError,
      }
      listenersBoundRef.current = true
    },
    [appendMessage],
  )

  useEffect(() => {
    if (!isVapiConfigured) return undefined

    let cancelled = false

    async function initVapi() {
      try {
        const vapi = await getVapiClient()
        if (cancelled || !vapi) return
        await bindListeners(vapi)
        setSdkReady(true)
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          setError(err?.message ?? 'Failed to load Vapi SDK')
        }
      }
    }

    initVapi()

    return () => {
      cancelled = true
      if (callActiveRef.current) return
      stopMicTest()
      const handlers = handlersRef.current
      if (handlers?.vapi) {
        handlers.vapi.removeListener('call-start', handlers.onCallStart)
        handlers.vapi.removeListener('call-end', handlers.onCallEnd)
        handlers.vapi.removeListener('speech-start', handlers.onSpeechStart)
        handlers.vapi.removeListener('speech-end', handlers.onSpeechEnd)
        handlers.vapi.removeListener('volume-level', handlers.onVolumeLevel)
        handlers.vapi.removeListener('message', handlers.onMessage)
        handlers.vapi.removeListener('error', handlers.onError)
        listenersBoundRef.current = false
        handlersRef.current = null
      }
    }
  }, [bindListeners, stopMicTest])

  const startCall = useCallback(async () => {
    if (!isVapiConfigured) {
      setError('Add VITE_VAPI_PUBLIC_KEY and VITE_VAPI_ASSISTANT_ID to .env')
      setStatus('error')
      return
    }

    stopMicTest()
    callActiveRef.current = true
    setStatus('connecting')
    setError(null)
    setMessages([])

    try {
      const vapi = await getVapiClient()
      await bindListeners(vapi)
      await vapi.start(assistantId)
    } catch (err) {
      callActiveRef.current = false
      setStatus('error')
      setError(err?.message ?? 'Failed to start call')
    }
  }, [bindListeners, stopMicTest])

  const stopCall = useCallback(() => {
    const vapi = handlersRef.current?.vapi
    vapi?.stop()
    callActiveRef.current = false
    setStatus('ended')
    setIsAgentSpeaking(false)
    setMicLevel(0)
  }, [])

  const testMicrophone = useCallback(async () => {
    if (isMicTesting) {
      stopMicTest()
      setMicTestMessage('Mic test stopped.')
      return
    }

    setMicTestStatus(null)
    setMicTestMessage('')

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicTestStatus('error')
      setMicTestMessage('Microphone API not available in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      testStreamRef.current = stream

      const audioContext = new AudioContext()
      testAudioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      const data = new Uint8Array(analyser.frequencyBinCount)

      const tick = () => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((sum, v) => sum + v, 0) / data.length
        setMicTestLevel(Math.min(1, avg / 128))
        testAnimationRef.current = requestAnimationFrame(tick)
      }
      tick()

      setIsMicTesting(true)
      setMicTestStatus('ok')
      setMicTestMessage(
        'Mic is live — speak and watch the level bar. Click "Stop mic test" when done.',
      )
    } catch (err) {
      stopMicTest()
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setMicTestStatus('denied')
        setMicTestMessage('Microphone blocked. Allow mic access for localhost in browser settings.')
      } else if (err?.name === 'NotFoundError') {
        setMicTestStatus('error')
        setMicTestMessage('No microphone found on this device.')
      } else {
        setMicTestStatus('error')
        setMicTestMessage(err?.message ?? 'Could not access microphone.')
      }
    }
  }, [isMicTesting, stopMicTest])

  const reset = useCallback(() => {
    stopMicTest()
    callActiveRef.current = false
    setStatus('idle')
    setMessages([])
    setError(null)
    setIsAgentSpeaking(false)
    setMicLevel(0)
  }, [stopMicTest])

  const isUserSpeaking = micLevel > 0.06
  const isCallLive = status === 'active' || status === 'connecting'

  const value = {
    status,
    messages,
    error,
    isAgentSpeaking,
    isUserSpeaking,
    micLevel,
    isMicTesting,
    micTestLevel,
    micTestStatus,
    micTestMessage,
    isConfigured: isVapiConfigured && sdkReady,
    isLoadingSdk: isVapiConfigured && !sdkReady,
    isActive: isCallLive,
    isCallLive,
    startCall,
    stopCall,
    reset,
    testMicrophone,
    stopMicTest,
  }

  return <VapiContext.Provider value={value}>{children}</VapiContext.Provider>
}

export function useVapiCall() {
  const ctx = useContext(VapiContext)
  if (!ctx) {
    throw new Error('useVapiCall must be used within VapiProvider')
  }
  return ctx
}
