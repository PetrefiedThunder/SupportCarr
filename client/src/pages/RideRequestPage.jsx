import { useState } from 'react';
import RideRequestForm from '../components/RideRequestForm.jsx';
import MapPreview from '../components/MapPreview.jsx';

export default function RideRequestPage() {
  const [ride, setRide] = useState(null);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-10 grid lg:grid-cols-2 gap-8">
        <RideRequestForm onSuccess={setRide} />
        <div className="space-y-4">
          <MapPreview pickup={ride?.pickup} dropoff={ride?.dropoff} />
          <section className="bg-slate-900 p-6 rounded-lg border border-slate-800">
            <h2 className="text-xl font-semibold mb-3">Ride Summary</h2>
            {ride ? (
              <ul className="space-y-2 text-sm text-slate-300">
                <li>
                  Pickup: <strong>{ride.pickup.address}</strong>
                </li>
                <li>
                  Dropoff: <strong>{ride.dropoff.address}</strong>
                </li>
                <li>Status: {ride.status}</li>
                <li>Price: ${(ride.priceCents / 100).toFixed(2)}</li>
              </ul>
            ) : (
              <p className="text-slate-400">Fill out the form to see pricing and status updates.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
