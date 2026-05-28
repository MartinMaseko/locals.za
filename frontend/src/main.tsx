import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// Register service worker — force-apply any waiting update immediately.
// skipWaiting + clientsClaim in workbox config ensures the new SW takes
// control of all tabs the moment it's installed.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // New version available — reload silently, no user prompt needed.
    updateSW(true)
  },
  onOfflineReady() {},
  onRegistered(registration) {
    if (!registration) return

    // 1. Check for an update immediately after registration.
    registration.update()

    // 2. Re-check whenever the user returns to the tab — catches deploys
    //    that happened while the tab was in the background.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update()
      }
    })
  },
  onRegisterError() {},
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
