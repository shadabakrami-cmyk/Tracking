import { useState } from 'react'

export default function CargoAuthScreen({ onConnect }) {
    const [apiKey, setApiKey] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        setError('')

        if (!apiKey.trim()) {
            setError('RapidAPI key is required.')
            return
        }

        onConnect(apiKey.trim())
    }

    return (
        <div className="flex-1 flex items-center justify-center px-4 relative overflow-hidden">
            {/* Animated background orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute rounded-full opacity-10 blur-3xl"
                    style={{
                        width: '500px', height: '500px',
                        background: 'radial-gradient(circle, #06b6d4, transparent 70%)',
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
                        background: 'radial-gradient(circle, #f59e0b, transparent 70%)',
                        top: '40%', right: '20%',
                        animation: 'float 12s ease-in-out infinite 4s',
                    }}
                />
            </div>

            <div className="w-full max-w-md relative" style={{ animation: 'slideUp 0.6s ease-out' }}>
                {/* Brand */}
                <div className="text-center mb-8">
                    {/* Airplane icon */}
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
                        style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-glow-cyan)' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight"
                        style={{ fontFamily: "'Outfit', sans-serif", background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Cargo AI Tracker
                    </h1>
                    <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                        Enter your RapidAPI key to begin tracking
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
                        {/* API Key */}
                        <div className="mb-6">
                            <label htmlFor="cargoApiKey" className="block text-sm font-medium mb-1.5"
                                style={{ color: 'var(--text-secondary)' }}>
                                RapidAPI Key
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
                                    </svg>
                                </span>
                                <input
                                    id="cargoApiKey"
                                    type="text"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Enter your RapidAPI Key"
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

                        {/* Submit */}
                        <button
                            type="submit"
                            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 cursor-pointer"
                            style={{
                                background: 'var(--gradient-btn)',
                                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.25)',
                            }}
                            onMouseEnter={(e) => { e.target.style.background = 'var(--gradient-btn-hover)'; e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)'; }}
                            onMouseLeave={(e) => { e.target.style.background = 'var(--gradient-btn)'; e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.3)'; }}
                        >
                            Connect
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
