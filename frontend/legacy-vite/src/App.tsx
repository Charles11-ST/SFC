import { startTransition, useEffect, useState } from 'react'
import {
  Bell,
  Check,
  ChevronDown,
  CloudSun,
  Compass,
  Droplets,
  Globe2,
  Heart,
  HeartPulse,
  ImagePlus,
  Leaf,
  LogOut,
  MapPin,
  MessageCircle,
  Search,
  Send,
  Share2,
  Settings2,
  ShieldCheck,
  Sprout,
  Users,
  Wind,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { getSupabase } from './lib/supabase'
import { districtsByProvince, interests } from './data/zimbabwe'
import { getWeather, type WeatherReport } from './services/weatherService'
import {
  addPostComment,
  createCommunityPost,
  loadPostComments,
  loadRelevantPosts,
  togglePostLike,
  type CommunityComment,
  type CommunityPost,
} from './services/communityService'
import './App.css'

type FarmerProfile = {
  location_id: string
  display_name: string
  farm_name: string | null
  province: string
  district: string
  town_area: string
  farm_size_hectares: number | null
  experience_years: number | null
  latitude: number | null
  longitude: number | null
}

type FarmerData = {
  userId: string
  profile: FarmerProfile | null
  interests: string[]
}

const sections = [
  { id: 'home', label: 'Home', icon: Sprout },
  { id: 'farmers', label: 'Farmers', icon: Users },
  { id: 'communities', label: 'Communities', icon: Compass },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
]

function App() {
  const supabase = getSupabase()
  const [session, setSession] = useState<Session | null>(null)
  const [farmerData, setFarmerData] = useState<FarmerData | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [screen, setScreen] = useState<'home' | 'farmers' | 'communities' | 'messages' | 'settings'>('home')
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-up')
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [weatherResult, setWeatherResult] = useState<{ key: string; weather: WeatherReport | null; error: string } | null>(null)
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [locationBusy, setLocationBusy] = useState(false)
  const profileLoaded = Boolean(session?.user && farmerData?.userId === session.user.id)
  const profile = profileLoaded ? farmerData?.profile ?? null : null
  const profileInterests = profileLoaded ? farmerData?.interests ?? [] : []
  const weatherKey = profile ? `${profile.location_id}:${profile.town_area}:${profile.latitude}:${profile.longitude}` : ''
  const currentWeatherResult = weatherResult?.key === weatherKey ? weatherResult : null
  const weather = currentWeatherResult?.weather ?? null
  const weatherError = currentWeatherResult?.error ?? ''
  const weatherBusy = Boolean(profile && !currentWeatherResult)

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session)
    }).finally(() => {
      if (active) setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    if (!supabase || !session?.user) return
    let active = true
    const userId = session.user.id
    Promise.all([
      supabase.from('farmer_profiles').select('*, location:locations(province,district)').eq('user_id', userId).maybeSingle(),
      supabase.from('user_farming_interests').select('farming_interests(name)').eq('user_id', userId),
      supabase.from('private_location_coordinates').select('latitude,longitude').eq('user_id', userId).maybeSingle(),
    ]).then(([profileResult, interestResult, coordinatesResult]) => {
      if (!active) return
      let nextProfile: FarmerProfile | null = null
      if (profileResult.data) {
        const row = profileResult.data as unknown as FarmerProfile & { location: { province: string; district: string } }
        const { location, ...farmer } = row
        nextProfile = {
          ...farmer,
          province: location.province,
          district: location.district,
          latitude: coordinatesResult.data?.latitude ?? null,
          longitude: coordinatesResult.data?.longitude ?? null,
        }
      }
      const nextInterests = interestResult.data?.map((row) => (row.farming_interests as unknown as { name: string }).name) ?? []
      startTransition(() => setFarmerData({ userId, profile: nextProfile, interests: nextInterests }))
    })
    return () => { active = false }
  }, [session, supabase])

  useEffect(() => {
    if (!supabase || !profile) return
    let active = true
    getWeather(supabase, {
      province: profile.province,
      district: profile.district,
      townArea: profile.town_area,
      latitude: profile.latitude,
      longitude: profile.longitude,
    }).then((result) => {
      if (active) setWeatherResult({ key: weatherKey, weather: result, error: '' })
    }).catch((error: unknown) => {
      if (active) setWeatherResult({ key: weatherKey, weather: null, error: error instanceof Error ? error.message : 'Weather is temporarily unavailable.' })
    })
    return () => { active = false }
  }, [profile, supabase, weatherKey])

  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setAuthBusy(true)
    setAuthError('')
    setAuthMessage('')
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    const result = authMode === 'sign-up'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    if (result.error) setAuthError(result.error.message)
    else if (authMode === 'sign-up' && !result.data.session) setAuthMessage('Check your email to confirm your account, then sign in.')
    setAuthBusy(false)
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !session) return
    setProfileBusy(true)
    setProfileError('')
    const form = new FormData(event.currentTarget)
    const selectedInterests = form.getAll('interests').map(String)
    const province = String(form.get('province') ?? '')
    const district = String(form.get('district') ?? '')
    const locationResult = await supabase.from('locations').select('id').eq('province', province).eq('district', district).maybeSingle()
    if (locationResult.error || !locationResult.data) {
      setProfileError(locationResult.error?.message ?? 'Choose a listed Zimbabwe district.')
      setProfileBusy(false)
      return
    }
    const nextProfile: FarmerProfile = {
      location_id: locationResult.data.id,
      display_name: String(form.get('display_name') ?? '').trim(),
      farm_name: String(form.get('farm_name') ?? '').trim() || null,
      province,
      district,
      town_area: String(form.get('town_area') ?? '').trim(),
      farm_size_hectares: form.get('farm_size_hectares') ? Number(form.get('farm_size_hectares')) : null,
      experience_years: form.get('experience_years') ? Number(form.get('experience_years')) : null,
      latitude: form.get('latitude') ? Number(form.get('latitude')) : null,
      longitude: form.get('longitude') ? Number(form.get('longitude')) : null,
    }
    const identity = await supabase.from('users').update({ display_name: nextProfile.display_name }).eq('id', session.user.id)
    if (identity.error) {
      setProfileError(identity.error.message)
      setProfileBusy(false)
      return
    }
    const persistedProfile = {
      location_id: nextProfile.location_id,
      town_area: nextProfile.town_area,
      farm_name: nextProfile.farm_name,
      farm_size_hectares: nextProfile.farm_size_hectares,
      experience_years: nextProfile.experience_years,
    }
    const { error } = await supabase.from('farmer_profiles').upsert({ user_id: session.user.id, ...persistedProfile }, { onConflict: 'user_id' })
    if (error) {
      setProfileError(error.message)
      setProfileBusy(false)
      return
    }
    const coordinatesResult = nextProfile.latitude !== null && nextProfile.longitude !== null
      ? await supabase.from('private_location_coordinates').upsert({ user_id: session.user.id, latitude: nextProfile.latitude, longitude: nextProfile.longitude }, { onConflict: 'user_id' })
      : await supabase.from('private_location_coordinates').delete().eq('user_id', session.user.id)
    if (coordinatesResult.error) {
      setProfileError(coordinatesResult.error.message)
      setProfileBusy(false)
      return
    }
    const found = await supabase.from('farming_interests').select('id,slug').in('slug', selectedInterests)
    if (found.error) {
      setProfileError(found.error.message)
      setProfileBusy(false)
      return
    }
    const removed = await supabase.from('user_farming_interests').delete().eq('user_id', session.user.id)
    const added = found.data?.length
      ? await supabase.from('user_farming_interests').insert(found.data.map((interest) => ({ user_id: session.user.id, interest_id: interest.id })))
      : { error: null }
    if (removed.error || added.error) setProfileError(removed.error?.message ?? added.error?.message ?? 'Unable to save farming interests.')
    else {
      setFarmerData({
        userId: session.user.id,
        profile: nextProfile,
        interests: selectedInterests.map((slug) => interests.find((interest) => interest.slug === slug)?.name ?? slug),
      })
    }
    setProfileBusy(false)
  }

  function useCurrentLocation(setFormLocation: (latitude: number, longitude: number) => void) {
    if (!navigator.geolocation) {
      setProfileError('Location permission is not available in this browser. You can enter your area manually.')
      return
    }
    setLocationBusy(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setFormLocation(coords.latitude, coords.longitude)
        setLocationBusy(false)
      },
      () => {
        setProfileError('Location access was not granted. You can still choose your location manually.')
        setLocationBusy(false)
      },
      { enableHighAccuracy: false, timeout: 12000 },
    )
  }

  if (!supabase) return <ConfigurationScreen />
  if (loading) return <div className="loading-screen"><Sprout size={28} /><span>Opening your farm desk…</span></div>
  if (!session) return <AuthScreen mode={authMode} onModeChange={setAuthMode} onSubmit={handleAuth} busy={authBusy} error={authError} message={authMessage} />
  if (!profileLoaded) return <div className="loading-screen"><Sprout size={28} /><span>Loading your farm profile…</span></div>
  if (!profile) return <OnboardingScreen error={profileError} busy={profileBusy} onSubmit={saveProfile} onUseLocation={useCurrentLocation} locationBusy={locationBusy} />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" onClick={() => setScreen('home')} aria-label="Smart Farmer Connect home">
          <span className="brand-mark"><Sprout size={21} /></span>
          <span>smart farmer<span className="brand-second">connect</span></span>
        </a>
        <div className="sidebar-label">YOUR SPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {sections.map(({ id, label, icon: Icon }) => (
            <button key={id} className={screen === id ? 'nav-link active' : 'nav-link'} onClick={() => setScreen(id as typeof screen)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="season-note"><span className="season-icon"><Leaf size={16} /></span><div><b>Rooted in Zimbabwe</b><small>Local knowledge, shared</small></div></div>
          <button className="nav-link" onClick={() => setScreen('settings')}><Settings2 size={18} /><span>Settings</span></button>
          <button className="nav-link" onClick={() => supabase.auth.signOut()}><LogOut size={18} /><span>Sign out</span></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark"><Sprout size={19} /></span><b>smart farmer connect</b></div>
          <div className="search-box"><Search size={17} /><input aria-label="Search farmers and topics" placeholder="Search farmers, topics, communities" /><kbd>/</kbd></div>
          <div className="top-actions"><button className="icon-button" title="Notifications" aria-label="Notifications"><Bell size={19} /></button><button className="profile-chip" onClick={() => setScreen('settings')}><span className="avatar">{profile.display_name.slice(0, 1).toUpperCase()}</span><span className="profile-chip-name">{profile.display_name}</span><ChevronDown size={15} /></button></div>
        </header>

        {screen === 'home' && <HomeScreen profile={profile} interests={profileInterests} weather={weather} weatherError={weatherError} weatherBusy={weatherBusy} onSettings={() => setScreen('settings')} client={supabase} userId={session.user.id} />}
        {screen === 'settings' && <SettingsScreen profile={profile} interests={profileInterests} error={profileError} busy={profileBusy} onSubmit={saveProfile} onUseLocation={useCurrentLocation} locationBusy={locationBusy} />}
        {screen !== 'home' && screen !== 'settings' && <IntegrationScreen screen={screen} />}
      </main>
    </div>
  )
}

function ConfigurationScreen() {
  return (
    <main className="setup-page">
      <section className="setup-card">
        <span className="brand-mark large"><Sprout size={28} /></span>
        <p className="eyebrow">SMART FARMER CONNECT · ZIMBABWE</p>
        <h1>Your farming community,<br />connected.</h1>
        <p className="setup-copy">Connect the secure database to enable account creation, personal profiles, and live weather. This app does not create sample accounts or display invented farm information.</p>
        <div className="setup-checklist"><span><Check size={15} /> React + TypeScript application ready</span><span><Check size={15} /> Supabase auth and database integration ready</span><span><Check size={15} /> Weather served through a replaceable backend function</span></div>
        <div className="env-box"><b>Required frontend configuration</b><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_ANON_KEY</code><small>Copy `.env.example` to `.env.local` after creating a Supabase project. Never put service-role keys in frontend variables.</small></div>
        <a className="text-link" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Open Supabase dashboard <Globe2 size={14} /></a>
      </section>
    </main>
  )
}

function AuthScreen({ mode, onModeChange, onSubmit, busy, error, message }: {
  mode: 'sign-in' | 'sign-up'
  onModeChange: (mode: 'sign-in' | 'sign-up') => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  busy: boolean
  error: string
  message: string
}) {
  return (
    <main className="auth-page">
      <section className="auth-aside"><a className="brand light-brand" href="#"><span className="brand-mark"><Sprout size={21} /></span><span>smart farmer<span className="brand-second">connect</span></span></a><div className="auth-manifesto"><span className="eyebrow">GROWN HERE. SHARED HERE.</span><h1>Good farming<br />starts with<br /><i>good connection.</i></h1><p>A place for Zimbabwe's farmers to find trusted information and each other.</p><span className="manifesto-line"><MapPin size={15} /> Built around your place and your farm</span></div><div className="auth-foot">Zimbabwean farmers · one connected community</div></section>
      <section className="auth-form-side"><div className="auth-form-wrap"><span className="eyebrow">YOUR FARMING COMMUNITY</span><h2>{mode === 'sign-up' ? 'Create your account' : 'Welcome back'}</h2><p className="muted">{mode === 'sign-up' ? 'Start with an account. Add your farm details next.' : 'Sign in to return to your farm desk.'}</p>
        <form className="form-stack" onSubmit={onSubmit}><label>Email address<input required type="email" name="email" autoComplete="email" placeholder="you@example.com" /></label><label>Password<input required minLength={8} type="password" name="password" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} placeholder="At least 8 characters" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}
          <button className="primary-button full-button" disabled={busy}>{busy ? 'Please wait…' : mode === 'sign-up' ? 'Create account' : 'Sign in'} <span aria-hidden="true">→</span></button>
        </form><p className="switch-auth">{mode === 'sign-up' ? 'Already part of the community?' : 'New to the community?'} <button onClick={() => onModeChange(mode === 'sign-up' ? 'sign-in' : 'sign-up')}>{mode === 'sign-up' ? 'Sign in' : 'Create an account'}</button></p><div className="privacy-note"><ShieldCheck size={16} /> Your account is secured by Supabase Auth. Passwords are never stored by this app.</div>
      </div></section>
    </main>
  )
}

function OnboardingScreen({ error, busy, onSubmit, onUseLocation, locationBusy }: {
  error: string
  busy: boolean
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onUseLocation: (setCoordinates: (latitude: number, longitude: number) => void) => void
  locationBusy: boolean
}) {
  const [province, setProvince] = useState('')
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const districtList = province ? districtsByProvince[province] ?? [] : []
  return (
    <main className="onboarding-page"><div className="onboarding-head"><a className="brand" href="#"><span className="brand-mark"><Sprout size={21} /></span><span>smart farmer<span className="brand-second">connect</span></span></a><span className="step-count">YOUR FARM PROFILE <b>01 / 01</b></span></div>
      <section className="onboarding-content"><p className="eyebrow">FIRST, LET'S GET TO KNOW YOUR FARM</p><h1>Make it yours.</h1><p className="muted intro-copy">Your location and farming interests shape the weather and information we bring to you. You can update these details any time.</p>
        <form onSubmit={onSubmit} className="onboarding-form"><div className="form-section-title"><span>01</span><div><b>Your place</b><small>Choose a district and area. Precise GPS is optional.</small></div></div>
          <div className="location-row"><label>Country<input readOnly value="Zimbabwe" /></label><button type="button" className="location-button" onClick={() => onUseLocation((latitude, longitude) => setCoordinates({ latitude, longitude }))}><MapPin size={16} />{locationBusy ? 'Finding location…' : 'Use my current location'}</button></div>
          <div className="form-grid"><label>Province<select required name="province" value={province} onChange={(event) => setProvince(event.target.value)}><option value="">Choose province</option>{Object.keys(districtsByProvince).map((name) => <option key={name}>{name}</option>)}</select></label><label>District<select required name="district" disabled={!province}><option value="">{province ? 'Choose district' : 'Choose province first'}</option>{districtList.map((district) => <option key={district}>{district}</option>)}</select></label></div>
          <label>Town, village or farming area<input required name="town_area" placeholder="For example, Marondera or your village" /></label>
          <input type="hidden" name="latitude" value={coordinates?.latitude ?? ''} /><input type="hidden" name="longitude" value={coordinates?.longitude ?? ''} />
          {coordinates && <p className="location-confirm"><Check size={14} /> Current location saved for weather lookup. Your coordinates are not displayed publicly.</p>}
          <div className="form-section-title farm-section-title"><span>02</span><div><b>What do you farm?</b><small>Select all that apply. This personalizes your information.</small></div></div>
          <div className="interest-groups">{(['Crop', 'Livestock'] as const).map((category) => <fieldset key={category}><legend>{category === 'Crop' ? 'CROPS' : 'LIVESTOCK'}</legend><div className="interest-options">{interests.filter((item) => item.category === category).map((interest) => <label className="interest-option" key={interest.slug}><input type="checkbox" name="interests" value={interest.slug} /><span>{interest.name}</span></label>)}</div></fieldset>)}</div>
          <div className="form-section-title farm-section-title"><span>03</span><div><b>A little more about your farm</b><small>Optional details help us make your experience more useful.</small></div></div>
          <div className="form-grid"><label>Your name<input required name="display_name" placeholder="Name shown to the community" /></label><label>Farm name <span className="optional">OPTIONAL</span><input name="farm_name" placeholder="Farm or plot name" /></label><label>Farm size in hectares <span className="optional">OPTIONAL</span><input type="number" name="farm_size_hectares" min="0" step="0.1" placeholder="e.g. 2.5" /></label><label>Years farming <span className="optional">OPTIONAL</span><input type="number" name="experience_years" min="0" max="100" placeholder="e.g. 8" /></label></div>
          {error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button full-button" disabled={busy}>{busy ? 'Saving your profile…' : 'Save profile and continue'} <span aria-hidden="true">→</span></button><p className="form-footnote">Your profile details are stored securely and are only used to personalize the service.</p>
        </form>
      </section>
    </main>
  )
}

function HomeScreen({ profile, interests: selectedInterests, weather, weatherError, weatherBusy, onSettings, client, userId }: {
  profile: FarmerProfile
  interests: string[]
  weather: WeatherReport | null
  weatherError: string
  weatherBusy: boolean
  onSettings: () => void
  client: NonNullable<ReturnType<typeof getSupabase>>
  userId: string
}) {
  const area = [profile.town_area, profile.district, profile.province].filter(Boolean).join(', ')
  return (
    <div className="home-content"><section className="welcome-row"><div><p className="eyebrow">YOUR FARM DESK</p><h1>Good day, {profile.display_name.split(' ')[0]}<span className="greeting-dot">.</span></h1><p className="welcome-location"><MapPin size={15} /> {area}</p></div><button className="quiet-button" onClick={onSettings}><Settings2 size={16} /> Edit farm profile</button></section>
      <section className="priority-strip"><div className="priority-symbol"><HeartPulse size={19} /></div><div><span className="section-kicker">AGRICULTURAL HEALTH ALERTS</span><p>Verified alert sources are not connected yet, so no alerts are being shown.</p><small>We will only display alerts with a traceable source and original link.</small></div><span className="status-dot" title="No live verified source connected" /></section>
      <div className="dashboard-grid"><section className="weather-panel"><div className="panel-heading"><div><span className="section-kicker">LOCAL WEATHER</span><h2>{profile.town_area}</h2></div><CloudSun size={22} className="weather-mark" /></div>
        {weatherBusy ? <div className="weather-state"><span className="loader" /> Connecting to weather provider…</div> : weather ? <><div className="weather-current"><span className="temperature">{Math.round(weather.current.temperature)}°</span><div><b>{weather.current.description}</b><span>Feels like {Math.round(weather.current.apparentTemperature)}°</span></div></div><div className="weather-metrics"><span><Droplets size={16} /><b>{weather.current.relativeHumidity}%</b><small>Humidity</small></span><span><Droplets size={16} /><b>{weather.daily[0]?.precipitationProbability ?? '—'}{weather.daily[0]?.precipitationProbability == null ? '' : '%'}</b><small>Rain chance</small></span><span><CloudSun size={16} /><b>{weather.current.precipitation} mm</b><small>Rainfall now</small></span><span><Wind size={16} /><b>{weather.current.windSpeed} km/h</b><small>Wind</small></span></div><div className="forecast-row" aria-label="Five day weather forecast">{weather.daily.slice(0, 5).map((day) => <div key={day.date}><span>{new Date(`${day.date}T12:00:00`).toLocaleDateString([], { weekday: 'short' })}</span><b>{Math.round(day.maximumTemperature)}°</b><small>{day.precipitationProbability == null ? '—' : `${day.precipitationProbability}% rain`}</small></div>)}</div><div className="weather-provider">Source: <a href={weather.sourceUrl} target="_blank" rel="noreferrer">{weather.source}</a><span>Updated {new Date(weather.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div></> : <div className="weather-empty"><CloudSun size={25} /><p>{weatherError || 'Live weather is unavailable for this location right now.'}</p><small>Weather provided by Open-Meteo through the Smart Farmer Connect server.</small></div>}
        {weather?.warningStatus === 'not-provided' && <div className="weather-warning-note"><ShieldCheck size={14} /> Weather warnings are not provided by this source.</div>}
      </section>
        <section className="farm-focus-panel"><div className="panel-heading"><div><span className="section-kicker">YOUR FARMING INTERESTS</span><h2>Relevant to your farm</h2></div><Sprout size={21} className="green-mark" /></div>{selectedInterests.length ? <div className="interest-pills">{selectedInterests.map((interest) => <span key={interest}>{interest}</span>)}</div> : <div className="incomplete-note">No farming interests selected yet. Add crops or livestock in your profile settings.</div>}<p className="farm-focus-copy">As verified sources and real community posts become available, they'll be matched to your farm interests.</p><div className="feed-empty"><span className="feed-empty-icon"><Leaf size={18} /></span><div><b>Your farm feed starts here</b><small>There are no connected information sources for these interests yet.</small></div></div></section></div>
      <div className="section-heading-row"><div><span className="section-kicker">AROUND YOUR COMMUNITY</span><h2>Local voices, when they arrive</h2></div><span className="real-data-label"><span /> REAL ACTIVITY ONLY</span></div>
      <CommunityFeed client={client} userId={userId} displayName={profile.display_name} locationId={profile.location_id} interests={selectedInterests} />
      <div className="home-bottom-note"><ShieldCheck size={15} /> External information will always show its publisher and link to the original source.</div>
    </div>
  )
}

function CommunityFeed({ client, userId, displayName, locationId, interests: selectedInterests }: {
  client: NonNullable<ReturnType<typeof getSupabase>>
  userId: string
  displayName: string
  locationId: string
  interests: string[]
}) {
  const [feed, setFeed] = useState<{ key: string; posts: CommunityPost[]; loading: boolean; error: string }>({ key: '', posts: [], loading: true, error: '' })
  const [reloadVersion, setReloadVersion] = useState(0)
  const [submitBusy, setSubmitBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const interestKey = selectedInterests.join('|')
  const queryKey = `${userId}:${locationId}:${interestKey}`

  useEffect(() => {
    const channel = client.channel(`community-feed:${userId}:${locationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => setReloadVersion((current) => current + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => setReloadVersion((current) => current + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => setReloadVersion((current) => current + 1))
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [client, userId, locationId])

  useEffect(() => {
    let active = true
    loadRelevantPosts(client, { userId, locationId, interests: selectedInterests }).then((posts) => {
      if (active) setFeed({ key: queryKey, posts, loading: false, error: '' })
    }).catch((error: unknown) => {
      if (active) setFeed({ key: queryKey, posts: [], loading: false, error: error instanceof Error ? error.message : 'Community posts are unavailable.' })
    })
    return () => { active = false }
  }, [client, userId, locationId, interestKey, reloadVersion, queryKey, selectedInterests])

  async function submitPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitBusy(true)
    setSubmitError('')
    const form = event.currentTarget
    const values = new FormData(form)
    const image = values.get('image')
    try {
      await createCommunityPost(client, {
        userId,
        content: String(values.get('content') ?? ''),
        image: image instanceof File && image.size ? image : undefined,
      })
      form.reset()
      setReloadVersion((current) => current + 1)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Your post could not be shared.')
    } finally {
      setSubmitBusy(false)
    }
  }

  async function changeLike(post: CommunityPost) {
    try {
      await togglePostLike(client, userId, post.id, post.likedByCurrentUser)
      setReloadVersion((current) => current + 1)
    } catch (error) {
      setFeed((current) => ({ ...current, error: error instanceof Error ? error.message : 'Like could not be saved.' }))
    }
  }

  const ready = feed.key === queryKey && !feed.loading
  return <section className="community-feed" aria-labelledby="community-feed-title">
    <form className="post-composer" onSubmit={submitPost}>
      <div className="composer-avatar">{displayName.slice(0, 1).toUpperCase()}</div>
      <div className="composer-fields"><label className="sr-only" htmlFor="community-post-content">Share an update with your farming community</label><textarea id="community-post-content" name="content" maxLength={10000} placeholder="Share something from your farm…" required /></div>
      <div className="composer-actions"><label className="image-attach" title="Attach a JPEG, PNG, or WebP image up to 8 MB"><ImagePlus size={16} /><span>Photo</span><input name="image" type="file" accept="image/jpeg,image/png,image/webp" /></label><button className="primary-button share-post-button" disabled={submitBusy}><span>{submitBusy ? 'Sharing…' : 'Share update'}</span><Send size={15} /></button></div>
      {submitError && <p className="form-error composer-error" role="alert">{submitError}</p>}
    </form>
    {feed.error && <p className="form-error feed-error" role="alert">{feed.error}</p>}
    {(!ready || feed.posts.length > 0) && <h3 className="feed-list-title" id="community-feed-title">Community posts{ready ? <span>{feed.posts.length} relevant</span> : null}</h3>}
    {!ready ? <div className="feed-loading"><span className="loader" />Loading relevant community posts…</div> : feed.posts.length ? <div className="post-list">{feed.posts.map((post) => <CommunityPostCard key={post.id} client={client} userId={userId} post={post} onLike={() => changeLike(post)} onComment={() => setReloadVersion((current) => current + 1)} />)}</div> : <div className="community-empty feed-zero-state"><div className="community-empty-art"><Users size={23} /><span><MessageCircle size={16} /></span></div><div><h3>No relevant posts yet</h3><p>Posts from your district and farming interests will appear here when members share them.</p></div></div>}
  </section>
}

function CommunityPostCard({ client, userId, post, onLike, onComment }: {
  client: NonNullable<ReturnType<typeof getSupabase>>
  userId: string
  post: CommunityPost
  onLike: () => void
  onComment: () => void
}) {
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState('')
  const [commentBusy, setCommentBusy] = useState(false)
  const [shareMessage, setShareMessage] = useState('')

  async function toggleComments() {
    const nextOpen = !commentsOpen
    setCommentsOpen(nextOpen)
    if (!nextOpen) return
    setCommentsLoading(true)
    setCommentsError('')
    try {
      setComments(await loadPostComments(client, post.id))
    } catch (error) {
      setCommentsError(error instanceof Error ? error.message : 'Comments are unavailable.')
    } finally {
      setCommentsLoading(false)
    }
  }

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCommentBusy(true)
    setCommentsError('')
    const form = event.currentTarget
    const content = String(new FormData(form).get('comment') ?? '')
    try {
      await addPostComment(client, userId, post.id, content)
      form.reset()
      setComments(await loadPostComments(client, post.id))
      onComment()
    } catch (error) {
      setCommentsError(error instanceof Error ? error.message : 'Your comment could not be added.')
    } finally {
      setCommentBusy(false)
    }
  }

  async function sharePost() {
    const url = new URL(window.location.href)
    url.hash = `post-${post.id}`
    try {
      if (navigator.share) await navigator.share({ title: `Post by ${post.authorName}`, text: post.content, url: url.toString() })
      else {
        await navigator.clipboard.writeText(url.toString())
        setShareMessage('Link copied')
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') setShareMessage('Unable to share this post from this browser.')
    }
  }

  return <article className="community-post" id={`post-${post.id}`}>
    <header className="post-header"><span className="post-avatar">{post.authorName.slice(0, 1).toUpperCase()}</span><div className="post-author"><b>{post.authorName}</b><time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</time></div>{post.locationLabel && <span className="post-area"><MapPin size={12} /> {post.locationLabel}</span>}</header>
    <p className="post-content">{post.content}</p>
    {post.imageUrl && <img className="post-image" src={post.imageUrl} alt="Photo shared with this farming update" loading="lazy" />}
    <div className="post-actions"><button className={post.likedByCurrentUser ? 'post-action liked' : 'post-action'} onClick={onLike} aria-label={post.likedByCurrentUser ? 'Unlike post' : 'Like post'}><Heart size={16} fill={post.likedByCurrentUser ? 'currentColor' : 'none'} /><span>{post.likeCount || 'Like'}</span></button><button className="post-action" onClick={toggleComments}><MessageCircle size={16} /><span>{post.commentCount || 'Comment'}</span></button><button className="post-action" onClick={sharePost}><Share2 size={15} /><span>Share</span></button>{shareMessage && <span className="share-status" role="status">{shareMessage}</span>}</div>
    {commentsOpen && <div className="post-comments">{commentsLoading ? <p className="comment-status">Loading comments…</p> : comments.map((comment) => <div className="comment-row" key={comment.id}><span className="comment-avatar">{comment.authorName.slice(0, 1).toUpperCase()}</span><p><b>{comment.authorName}</b><span>{comment.content}</span></p></div>)}{!commentsLoading && !comments.length && !commentsError && <p className="comment-status">No comments yet.</p>}{commentsError && <p className="form-error" role="alert">{commentsError}</p>}<form className="comment-form" onSubmit={submitComment}><label className="sr-only" htmlFor={`comment-${post.id}`}>Write a comment</label><input id={`comment-${post.id}`} name="comment" placeholder="Write a comment…" maxLength={5000} required /><button aria-label="Send comment" disabled={commentBusy}><Send size={15} /></button></form></div>}
  </article>
}

function SettingsScreen({ profile, interests: selectedInterests, error, busy, onSubmit, onUseLocation, locationBusy }: {
  profile: FarmerProfile
  interests: string[]
  error: string
  busy: boolean
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onUseLocation: (setCoordinates: (latitude: number, longitude: number) => void) => void
  locationBusy: boolean
}) {
  const [province, setProvince] = useState(profile.province)
  const [district, setDistrict] = useState(profile.district)
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationEdited, setLocationEdited] = useState(false)
  const clearCoordinatesForManualEdit = () => { setCoordinates(null); setLocationEdited(true) }
  return <div className="settings-content"><p className="eyebrow">SETTINGS</p><h1>My farming location</h1><p className="muted">Your location is used for local weather and relevant agricultural information.</p><form className="settings-form" onSubmit={onSubmit}><div className="location-row"><label>Country<input readOnly value="Zimbabwe" /></label><button className="location-button" type="button" onClick={() => onUseLocation((latitude, longitude) => { setCoordinates({ latitude, longitude }); setLocationEdited(false) })}><MapPin size={16} />{locationBusy ? 'Finding location…' : 'Use my current location'}</button></div><div className="form-grid"><label>Province<select name="province" value={province} onChange={(event) => { setProvince(event.target.value); setDistrict(''); clearCoordinatesForManualEdit() }} required>{Object.keys(districtsByProvince).map((name) => <option key={name}>{name}</option>)}</select></label><label>District<select name="district" value={district} onChange={(event) => { setDistrict(event.target.value); clearCoordinatesForManualEdit() }} required>{(districtsByProvince[province] ?? []).map((districtName) => <option key={districtName}>{districtName}</option>)}</select></label></div><label>Town, village or farming area<input name="town_area" defaultValue={profile.town_area} onChange={clearCoordinatesForManualEdit} required /></label><input type="hidden" name="display_name" value={profile.display_name} /><input type="hidden" name="farm_name" value={profile.farm_name ?? ''} /><input type="hidden" name="farm_size_hectares" value={profile.farm_size_hectares ?? ''} /><input type="hidden" name="experience_years" value={profile.experience_years ?? ''} />{selectedInterests.map((name) => { const interest = interests.find((item) => item.name === name); return interest ? <input key={interest.slug} type="hidden" name="interests" value={interest.slug} /> : null })}<input type="hidden" name="latitude" value={coordinates?.latitude ?? (!locationEdited ? profile.latitude ?? '' : '')} /><input type="hidden" name="longitude" value={coordinates?.longitude ?? (!locationEdited ? profile.longitude ?? '' : '')} />{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save location'} <span aria-hidden="true">→</span></button></form></div>
}

function IntegrationScreen({ screen }: { screen: 'farmers' | 'communities' | 'messages' | 'settings' | 'home' }) {
  const content = {
    farmers: { title: 'Farmers near you', body: 'Farmer discovery will show real profiles that match your selected area. There are no member profiles to show yet.', icon: Users },
    communities: { title: 'Farming communities', body: 'Communities will appear here when they are created by members. No sample communities have been added.', icon: Compass },
    messages: { title: 'Your messages', body: 'Private messaging is not connected yet. Conversations will be stored in the database when messaging is enabled.', icon: MessageCircle },
    settings: { title: 'Settings', body: 'Settings are not available.', icon: Settings2 },
    home: { title: 'Home', body: '', icon: Sprout },
  }[screen]
  const Icon = content.icon
  return <div className="integration-page"><span className="integration-icon"><Icon size={23} /></span><span className="section-kicker">REAL PEOPLE · REAL INFORMATION</span><h1>{content.title}</h1><p>{content.body}</p><div className="integration-status"><span className="status-dot" /> Integration point · not yet connected</div></div>
}

export default App