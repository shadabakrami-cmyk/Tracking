import { useState } from 'react'

const API_URL = 'http://localhost:4000/api'

export default function AuthScreen({ onConnect }) {
    const [userId, setUserId] = useState('')
    const [password, setPassword] = useState('')
    const [apiKey, setApiKey] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!userId.trim() || !password.trim() || !apiKey.trim()) {
            setError('All fields are required.')
            return
        }

        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/auth/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId.trim(), password: password.trim(), apiKey: apiKey.trim() }),
            })
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || data.message || data.detail || `Authentication failed (${res.status})`)
                return
            }

            const accessToken = data.token || data.access_token || data.accessToken || data.jwt
            if (!accessToken) {
                setError('No token received from API.')
                return
            }

            onConnect(accessToken, apiKey.trim())
        } catch (err) {
            setError('Network error — is the proxy server running on port 4000?')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
            {/* Animated background orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute rounded-full opacity-10 blur-3xl"
                    style={{
                        width: '500px', height: '500px',
                        background: 'radial-gradient(circle, #3b82f6, transparent 70%)',
                        top: '-10%', left: '-10%',
                        animation: 'float 8s ease-in-out infinite',
                    }}
                />
                <div
                    className="absolute rounded-full opacity-8 blur-3xl"
                    style={{
                        width: '400px', height: '400px',
                        background: 'radial-gradient(circle, #8b5cf6, transparent 70%)',
                        bottom: '-5%', right: '-5%',
                        animation: 'float 10s ease-in-out infinite 2s',
                    }}
                />
                <div
                    className="absolute rounded-full opacity-5 blur-3xl"
                    style={{
                        width: '300px', height: '300px',
                        background: 'radial-gradient(circle, #06b6d4, transparent 70%)',
                        top: '40%', right: '20%',
                        animation: 'float 12s ease-in-out infinite 4s',
                    }}
                />
            </div>

            <div className="w-full max-w-md relative" style={{ animation: 'slideUp 0.6s ease-out' }}>
                {/* Brand */}
                <div className="text-center mb-8">
                    {/* Logo icon */}
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                        style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-glow-blue)' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 20l.9-4A3 3 0 0 1 5.8 14H18.2a3 3 0 0 1 2.9 2l.9 4" />
                            <path d="M4 14V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8" />
                            <path d="M12 4v4" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight"
                        style={{ fontFamily: "'Outfit', sans-serif", background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Oceanio Tracker
                    </h1>
                    <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                        Connect your API credentials to begin tracking
                    </p>
                </div>

                {/* Form Card */}
                <div className="rounded-2xl p-6 backdrop-blur-xl"
                    style={{
                        background: 'rgba(255, 255, 255, 0.8)',
                        border: '1px solid var(--border-glass)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
                    }}>
                    <form onSubmit={handleSubmit}>
                        {/* User ID */}
                        <div className="mb-4">
                            <label htmlFor="userId" className="block text-sm font-medium mb-1.5"
                                style={{ color: 'var(--text-secondary)' }}>
                                User ID
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                    </svg>
                                </span>
                                <input
                                    id="userId"
                                    type="text"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    placeholder="Enter your User ID"
                                    className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none"
                                    style={{
                                        background: 'rgba(255,255,255,0.9)',
                                        border: '1px solid var(--border-glass)',
                                        color: 'var(--text-primary)',
                                    }}
                                    onFocus={(e) => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'var(--border-glass)'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="mb-4">
                            <label htmlFor="password" className="block text-sm font-medium mb-1.5"
                                style={{ color: 'var(--text-secondary)' }}>
                                Password
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                </span>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none"
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--border-glass)',
                                        color: 'var(--text-primary)',
                                    }}
                                    onFocus={(e) => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'var(--border-glass)'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>
                        </div>

                        {/* API Key */}
                        <div className="mb-6">
                            <label htmlFor="apiKey" className="block text-sm font-medium mb-1.5"
                                style={{ color: 'var(--text-secondary)' }}>
                                API Key
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
                                    </svg>
                                </span>
                                <input
                                    id="apiKey"
                                    type="text"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Enter your API Key"
                                    className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none"
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--border-glass)',
                                        color: 'var(--text-primary)',
                                    }}
                                    onFocus={(e) => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = 'var(--border-glass)'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: loading ? 'rgba(0,0,0,0.1)' : 'var(--gradient-btn)',
                                boxShadow: loading ? 'none' : '0 4px 15px rgba(59, 130, 246, 0.25)',
                            }}
                            onMouseEnter={(e) => { if (!loading) { e.target.style.background = 'var(--gradient-btn-hover)'; e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)'; } }}
                            onMouseLeave={(e) => { if (!loading) { e.target.style.background = 'var(--gradient-btn)'; e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.3)'; } }}
                        >
                            {loading ? (
                                <span className="inline-flex items-center gap-2">
                                    <svg className="w-4 h-4" style={{ animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                    Connecting...
                                </span>
                            ) : 'Connect'}
                        </button>
                    </form>

                    {/* Error */}
                    {error && (
                        <div className="mt-4 text-sm rounded-xl px-4 py-3 flex items-start gap-2"
                            style={{
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#dc2626',
                            }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5" style={{ color: '#f87171' }}>
                                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                            {error}
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
