import { useRideData } from '../hooks/useRideData.js';
import MapPreview from '../components/MapPreview.jsx';

export default function ActiveRidePage() {
  const { rides, loading } = useRideData(true);
  const activeRide = rides.find((ride) => ['accepted', 'en_route'].includes(ride.status));

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Live Rescue Status</h1>
          <p className="text-slate-300 text-sm">
            Real-time updates pull from the SupportCarr API every time you refresh.
          </p>
        </header>
        {loading && <p>Loading your ride…</p>}
        {activeRide ? (
          <article className="grid md:grid-cols-2 gap-6">
            <MapPreview pickup={activeRide.pickup} dropoff={activeRide.dropoff} />
            <div className="bg-slate-900 rounded-lg p-6 border border-slate-800 space-y-2">
              <h2 className="text-xl font-semibold">Driver ETA</h2>
              <p className="text-4xl font-bold text-brand-500">8 min</p>
              <p className="text-slate-300 text-sm">
                Dispatch uses Redis geospatial lookups to grab the nearest fleet driver.
              </p>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>Status: {activeRide.status}</li>
                <li>Bike Type: {activeRide.bikeType}</li>
                <li>Price: ${(activeRide.priceCents / 100).toFixed(2)}</li>
              </ul>
            </div>
          </article>
        ) : (
          <p className="text-slate-400">No active rides. Request one to view live tracking.</p>
        )}
      </div>
    </main>
  );
}
