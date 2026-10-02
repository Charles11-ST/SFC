export function PhasePlaceholder({ title, phase }: { title: string; phase: string }) {
  return (
    <main className="phase-page">
      <p className="eyebrow">SMART FARMER CONNECT · {phase}</p>
      <h1>{title}</h1>
      <p>This route is reserved for the {phase.toLocaleLowerCase()} phase. It is not presented as a working feature yet.</p>
    </main>
  )
}
