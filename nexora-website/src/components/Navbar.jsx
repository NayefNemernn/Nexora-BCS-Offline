import { useState, useEffect } from 'react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { label: 'Solutions', href: '#solutions' },
    { label: 'Features',  href: '#features' },
    { label: 'Pricing',   href: '#pricing' },
    { label: 'Contact',   href: '#contact' },
  ]

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'glass border-b border-white/5 shadow-lg shadow-black/20' : ''
    }`}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand to-emerald-400 flex items-center justify-center shadow-lg shadow-brand/30 group-hover:shadow-brand/50 transition-shadow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-bold text-white text-sm tracking-wide">NEXORA</span>
            <span className="text-[10px] text-brand font-semibold tracking-widest">BCS</span>
          </div>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <a
              key={l.label}
              href={l.href}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a href="https://bcs.nexora-bcs.com" target="_blank" rel="noreferrer"
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors">
            Sign In
          </a>
          <a href="https://bcs.nexora-bcs.com/register" target="_blank" rel="noreferrer"
            className="btn-primary px-5 py-2 rounded-xl text-sm font-semibold text-white">
            Get Started Free
          </a>
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-white/5 transition"
          onClick={() => setMenuOpen(v => !v)}
        >
          <div className={`w-5 h-0.5 bg-white mb-1 transition-all ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
          <div className={`w-5 h-0.5 bg-white mb-1 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
          <div className={`w-5 h-0.5 bg-white transition-all ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden glass border-t border-white/5 px-4 sm:px-6 py-4 flex flex-col gap-2">
          {links.map(l => (
            <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
              className="py-2.5 text-sm text-gray-300 hover:text-white border-b border-white/5">
              {l.label}
            </a>
          ))}
          <a href="https://bcs.nexora-bcs.com/register" target="_blank" rel="noreferrer"
            className="btn-primary mt-2 py-3 rounded-xl text-sm font-semibold text-white text-center">
            Get Started Free
          </a>
        </div>
      )}
    </nav>
  )
}
