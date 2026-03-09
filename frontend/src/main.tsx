import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// Register service worker with automatic reload on update
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Automatically reload to show new version
    // Silent auto-reload (recommended for frequent updates)
    console.log('New version available, reloading...')
    updateSW(true)
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
  onRegistered(registration) {
    console.log('Service Worker registered')
    
    // Check for updates every 60 seconds
    if (registration) {
      setInterval(() => {
        console.log('Checking for updates...')
        registration.update()
      }, 60 * 1000)
    }
  },
  onRegisterError(error: Error) {
    console.error('SW registration failed:', error)
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
