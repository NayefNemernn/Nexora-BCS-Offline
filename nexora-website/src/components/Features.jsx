const feats = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
      </svg>
    ),
    color: 'text-brand bg-brand/10',
    title: 'AI-Powered Insights',
    desc: 'Smart analytics that predict low stock, flag expiring items, and surface sales trends — automatically.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/>
      </svg>
    ),
    color: 'text-amber-400 bg-amber-400/10',
    title: 'Works Offline',
    desc: 'Keep selling even without internet. Nexora syncs automatically when the connection is restored.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
      </svg>
    ),
    color: 'text-sky-400 bg-sky-400/10',
    title: 'Multi-Device, Any Screen',
    desc: 'Run on tablets, desktops, or phones. The system adapts perfectly to any screen size.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    color: 'text-purple-400 bg-purple-400/10',
    title: 'Bank-Level Security',
    desc: 'JWT authentication, device management, session control, and full audit logs for every action.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
      </svg>
    ),
    color: 'text-pink-400 bg-pink-400/10',
    title: 'Arabic & English',
    desc: 'Full bilingual support — switch seamlessly between Arabic and English with proper RTL layout.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
    color: 'text-emerald-400 bg-emerald-400/10',
    title: 'USD & LBP Support',
    desc: 'Built for Lebanon — handle both USD and LBP with live exchange rates and instant conversion.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    color: 'text-orange-400 bg-orange-400/10',
    title: 'Multi-User & Roles',
    desc: 'Admin, cashier, and café staff roles — each with tailored access and individual shift tracking.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    color: 'text-cyan-400 bg-cyan-400/10',
    title: 'Real-Time Everything',
    desc: 'Live dashboards, instant notifications, and real-time sync across all devices and modules.',
  },
]

export default function Features() {
  return (
    <section id="features" className="py-16 sm:py-20 lg:py-28 relative">
      <div className="orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-600/8 pointer-events-none" />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 relative">

        <div className="text-center mb-16 reveal">
          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full mb-5">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Why Nexora</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4">
            Built for the <span className="gradient-text">Next Generation</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Every feature was designed with real business owners in mind —
            powerful enough for large operations, simple enough for day-one use.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {feats.map((f, i) => (
            <div
              key={f.title}
              className="reveal glass rounded-2xl p-5 border border-white/8 card-hover group"
              style={{ transitionDelay: `${i * 0.05}s` }}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${f.color} mb-4 group-hover:scale-110 transition-transform`}>
                {f.icon}
              </div>
              <h3 className="font-bold text-white text-sm mb-2">{f.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
