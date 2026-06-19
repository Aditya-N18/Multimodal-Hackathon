import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import IncidentList from '@/pages/IncidentList'
import IncidentDetail from '@/pages/IncidentDetail'
import { VapiProvider } from '@/context/VapiContext'

const VoiceCall = lazy(() => import('@/pages/VoiceCall'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-400" />
    </div>
  )
}

export default function App() {
  return (
    <VapiProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<IncidentList />} />
            <Route path="incidents/:id" element={<IncidentDetail />} />
            <Route
              path="call"
              element={
                <Suspense fallback={<PageLoader />}>
                  <VoiceCall />
                </Suspense>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </VapiProvider>
  )
}
