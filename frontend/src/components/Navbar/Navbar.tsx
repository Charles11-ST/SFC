import Link from 'next/link'

export function Navbar({ connected }: { connected: boolean }) {
  return (
    <header className="topbar">
      <div className="search" aria-label="Search is planned for a later phase">⌕ <span>Search farmers and information</span></div>
      <span className="top-state"><span className={connected ? 'dot connected' : 'dot'} />{connected ? 'API connected' : 'Setup required'}</span>
      <Link className="mobile-home" href="/">Smart Farmer Connect</Link>
    </header>
  )
}
