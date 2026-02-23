import { useState } from 'react'
import AuthScreen from './components/AuthScreen'
import TrackingScreen from './components/TrackingScreen'

function App() {
  const [auth, setAuth] = useState(null) // { token, apiKey }

  const handleConnect = (token, apiKey) => {
    setAuth({ token, apiKey })
  }

  const handleDisconnect = () => {
    setAuth(null)
  }

  return auth ? (
    <TrackingScreen auth={auth} onDisconnect={handleDisconnect} />
  ) : (
    <AuthScreen onConnect={handleConnect} />
  )
}

export default App
