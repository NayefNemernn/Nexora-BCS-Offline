export default function Solutions() {
  const solutions = [
    {
      icon: '🏪',
      tag: 'Retail & Market',
      title: 'Smart POS System',
      desc: 'A full-featured point-of-sale built for supermarkets, pharmacies, and retail stores. Handle every sale with speed and confidence.',
      color: 'from-brand/20 to-emerald-500/5',
      border: 'hover:border-brand/40',
      glow: 'hover:shadow-brand/10',
      features: [
        'Barcode scanning & auto-fill',
        'Multi-currency (USD & LBP)',
        'AI product fill & insights',
        'Offline mode — works without internet',
        'Expiry date tracking & alerts',
        'Shift management & cashier roles',
        'Receipt printing & WhatsApp share',
        'Customer credit & Pay Later',
      ],
    },
    {
      icon: '☕',
      tag: 'Hospitality',
      title: 'Café Management Suite',
      desc: 'An all-in-one system for cafés and restaurants — from the front door to the kitchen, every order handled seamlessly.',
      color: 'from-amber-500/20 to-amber-600/5',
      border: 'hover:border-amber-500/40',
      glow: 'hover:shadow-amber-500/10',
      features: [
        'Interactive floor map & table orders',
        'Kitchen Display System (KDS)',
        'Table reservations & walk-ins',
        'Split bill & flexible payments',
        'Loyalty points & rewards',
        '5 customer mini-games',
        'QR self-ordering for guests',
        'Daily / weekly / monthly reports',
      ],
    },
    {
      icon: '🛒',
      tag: 'Digital Commerce',
      title: 'Online Store',
      desc: 'Give your business a digital storefront with full ordering, delivery tracking, and real-time sync with your POS inventory.',
      color: 'from-indigo-500/20 to-purple-600/5',
      border: 'hover:border-indigo-500/40',
      glow: 'hover:shadow-indigo-500/10',
      features: [
        'Public storefront with QR sharing',
        'Real-time product sync with POS',
        'Customer order flow & tracking',
        'Promo codes & discounts',
        'WhatsApp order notifications',
        'Cash / card payment on delivery',
        'Order history & re-order',
        'Branded storefront per market',
      ],
    },
  ]

  return (
    <section id="solutions" className="py-16 sm:py-20 lg:py-28 relative overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6">

        <div className="text-center mb-16 reveal">
          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full mb-5">
            <span className="text-xs font-semibold text-brand uppercase tracking-widest">Our Solutions</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4">
            Everything Your Business Needs
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Three powerful products, one unified platform. Built from the ground up
            for businesses in Lebanon and beyond.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {solutions.map((s, i) => (
            <div
              key={s.title}
              className={`reveal glass rounded-3xl p-7 border border-white/8 card-hover ${s.border} transition-shadow hover:shadow-2xl ${s.glow}`}
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              {/* Top */}
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-2xl mb-5 border border-white/10`}>
                {s.icon}
              </div>
              <div className="inline-block text-[10px] font-bold uppercase tracking-widest text-gray-500 border border-white/10 rounded-full px-2.5 py-1 mb-3">
                {s.tag}
              </div>
              <h3 className="text-xl font-black text-white mb-3">{s.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-5">{s.desc}</p>

              {/* Features list */}
              <ul className="space-y-2.5">
                {s.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-brand shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-sm text-gray-400">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-7">
                <a href="https://bcs.nexora-bcs.com/register" target="_blank" rel="noreferrer"
                  className="btn-ghost w-full py-2.5 rounded-xl text-sm font-semibold text-white text-center block">
                  Get Started →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
