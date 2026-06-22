import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import './styles.css'
import App from './App'
import { PlacesProvider } from './context/PlacesContext'
import { SocialProvider } from './context/SocialContext'
import { LocationProvider } from './context/LocationContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><PlacesProvider><LocationProvider><SocialProvider><App /></SocialProvider></LocationProvider></PlacesProvider></BrowserRouter></React.StrictMode>,
)
