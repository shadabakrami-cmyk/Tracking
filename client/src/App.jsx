import { useState } from 'react'
import Navbar from './components/Navbar'
import AuthScreen from './components/AuthScreen'
import TrackingScreen from './components/TrackingScreen'
import CargoAuthScreen from './components/CargoAuthScreen'
import CargoTrackingScreen from './components/CargoTrackingScreen'

function App() {
  const [activeSection, setActiveSection] = useState('ocean')
  const [oceanAuth, setOceanAuth] = useState(null)   // { token, apiKey }
  const [cargoApiKey, setCargoApiKey] = useState(null) // string

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

  // Determine what to render in the content area
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
      <Navbar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        oceanAuth={oceanAuth}
        cargoAuth={cargoApiKey}
        onOceanDisconnect={handleOceanDisconnect}
        onCargoDisconnect={handleCargoDisconnect}
      />
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {content}
      </main>
    </div>
  )
}

export default App
