import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ServiceProvider } from './services/ServiceContext'
import { ThemeProvider } from './context/ThemeContext'
import { SearchProvider } from './context/SearchContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ServiceProvider>
        <ThemeProvider>
          <SearchProvider>
            <App />
          </SearchProvider>
        </ThemeProvider>
      </ServiceProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
