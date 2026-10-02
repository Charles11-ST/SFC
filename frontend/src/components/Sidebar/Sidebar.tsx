import Link from 'next/link'

const navigation = [
  { href: '/', label: 'Home', icon: '⌂' },
  { href: '/feed', label: 'Feed', icon: '▤' },
  { href: '/communities', label: 'Communities', icon: '◎' },
  { href: '/experts', label: 'Experts', icon: '◇' },
  { href: '/messages', label: 'Messages', icon: '✉' },
]

export function Sidebar({ activePath = '/' }: { activePath?: string }) {
  return (
    <aside className="side">
      <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true">✳</span><span>smart farmer<small>connect</small></span></Link>
      <div className="side-label">YOUR SPACE</div>
      <nav className="nav" aria-label="Main navigation">
        {navigation.map((item) => <Link key={item.href} aria-current={activePath === item.href ? 'page' : undefined} href={item.href}><span aria-hidden="true">{item.icon}</span><span>{item.label}</span></Link>)}
      </nav>
      <div className="side-foot"><strong>Zimbabwean farmers</strong><span>Local knowledge, shared.</span></div>
    </aside>
  )
}
