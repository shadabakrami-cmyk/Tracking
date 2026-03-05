export default function LandingScreen({ onSelect }) {
    const cards = [
        {
            key: 'ocean',
            title: 'Oceanio Tracker',
            subtitle: 'Track ocean shipments via BL, booking, or container number',
            icon: (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#oceanGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <defs>
                        <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                    </defs>
                    <path d="M2 20l.9-4A3 3 0 0 1 5.8 14H18.2a3 3 0 0 1 2.9 2l.9 4" />
                    <path d="M4 14V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8" />
                    <path d="M12 4v4" />
                </svg>
            ),
            gradient: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(6,182,212,0.08))',
            borderHover: 'rgba(59,130,246,0.3)',
            glow: '0 8px 32px rgba(59, 130, 246, 0.15)',
        },
        {
            key: 'cargo',
            title: 'Cargo AI Tracker',
            subtitle: 'Track air cargo shipments by AWB number',
            icon: (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#cargoGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <defs>
                        <linearGradient id="cargoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                    </defs>
                    <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                </svg>
            ),
            gradient: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.08))',
            borderHover: 'rgba(139,92,246,0.3)',
            glow: '0 8px 32px rgba(139, 92, 246, 0.15)',
        },
    ]

    return (
        <div className="flex-1 flex items-center justify-center px-4 relative overflow-hidden">
            {/* Animated background orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute rounded-full opacity-10 blur-3xl"
                    style={{
                        width: '600px', height: '600px',
                        background: 'radial-gradient(circle, #3b82f6, transparent 70%)',
                        top: '-15%', left: '-10%',
                        animation: 'float 8s ease-in-out infinite',
                    }}
                />
                <div
                    className="absolute rounded-full opacity-8 blur-3xl"
                    style={{
                        width: '500px', height: '500px',
                        background: 'radial-gradient(circle, #8b5cf6, transparent 70%)',
                        bottom: '-10%', right: '-5%',
                        animation: 'float 10s ease-in-out infinite 2s',
                    }}
                />
                <div
                    className="absolute rounded-full opacity-5 blur-3xl"
                    style={{
                        width: '400px', height: '400px',
                        background: 'radial-gradient(circle, #06b6d4, transparent 70%)',
                        top: '50%', left: '50%',
                        animation: 'float 12s ease-in-out infinite 4s',
                    }}
                />
            </div>

            <div className="relative" style={{ animation: 'slideUp 0.6s ease-out' }}>
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
                        style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-glow-blue)' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M2 12h20" />
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight mb-3"
                        style={{
                            fontFamily: "'Outfit', sans-serif",
                            background: 'var(--gradient-brand)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>
                        Multi Tracker
                    </h1>
                    <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                        Choose a tracking service to get started
                    </p>
                </div>

                {/* Cards */}
                <div className="flex gap-6">
                    {cards.map((card, i) => (
                        <button
                            key={card.key}
                            onClick={() => onSelect(card.key)}
                            className="group relative rounded-2xl p-8 backdrop-blur-xl transition-all duration-300 cursor-pointer"
                            style={{
                                width: '260px',
                                background: 'rgba(255, 255, 255, 0.75)',
                                border: '1px solid var(--border-glass)',
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                                animation: `slideUp 0.5s ease-out ${0.15 + i * 0.1}s both`,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.border = `1px solid ${card.borderHover}`
                                e.currentTarget.style.boxShadow = card.glow
                                e.currentTarget.style.transform = 'translateY(-4px)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.border = '1px solid var(--border-glass)'
                                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.04)'
                                e.currentTarget.style.transform = 'translateY(0)'
                            }}
                        >
                            {/* Icon */}
                            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-transform duration-300"
                                style={{ background: card.gradient }}>
                                {card.icon}
                            </div>

                            {/* Title */}
                            <h2 className="text-lg font-bold mb-2 text-center"
                                style={{ color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }}>
                                {card.title}
                            </h2>

                            {/* Subtitle */}
                            <p className="text-sm text-center leading-relaxed"
                                style={{ color: 'var(--text-secondary)' }}>
                                {card.subtitle}
                            </p>

                            {/* Arrow hint */}
                            <div className="mt-5 flex items-center justify-center gap-1.5 text-xs font-medium"
                                style={{ color: 'var(--text-muted)' }}>
                                <span>Get Started</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
