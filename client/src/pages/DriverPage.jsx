import DriverDashboard from '../components/DriverDashboard.jsx';

export default function DriverPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Driver Command Center</h1>
          <p className="text-slate-300 text-sm">
            Update availability, accept rides, and mark jobs complete. Stripe payouts trigger automatically on completion.
          </p>
          <p className="text-xs text-slate-500">Use the role selector in the navigation bar to toggle between rider and driver demo sessions.</p>
        </header>
        <DriverDashboard />
      </div>
    </main>
  );
}
