import { useMemo } from 'react';
import { useRideData } from '../hooks/useRideData.js';
import MapPreview from '../components/MapPreview.jsx';

export default function ActiveRidePage() {
  const { rides, loading, error } = useRideData({ enabled: true, pollInterval: 60000 });
  const activeRide = useMemo(
    () => rides.find((ride) => ['accepted', 'en_route'].includes(ride.status)),
    [rides]
  );

  const eta = activeRide?.driverEtaMinutes ?? null;
  const etaLabel = eta === null || eta === undefined ? 'Calculating…' : `${eta} min`;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Live Rescue Status</h1>
          <p className="text-slate-300 text-sm">
            Status, driver ETA, and pricing refresh automatically while you keep this page
            open.
          </p>
        </header>
        {loading && <p className="text-slate-300">Loading your ride…</p>}
        {error && !loading && (
          <p className="text-sm text-amber-400" role="alert">
            {error}
          </p>
        )}
        {activeRide ? (
          <article className="grid md:grid-cols-2 gap-6">
            <MapPreview pickup={activeRide.pickup} dropoff={activeRide.dropoff} />
            <div className="bg-slate-900 rounded-lg p-6 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Driver ETA</h2>
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  {activeRide.status}
                </span>
              </div>
              <p className="text-4xl font-bold text-brand-500" data-testid="driver-eta">
                {etaLabel}
              </p>
              <p className="text-slate-300 text-sm">
                Dispatch uses Redis geospatial lookups to grab the nearest fleet driver. We
                push new ETAs as soon as the driver advances their status.
              </p>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>Bike Type: {activeRide.bikeType}</li>
                <li>Price: ${(activeRide.priceCents / 100).toFixed(2)}</li>
                {activeRide.driver?.user && (
                  <li>Driver: {activeRide.driver.user.name}</li>
                )}
              </ul>
            </div>
          </article>
        ) : (
          !loading && (
            <p className="text-slate-400">No active rides. Request one to view live tracking.</p>
          )
        )}
      </div>
    </main>
  );
}
