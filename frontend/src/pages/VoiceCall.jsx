import { ArrowLeft, Phone } from 'lucide-react'
import VoiceAssistant from '@/components/VoiceAssistant'

export default function VoiceCall() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-cyan-400">
          <Phone className="h-3.5 w-3.5" />
          Browser voice test
        </div>
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="text-gradient">Voice Agent</span>
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Test the EvidenceLine assistant in your browser. Uses the same assistant
          and server tools as the phone number — check the dashboard for new cases.
          Your call stays active until you explicitly end it.
        </p>
      </div>
      <VoiceAssistant />
    </div>
  )
}
