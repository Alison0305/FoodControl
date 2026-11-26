import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { JornadaProvider } from './context/JornadaContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <JornadaProvider>
          <App />
        </JornadaProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
