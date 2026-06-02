import { ReplayOverlay } from '@/features/overlay/ReplayOverlay'
import { WorkspacePage } from '@/pages/workspace/WorkspacePage'
import '@/styles/App.css'
import '@/styles/timeline.css'

function App() {
  const isOverlay = new URLSearchParams(window.location.search).get('view') === 'overlay'
  return isOverlay ? <ReplayOverlay /> : <WorkspacePage />
}

export default App
