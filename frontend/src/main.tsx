/// <reference types="vite/client" />
import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import { App } from './App'
import './index.css'

if (typeof window !== 'undefined') {
  // 屏蔽 Chrome DevTools 内部实验性 Soft Navigation / Web-Vitals 监测脚本抛出的未知 entry.startTime 缺陷
  window.addEventListener('error', (event) => {
    if (
      event.message?.includes("reading 'startTime'") &&
      (!event.filename || event.filename.includes('anonymous') || event.filename.includes('content_main'))
    ) {
      event.preventDefault()
    }
  })
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
