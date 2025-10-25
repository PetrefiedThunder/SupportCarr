import { useState } from 'react';
import client from '../api/httpClient';

export default function RideRequestForm({ onSuccess }) {
  const [form, setForm] = useState({
    pickupAddress: '',
    pickupLat: '',
    pickupLng: '',
    dropoffAddress: '',
    dropoffLat: '',
    dropoffLng: '',
    bikeType: 'bike',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const ride = await client.post('/rides', {
        pickup: {
          address: form.pickupAddress,
          lat: Number(form.pickupLat),
          lng: Number(form.pickupLng)
        },
        dropoff: {
          address: form.dropoffAddress,
          lat: Number(form.dropoffLat),
          lng: Number(form.dropoffLng)
        },
        bikeType: form.bikeType,
        notes: form.notes
      });
      onSuccess?.(ride.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request ride');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold">Request a Rescue</h2>
      {error && <p className="text-red-400">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col text-sm uppercase tracking-wide">
          Pickup Address
          <input
            className="mt-1 p-2 rounded bg-slate-800 border border-slate-700"
            name="pickupAddress"
            value={form.pickupAddress}
            onChange={handleChange}
            required
          />
        </label>
        <label className="flex flex-col text-sm uppercase tracking-wide">
          Dropoff Address
          <input
            className="mt-1 p-2 rounded bg-slate-800 border border-slate-700"
            name="dropoffAddress"
            value={form.dropoffAddress}
            onChange={handleChange}
            required
          />
        </label>
        <label className="flex flex-col text-sm">
          Pickup Latitude
          <input
            className="mt-1 p-2 rounded bg-slate-800 border border-slate-700"
            name="pickupLat"
            type="number"
            value={form.pickupLat}
            onChange={handleChange}
            required
          />
        </label>
        <label className="flex flex-col text-sm">
          Pickup Longitude
          <input
            className="mt-1 p-2 rounded bg-slate-800 border border-slate-700"
            name="pickupLng"
            type="number"
            value={form.pickupLng}
            onChange={handleChange}
            required
          />
        </label>
        <label className="flex flex-col text-sm">
          Dropoff Latitude
          <input
            className="mt-1 p-2 rounded bg-slate-800 border border-slate-700"
            name="dropoffLat"
            type="number"
            value={form.dropoffLat}
            onChange={handleChange}
            required
          />
        </label>
        <label className="flex flex-col text-sm">
          Dropoff Longitude
          <input
            className="mt-1 p-2 rounded bg-slate-800 border border-slate-700"
            name="dropoffLng"
            type="number"
            value={form.dropoffLng}
            onChange={handleChange}
            required
          />
        </label>
      </div>
      <label className="flex flex-col text-sm">
        Bike Type
        <select
          className="mt-1 p-2 rounded bg-slate-800 border border-slate-700"
          name="bikeType"
          value={form.bikeType}
          onChange={handleChange}
        >
          <option value="bike">Bike</option>
          <option value="ebike">E-Bike</option>
          <option value="cargo">Cargo</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="flex flex-col text-sm">
        Notes
        <textarea
          className="mt-1 p-2 rounded bg-slate-800 border border-slate-700"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
        />
      </label>
      <button
        type="submit"
        className="w-full bg-brand-500 hover:bg-brand-700 transition-colors text-white py-2 rounded"
        disabled={loading}
      >
        {loading ? 'Requesting…' : 'Get Help Now'}
      </button>
    </form>
  );
}
