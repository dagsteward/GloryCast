import './styles/globals.css'
import './lib/electron-stub'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'

// The window.glorycast bridge is declared once in types/global.d.ts.
// A second declaration here diverged from the preload script and masked
// missing APIs from the type checker.

const root = document.getElementById('root')!
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
