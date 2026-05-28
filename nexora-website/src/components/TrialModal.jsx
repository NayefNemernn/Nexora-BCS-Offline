import { useState } from 'react'

export default function TrialModal({ onClose }) {
  const [form, setForm] = useState({ name: '', business: '', email: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'https://api.nexora-bcs.com/api'
      await fetch(`${apiBase}/demo-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          business: form.business,
          email: form.email,
          phone: form.phone,
        }),
      })

      setDone(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="glass-strong rounded-3xl w-full max-w-md p-8 relative border border-white/10 shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition"
        >
          ✕
        </button>

        {done ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-3">Request Sent!</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-2">
              Our team has been notified. You'll receive your <span className="text-brand font-semibold">3-day demo account</span> details on WhatsApp within a few minutes.
            </p>
            <p className="text-gray-500 text-xs mt-4">
              After the trial, we'll follow up to hear your feedback and help you get started with a full plan.
            </p>
            <button onClick={onClose} className="btn-primary mt-6 w-full py-3 rounded-xl text-white font-bold">
              Got it
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 glass px-3 py-1 rounded-full mb-4">
                <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                <span className="text-xs font-semibold text-brand uppercase tracking-widest">3-Day Free Trial</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-1">Start Your Demo</h3>
              <p className="text-sm text-gray-400">No credit card. Full access for 3 days.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Full Name</label>
                <input
                  required
                  value={form.name}
                  onChange={set('name')}
                  placeholder="Ahmad Khalil"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand/50 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Business Name</label>
                <input
                  required
                  value={form.business}
                  onChange={set('business')}
                  placeholder="My Supermarket"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand/50 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email Address</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="ahmad@business.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand/50 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">WhatsApp Number</label>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="+961 70 000 000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand/50 transition"
                />
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60 mt-2"
              >
                {loading ? 'Sending...' : 'Request Free Trial →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
