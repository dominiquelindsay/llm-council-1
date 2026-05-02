import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CouncilProvider } from './CouncilContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CouncilProvider>
      <App />
    </CouncilProvider>
  </StrictMode>,
)
