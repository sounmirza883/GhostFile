import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

if (!window.crypto?.subtle) {
  document.getElementById('root')!.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;padding:2rem;text-align:center">
      <div>
        <h1 style="font-size:1.5rem;font-weight:bold;color:#111">Browser not supported</h1>
        <p style="margin-top:0.5rem;color:#666">GhostFile requires the Web Crypto API.<br>Please use a modern browser: Chrome, Firefox, Safari, or Edge.</p>
      </div>
    </div>
  `
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
