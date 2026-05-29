import { useState } from 'react'
import TrialModal from './TrialModal'

const plans = [
  {
    name: 'Free Trial',
    price: 'Free',
    period: '3 days',
    desc: 'Full demo access. No credit card required.',
    color: 'text-gray-300',
    border: 'border-white/10',
    btn: 'btn-ghost',
    features: ['2 users', '100 products', 'Basic POS', 'WhatsApp support'],
    popular: false,
    isTrial: true,
  },
  {
    name: 'Basic',
    price: '$150',
    period: 'per month',
    desc: 'For small to medium businesses. No online store.',
    color: 'text-sky-400',
    border: 'border-sky-500/20',
    btn: 'btn-ghost',
    features: ['10 users', '1,000 products', 'Full POS', 'Barcode & receipts', 'Reports & analytics', 'Café suite', 'Chat support'],
    popular: false,
  },
  {
    name: 'Pro',
    price: '$250',
    period: 'per month',
    desc: 'For growing businesses — full system with Online Store.',
    color: 'text-brand',
    border: 'border-brand/30',
    btn: 'btn-primary',
    features: [
      'Unlimited users', '5,000 products', 'Full POS + Café Suite',
      'Online Store & Delivery', 'AI insights', 'Multi-currency',
      'Offline mode', 'Priority support',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'tailored for you',
    desc: 'Chains, franchises, and large operations.',
    color: 'text-purple-400',
    border: 'border-purple-500/20',
    btn: 'btn-ghost',
    features: [
      'Unlimited users & products',
      'Multi-branch management',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee', 'On-site setup',
    ],
    popular: false,
  },
]

export default function Pricing() {
  const [showTrial, setShowTrial] = useState(false)

  return (
    <section id="pricing" className="py-16 sm:py-20 lg:py-28 relative overflow-hidden">
      <div className="orb absolute bottom-0 right-0 w-[500px] h-[500px] bg-brand/10 pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 relative">
        <div className="text-center mb-16 reveal">
          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full mb-5">
            <span className="text-xs font-semibold text-brand uppercase tracking-widest">Pricing</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Start free. Scale when you grow. Cancel anytime.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {plans.map((p, i) => (
            <div
              key={p.name}
              className={`reveal relative glass rounded-3xl p-6 border card-hover ${p.border} ${p.popular ? 'popular-ring' : ''}`}
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              {p.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-5">
                <p className={`text-xs font-bold uppercase tracking-widest ${p.color} mb-2`}>{p.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{p.price}</span>
                  {p.price !== 'Free' && p.price !== 'Custom' && (
                    <span className="text-gray-500 text-sm">/ mo</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{p.period}</p>
                <p className="text-sm text-gray-400 mt-2">{p.desc}</p>
              </div>

              <ul className="space-y-2.5 mb-6">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2">
                    <svg className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${p.popular ? 'text-brand' : 'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-xs text-gray-400">{f}</span>
                  </li>
                ))}
              </ul>

              {p.isTrial ? (
                <button
                  onClick={() => setShowTrial(true)}
                  className={`${p.btn} block w-full py-2.5 rounded-xl text-sm font-bold text-white text-center cursor-pointer`}
                >
                  Start Free Trial
                </button>
              ) : (
                <a
                  href={p.name === 'Enterprise' ? '#contact' : 'https://bcs.nexora-bcs.com/register'}
                  target={p.name !== 'Enterprise' ? '_blank' : undefined}
                  rel="noreferrer"
                  className={`${p.btn} block w-full py-2.5 rounded-xl text-sm font-bold text-white text-center`}
                >
                  {p.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                </a>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-600 mt-8">
          All prices in USD. Lebanese businesses may pay in LBP at the current rate.
          No hidden fees. Cancel anytime.
        </p>
      </div>

      {showTrial && <TrialModal onClose={() => setShowTrial(false)} />}
    </section>
  )
}
