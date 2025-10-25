export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">
        <header>
          <h1 className="text-3xl font-bold">Manual Dispatch Console</h1>
          <p className="text-slate-300 text-sm">
            Airtable + Make scenarios plug in here during the next sprint. For now we summarize recent ride analytics.
          </p>
        </header>
        <section className="bg-slate-900 rounded-lg border border-slate-800 p-6 space-y-3">
          <h2 className="text-xl font-semibold">Dispatch Checklist</h2>
          <ol className="list-decimal list-inside text-slate-300 space-y-2 text-sm">
            <li>Confirm rider location and bike type.</li>
            <li>Call nearest driver from Airtable roster (Redis powered suggestions).</li>
            <li>Send SMS via Twilio template, log acceptance.</li>
            <li>Track ride lifecycle manually, update payout column.</li>
          </ol>
        </section>
        <section className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <h2 className="text-xl font-semibold">Latest Metrics</h2>
          <p className="text-slate-400 text-sm">Average pickup time: 11m • Completion rate: 98% • Joshua Tree pilot rides: 12/week</p>
        </section>
      </div>
    </main>
  );
}
