import { useEffect } from 'react'
import Navbar    from './components/Navbar'
import Hero      from './components/Hero'
import Solutions from './components/Solutions'
import Features  from './components/Features'
import Pricing   from './components/Pricing'
import Footer    from './components/Footer'

/* ── Scroll-reveal: adds .visible when element enters viewport ── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.12 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

/* ── Stats counter animation ── */
function useCounter(ref, target, duration = 1800) {
  useEffect(() => {
    let start = null
    const step = ts => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      if (ref.current) ref.current.textContent = Math.floor(ease * target).toLocaleString()
      if (progress < 1) requestAnimationFrame(step)
    }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { requestAnimationFrame(step); obs.disconnect() }
    }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
}

import { useRef } from 'react'

function Stats() {
  const r1 = useRef(), r2 = useRef(), r3 = useRef(), r4 = useRef()
  useCounter(r1, 100)
  useCounter(r2, 50000)
  useCounter(r3, 1200000)
  useCounter(r4, 4)

  const items = [
    { ref: r1, suffix: '+',  label: 'Businesses',          icon: '🏪' },
    { ref: r2, suffix: '+',  label: 'Products Managed',    icon: '📦' },
    { ref: r3, suffix: '+',  label: 'Revenue Processed $', icon: '💰' },
    { ref: r4, suffix: '',   label: 'Countries',           icon: '🌍' },
  ]

  return (
    <section className="py-12 sm:py-16 border-y border-white/6">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/6 rounded-2xl overflow-hidden">
          {items.map((s, i) => (
            <div key={i} className="bg-dark flex flex-col items-center justify-center py-8 sm:py-10 text-center hover:bg-white/3 transition-colors">
              <span className="text-2xl sm:text-3xl mb-2 sm:mb-3">{s.icon}</span>
              <div className="flex items-baseline gap-0.5">
                <span ref={s.ref} className="text-3xl sm:text-4xl font-black text-white">0</span>
                <span className="text-xl sm:text-2xl font-black text-brand">{s.suffix}</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    {
      n: '01',
      icon: '📝',
      title: 'Create Your Account',
      desc: 'Sign up in under 2 minutes. No credit card required. Choose your plan and get instant access.',
    },
    {
      n: '02',
      icon: '⚙️',
      title: 'Set Up Your Store',
      desc: 'Add your products, configure your currency, invite your team, and customize your POS or Café layout.',
    },
    {
      n: '03',
      icon: '🚀',
      title: 'Go Live & Grow',
      desc: 'Start taking orders, tracking inventory, and making data-driven decisions from day one.',
    },
  ]

  return (
    <section className="py-16 sm:py-20 lg:py-28 relative">
      <div className="orb absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand/8 pointer-events-none" />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 relative">
        <div className="text-center mb-16 reveal">
          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full mb-5">
            <span className="text-xs font-semibold text-brand uppercase tracking-widest">How It Works</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4">
            Up and Running in Minutes
          </h2>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            No technical knowledge needed. If you can use a smartphone, you can run Nexora.
          </p>
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-14 left-[calc(16.666%+1rem)] right-[calc(16.666%+1rem)] h-px bg-gradient-to-r from-brand/20 via-brand/40 to-brand/20" />

          <div className="grid lg:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.n} className="reveal flex flex-col items-center text-center" style={{ transitionDelay: `${i * 0.15}s` }}>
                <div className="relative mb-6">
                  <div className="w-28 h-28 rounded-3xl glass border border-white/10 flex flex-col items-center justify-center group hover:border-brand/30 transition-all card-hover">
                    <span className="text-4xl mb-1">{s.icon}</span>
                    <span className="text-[10px] font-black text-brand tracking-widest">{s.n}</span>
                  </div>
                </div>
                <h3 className="text-lg font-black text-white mb-3">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-[1440px] mx-auto reveal">
        <div className="gradient-border rounded-3xl p-px">
          <div className="bg-dark-card rounded-3xl p-6 sm:p-12 text-center relative overflow-hidden">
            <div className="orb absolute top-0 right-0 w-64 h-64 bg-brand/15" />
            <div className="orb absolute bottom-0 left-0 w-64 h-64 bg-purple-600/15" />
            <div className="relative">
              <p className="text-sm font-bold text-brand uppercase tracking-widest mb-4">Get Started Today</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-5 leading-tight">
                Your Business Deserves<br/>
                <span className="gradient-text">Better Tools</span>
              </h2>
              <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
                Join 100+ businesses already running on Nexora. Start your free 14-day trial —
                no credit card, no commitment.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-4">
                <a href="https://bcs.nexora-bcs.com/register" target="_blank" rel="noreferrer"
                  className="btn-primary w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2">
                  Start Free Trial
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </a>
                <a href="#contact"
                  className="btn-ghost w-full sm:w-auto px-8 py-3.5 sm:py-4 rounded-2xl text-white font-semibold text-base text-center">
                  Talk to Sales
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function App() {
  useReveal()

  return (
    <div className="min-h-screen bg-dark text-white">
      <Navbar />
      <Hero />
      <Stats />
      <Solutions />
      <Features />
      <HowItWorks />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  )
}
