import { Navbar } from '../components/Navbar/Navbar'
import { Sidebar } from '../components/Sidebar/Sidebar'
import { getApiHealth } from '../lib/api'

export default async function Home() {
  const apiHealth = await getApiHealth()
  const api = {
    ok: Boolean(apiHealth),
    message: process.env.BACKEND_API_URL
      ? 'The Smart Farmer Connect API is unavailable. Start the backend service to connect live application data.'
      : 'The Express API is not configured yet. Set BACKEND_API_URL in the frontend server environment.',
  }
  return (
    <div className="workspace">
      <Sidebar activePath="/" />
      <main className="main">
        <Navbar connected={api.ok} />
        <div className="content">
          <p className="eyebrow">SMART FARMER CONNECT · ZIMBABWE</p>
          <h1>Your farming community, connected.</h1>
          <p className="location">Phase 1 foundation · frontend and backend are separate services</p>
          <section className="alert-band"><span className="alert-icon">!</span><div><b>Real information only</b><p>Live weather, verified agricultural information, and farmer activity appear only when returned by connected services.</p></div></section>
          {!api.ok && <section className="setup"><p className="eyebrow">BACKEND CONNECTION</p><h2>Connect the Express API</h2><p>{api.message}</p><code>BACKEND_API_URL=http://localhost:4100</code><p>Start the backend with <code>npm run dev --workspace backend</code>. No sample weather, posts, or alerts are shown.</p></section>}
          <div className="grid">
            <section className="panel"><p className="kicker">LOCAL WEATHER</p><h2>Weather for your area</h2><p className="empty">Weather will appear here when the backend is connected and a farmer location is configured.</p><div className="source">Provider attribution is returned with each real weather response.</div></section>
            <section className="panel"><p className="kicker">RELEVANT TO YOUR FARM</p><h2>Location and interests</h2><p className="empty">Onboarding and profile-based personalization follow after this Phase 1 foundation is configured.</p><div className="source">No location or farm interests are hardcoded.</div></section>
          </div>
          <div className="section-head"><div><p className="kicker">COMMUNITY</p><h2>Farmers and discussions</h2></div><span className="real-tag">REAL ACTIVITY ONLY</span></div>
          <section className="community"><span className="community-mark">◎</span><div><h3>No community activity is loaded in Phase 1</h3><p>The backend database foundation will supply real posts and member activity in the social phase. No placeholder activity or counts are used.</p></div></section>
        </div>
      </main>
    </div>
  )
}