export default function Footer() {
  return (
    <footer id="contact" className="border-t border-white/8 pt-12 sm:pt-20 pb-10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6">

        <div className="grid md:grid-cols-4 gap-10 mb-16">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-emerald-400 flex items-center justify-center shadow-lg shadow-brand/30">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <div>
                <p className="font-black text-white text-sm">NEXORA BCS</p>
                <p className="text-[10px] text-brand font-semibold tracking-widest">Business Control Systems</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed mb-5">
              Next-generation business management systems for retail, hospitality, and e-commerce.
            </p>
            <div className="flex gap-3">
              {/* WhatsApp */}
              <a href="https://wa.me/96181234567" target="_blank" rel="noreferrer"
                className="glass w-9 h-9 rounded-xl flex items-center justify-center hover:border-brand/40 transition text-gray-400 hover:text-brand">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
              {/* Email */}
              <a href="mailto:info@nexora-bcs.com"
                className="glass w-9 h-9 rounded-xl flex items-center justify-center hover:border-brand/40 transition text-gray-400 hover:text-brand">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </a>
            </div>
          </div>

          {/* Products */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Products</p>
            <ul className="space-y-3">
              {['Smart POS System', 'Café Management Suite', 'Online Store', 'Super Admin Panel', 'Customer Loyalty'].map(l => (
                <li key={l}>
                  <a href="#solutions" className="text-sm text-gray-400 hover:text-white transition">{l}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Platform</p>
            <ul className="space-y-3">
              {[
                { l: 'Features', h: '#features' },
                { l: 'Pricing', h: '#pricing' },
                { l: 'Sign In', h: 'https://bcs.nexora-bcs.com' },
                { l: 'Register', h: 'https://bcs.nexora-bcs.com/register' },
              ].map(i => (
                <li key={i.l}>
                  <a href={i.h} className="text-sm text-gray-400 hover:text-white transition">{i.l}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Contact</p>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00d47e" strokeWidth="2" className="shrink-0 mt-0.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Lebanon
              </li>
              <li className="flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00d47e" strokeWidth="2" className="shrink-0 mt-0.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                info@nexora-bcs.com
              </li>
              <li className="flex items-start gap-2 mt-4">
                <a href="https://bcs.nexora-bcs.com/register" target="_blank" rel="noreferrer"
                  className="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold text-white inline-block">
                  Get Started Free →
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} Nexora BCS. All rights reserved.
          </p>
          <p className="text-xs text-gray-700">
            Built with ❤️ for the next generation of business owners
          </p>
        </div>
      </div>
    </footer>
  )
}
