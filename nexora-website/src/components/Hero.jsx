import { useEffect, useState } from 'react'

const WORDS = ['Supermarket', 'Café', 'Restaurant', 'Pharmacy', 'Boutique']

export default function Hero() {
  const [wordIdx, setWordIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Typewriter effect
  useEffect(() => {
    const word = WORDS[wordIdx]
    let timeout
    if (!deleting && displayed.length < word.length) {
      timeout = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 80)
    } else if (!deleting && displayed.length === word.length) {
      timeout = setTimeout(() => setDeleting(true), 1800)
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 45)
    } else if (deleting && displayed.length === 0) {
      setDeleting(false)
      setWordIdx(i => (i + 1) % WORDS.length)
    }
    return () => clearTimeout(timeout)
  }, [displayed, deleting, wordIdx])

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">

      {/* Background orbs */}
      <div className="orb absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-purple-600/20 animate-pulse-glow" />
      <div className="orb absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-brand/15 animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
      <div className="orb absolute top-[40%] left-[35%] w-[300px] h-[300px] bg-sky-600/10 animate-pulse-glow" style={{ animationDelay: '3s' }} />

      {/* Dot grid */}
      <div className="dot-grid absolute inset-0 opacity-60" />

      <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 py-16 sm:py-20 lg:py-24 w-full">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Left — Text */}
          <div className="animate-slide-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-8">
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              <span className="text-xs font-medium text-gray-300">Next Generation Business Systems</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.08] sm:leading-[1.05] tracking-tight mb-5 sm:mb-6">
              <span className="text-white">Manage Your</span>
              <br />
              <span className="gradient-text">{displayed}<span className="cursor">|</span></span>
              <br />
              <span className="text-white">Like Never Before</span>
            </h1>

            <p className="text-base sm:text-lg text-gray-400 leading-relaxed mb-8 sm:mb-10 max-w-lg">
              Nexora BCS delivers enterprise-grade POS, Café Management, and Online Store
              solutions — built for the next generation of business owners who demand more.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-10 sm:mb-12">
              <a href="https://bcs.nexora-bcs.com/register" target="_blank" rel="noreferrer"
                className="btn-primary px-6 sm:px-8 py-3.5 rounded-2xl text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2">
                Start Free — No Card Needed
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
              <a href="#solutions"
                className="btn-ghost px-6 sm:px-8 py-3.5 rounded-2xl text-white font-medium text-sm sm:text-base flex items-center justify-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4V8z" fill="white"/></svg>
                See Products
              </a>
            </div>

            {/* Trust metrics */}
            <div className="flex flex-wrap gap-4 sm:gap-6">
              {[
                { n: '100+', l: 'Businesses' },
                { n: '50K+', l: 'Products Managed' },
                { n: '99.9%', l: 'Uptime' },
              ].map(m => (
                <div key={m.l} className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-white">{m.n}</span>
                  <span className="text-xs sm:text-sm text-gray-500">{m.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Dashboard mockup */}
          <div className="relative hidden lg:flex justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>

            {/* Floating badge top-right */}
            <div className="absolute -top-4 -right-4 z-10 glass-strong px-4 py-2.5 rounded-2xl animate-float" style={{ animationDelay: '1s' }}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" />
                <span className="text-xs font-semibold text-white">Live Sales</span>
              </div>
              <p className="text-xl font-black text-brand mt-0.5">$1,847</p>
              <p className="text-xs text-gray-400">↑ 31% today</p>
            </div>

            {/* Floating badge bottom-left */}
            <div className="absolute -bottom-4 -left-4 z-10 glass-strong px-4 py-2.5 rounded-2xl animate-float-slow">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">☕</span>
                <span className="text-xs font-semibold text-white">Café Tables</span>
              </div>
              <div className="flex gap-1">
                {['#00d47e','#00d47e','#f59e0b','#00d47e','#ef4444','#00d47e'].map((c, i) => (
                  <div key={i} className="w-6 h-6 rounded-md text-[9px] font-bold flex items-center justify-center text-white"
                    style={{ backgroundColor: c + '33', border: `1px solid ${c}66`, color: c }}>
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>

            {/* Main dashboard card */}
            <div className="glass-strong rounded-3xl p-5 w-full max-w-md glow-green animate-float" style={{ animationDelay: '0.5s' }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand to-emerald-300 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Nexora POS</p>
                    <p className="text-[10px] text-gray-500">Al Amin Market</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-brand/10 border border-brand/20 px-2.5 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                  <span className="text-[10px] font-semibold text-brand">LIVE</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Today Sales', value: '$1,847', color: 'text-brand', sub: '↑ 31%' },
                  { label: 'Orders', value: '94', color: 'text-white', sub: 'transactions' },
                  { label: 'Stock Alerts', value: '3', color: 'text-amber-400', sub: 'low items' },
                ].map(s => (
                  <div key={s.label} className="bg-white/5 rounded-2xl p-3">
                    <p className="text-[10px] text-gray-500 mb-1">{s.label}</p>
                    <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-gray-500">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Recent items */}
              <div className="space-y-2 mb-4">
                {[
                  { name: 'Pepsi 500ml', qty: 'x3', price: '$2.25', img: '🥤' },
                  { name: 'Lay\'s Chips', qty: 'x1', price: '$1.50', img: '🍟' },
                  { name: 'Nescafé 3in1', qty: 'x2', price: '$3.00', img: '☕' },
                ].map(item => (
                  <div key={item.name} className="flex items-center gap-3 bg-white/3 rounded-xl px-3 py-2">
                    <span className="text-base">{item.img}</span>
                    <span className="flex-1 text-xs font-medium text-gray-200">{item.name}</span>
                    <span className="text-[10px] text-gray-500">{item.qty}</span>
                    <span className="text-xs font-bold text-brand">{item.price}</span>
                  </div>
                ))}
              </div>

              {/* Barcode row */}
              <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d47e" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="7" y1="9" x2="7" y2="15"/><line x1="10" y1="9" x2="10" y2="15"/><line x1="13" y1="9" x2="13" y2="15"/><line x1="16" y1="9" x2="16" y2="15"/></svg>
                <span className="text-xs text-gray-400 flex-1">Scan barcode…</span>
                <span className="text-[10px] bg-brand/20 text-brand px-2 py-0.5 rounded-full font-semibold">Ready</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-dark to-transparent pointer-events-none" />
    </section>
  )
}
