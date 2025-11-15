import { useEffect, useState, useCallback } from 'react';
import client from '../api/httpClient';
import { useSessionStore } from '../store/useSessionStore.js';

export default function DriverDashboard() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const driverSession = useSessionStore((state) => state.sessions.driver || {});
  const driverProfileId = driverSession.driverProfile?._id;

  const fetchRides = useCallback(async () => {
    if (!driverProfileId) return;
    setLoading(true);
    try {
      const { data } = await client.get(`/rides/drivers/${driverProfileId}`);
      setRides(data);
    } finally {
      setLoading(false);
    }
  }, [driverProfileId]);

  const updateStatus = async (rideId, status) => {
    await client.patch(`/rides/${rideId}`, { status });
    fetchRides();
  };

  useEffect(() => {
    fetchRides();
  }, [driverProfileId, fetchRides]);

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Driver Dispatch Queue</h2>
        <p className="text-slate-300 text-sm">
          Accept or update ride jobs. Notifications are simulated via Twilio placeholders.
        </p>
      </header>
      {loading && <p>Loading active rides…</p>}
      <div className="grid gap-3">
        {rides.map((ride) => (
          <article key={ride._id} className="border border-slate-800 rounded p-4">
            <h3 className="font-semibold text-lg">{ride.pickup?.address} → {ride.dropoff?.address}</h3>
            <p className="text-sm text-slate-300">Status: {ride.status}</p>
            <div className="flex gap-2 mt-3">
              <button
                className="px-3 py-1 rounded bg-brand-500"
                onClick={() => updateStatus(ride._id, 'accepted')}
              >
                Accept
              </button>
              <button
                className="px-3 py-1 rounded bg-amber-500"
                onClick={() => updateStatus(ride._id, 'en_route')}
              >
                En Route
              </button>
              <button
                className="px-3 py-1 rounded bg-emerald-500"
                onClick={() => updateStatus(ride._id, 'completed')}
              >
                Complete
              </button>
            </div>
          </article>
        ))}
        {!rides.length && !loading && (
          <p className="text-sm text-slate-400">No active jobs right now. Take a hydration break!</p>
        )}
      </div>
    </section>
  );
}
