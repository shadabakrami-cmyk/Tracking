import { useState } from 'react'
import Navbar from './components/Navbar'
import LandingScreen from './components/LandingScreen'
import AuthScreen from './components/AuthScreen'
import TrackingScreen from './components/TrackingScreen'
import CargoAuthScreen from './components/CargoAuthScreen'
import CargoTrackingScreen from './components/CargoTrackingScreen'

function App() {
  const [activeSection, setActiveSection] = useState(null) // null = landing, 'ocean' | 'cargo'
  const [oceanAuth, setOceanAuth] = useState(null)
  const [cargoApiKey, setCargoApiKey] = useState(null)

  const handleOceanConnect = (token, apiKey) => {
    setOceanAuth({ token, apiKey })
  }

  const handleOceanDisconnect = () => {
    setOceanAuth(null)
  }

  const handleCargoConnect = (key) => {
    setCargoApiKey(key)
  }

  const handleCargoDisconnect = () => {
    setCargoApiKey(null)
  }

  // Landing screen — no navbar, just two cards
  if (!activeSection) {
    return (
      <div className="h-screen flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(145deg, var(--bg-primary), var(--bg-secondary))' }}>
        <LandingScreen onSelect={setActiveSection} />
      </div>
    )
  }

  // Determine content for the active section
  let content
  if (activeSection === 'ocean') {
    content = oceanAuth
      ? <TrackingScreen auth={oceanAuth} onDisconnect={handleOceanDisconnect} />
      : <AuthScreen onConnect={handleOceanConnect} />
  } else {
    content = cargoApiKey
      ? <CargoTrackingScreen rapidApiKey={cargoApiKey} />
      : <CargoAuthScreen onConnect={handleCargoConnect} />
  }

  return (
    <div className="h-screen flex flex-row overflow-hidden" style={{ background: 'linear-gradient(145deg, var(--bg-primary), var(--bg-secondary))' }}>
      <div style={{ animation: 'navSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) both' }}>
        <Navbar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          oceanAuth={oceanAuth}
          cargoAuth={cargoApiKey}
          onOceanDisconnect={handleOceanDisconnect}
          onCargoDisconnect={handleCargoDisconnect}
        />
      </div>
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto"
        style={{ animation: 'fadeIn 0.5s ease-out 0.2s both' }}>
        {content}
      </main>
    </div>
  )
}

export default App
