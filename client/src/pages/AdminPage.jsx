import { useEffect, useState } from 'react';
import client from '../api/httpClient';

export default function AdminPage() {
  const [rides, setRides] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRide, setSelectedRide] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch all rides (admin can see all)
      const ridesRes = await client.get('/rides');
      setRides(ridesRes.data);

      // Fetch available drivers
      const driversRes = await client.get('/drivers');
      setDrivers(driversRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleManualAssign = async () => {
    if (!selectedRide || !selectedDriver) return;

    try {
      setAssigning(true);
      // Update ride with selected driver
      await client.patch(`/rides/${selectedRide._id}`, {
        status: 'accepted',
        driverId: selectedDriver
      });

      setSelectedRide(null);
      setSelectedDriver('');
      await fetchData(); // Refresh data
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign driver');
    } finally {
      setAssigning(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'requested': return 'text-yellow-400';
      case 'accepted': return 'text-blue-400';
      case 'en_route': return 'text-purple-400';
      case 'completed': return 'text-green-400';
      case 'cancelled': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p>Loading admin dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-slate-300 text-sm">
            Manual dispatch override and trip monitoring
          </p>
        </header>

        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        <section className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xl font-semibold">All Trips</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left">Ride ID</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Pickup</th>
                  <th className="px-4 py-3 text-left">Dropoff</th>
                  <th className="px-4 py-3 text-left">Vehicle Type</th>
                  <th className="px-4 py-3 text-left">Price</th>
                  <th className="px-4 py-3 text-left">Driver</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rides.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-6 text-center text-slate-400">
                      No trips found
                    </td>
                  </tr>
                ) : (
                  rides.map((ride) => (
                    <tr key={ride._id} className="hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-mono text-xs">
                        {ride._id.slice(-8)}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${getStatusColor(ride.status)}`}>
                        {ride.status}
                      </td>
                      <td className="px-4 py-3">
                        {ride.pickup?.address || `${ride.pickup?.lat}, ${ride.pickup?.lng}`}
                      </td>
                      <td className="px-4 py-3">
                        {ride.dropoff?.address || `${ride.dropoff?.lat}, ${ride.dropoff?.lng}`}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {ride.bikeType}
                      </td>
                      <td className="px-4 py-3">
                        ${(ride.priceCents / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {ride.driver?.user?.name || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3">
                        {ride.status === 'requested' && (
                          <button
                            onClick={() => setSelectedRide(ride)}
                            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs font-semibold"
                          >
                            Manually Assign Driver
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedRide && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 rounded-lg border border-slate-700 p-6 max-w-md w-full space-y-4">
              <h3 className="text-xl font-bold">Assign Driver</h3>
              <p className="text-sm text-slate-300">
                Ride ID: <span className="font-mono">{selectedRide._id.slice(-8)}</span>
              </p>
              <p className="text-sm text-slate-300">
                Pickup: {selectedRide.pickup?.address}
              </p>

              <label className="flex flex-col text-sm">
                Select Driver
                <select
                  className="mt-2 p-2 rounded bg-slate-800 border border-slate-700"
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                >
                  <option value="">-- Choose a driver --</option>
                  {drivers.map((driver) => (
                    <option key={driver._id} value={driver._id}>
                      {driver.user?.name || 'Unknown'} - {driver.vehicleType} ({driver.licensePlate || 'No plate'})
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex gap-3">
                <button
                  onClick={handleManualAssign}
                  disabled={!selectedDriver || assigning}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2 rounded font-semibold"
                >
                  {assigning ? 'Assigning...' : 'Assign'}
                </button>
                <button
                  onClick={() => {
                    setSelectedRide(null);
                    setSelectedDriver('');
                  }}
                  disabled={assigning}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
