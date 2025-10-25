import { useEffect, useMemo, useState } from 'react';
import client from '../api/httpClient';
import { searchAddress, reverseGeocode } from '../api/geocoding';
import MapPreview from './MapPreview.jsx';

const initialForm = {
  pickupAddress: '',
  pickupLat: '',
  pickupLng: '',
  dropoffAddress: '',
  dropoffLat: '',
  dropoffLng: '',
  bikeType: 'bike',
  notes: ''
};

function formatCoordinate(value) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return '';
  }
  return numeric.toFixed(6);
}

function parseLocation(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return null;
  }
  return { lat: latNum, lng: lngNum };
}

function validateCoordinates(form) {
  const parse = (type) => {
    const latRaw = form[`${type}Lat`];
    const lngRaw = form[`${type}Lng`];
    const label = type === 'pickup' ? 'Pickup' : 'Dropoff';

    if (
      latRaw === '' ||
      latRaw === null ||
      latRaw === undefined ||
      lngRaw === '' ||
      lngRaw === null ||
      lngRaw === undefined
    ) {
      throw new Error(
        `${label} location must include valid coordinates. Please select an address from the suggestions or choose a point on the map.`
      );
    }

    const latValue = Number(latRaw);
    const lngValue = Number(lngRaw);

    if (!Number.isFinite(latValue) || !Number.isFinite(lngValue)) {
      throw new Error(
        `${label} location must include valid coordinates. Please select an address from the suggestions or choose a point on the map.`
      );
    }

    if (latValue < -90 || latValue > 90) {
      throw new Error(`${label} latitude must be between -90 and 90.`);
    }

    if (lngValue < -180 || lngValue > 180) {
      throw new Error(`${label} longitude must be between -180 and 180.`);
    }

    return { lat: latValue, lng: lngValue };
  };

  return {
    pickup: parse('pickup'),
    dropoff: parse('dropoff')
  };
}

export default function RideRequestForm({ onSuccess }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeLocation, setActiveLocation] = useState(null);

  const [pickupQuery, setPickupQuery] = useState('');
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [pickupSearching, setPickupSearching] = useState(false);

  const [dropoffQuery, setDropoffQuery] = useState('');
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [dropoffSearching, setDropoffSearching] = useState(false);

  const pickupLocation = useMemo(() => parseLocation(form.pickupLat, form.pickupLng), [form.pickupLat, form.pickupLng]);
  const dropoffLocation = useMemo(() => parseLocation(form.dropoffLat, form.dropoffLng), [form.dropoffLat, form.dropoffLng]);

  useEffect(() => {
    let cancelled = false;
    const trimmed = pickupQuery.trim();

    if (trimmed.length < 3) {
      setPickupSuggestions([]);
      return undefined;
    }

    setPickupSearching(true);

    searchAddress(trimmed)
      .then((results) => {
        if (!cancelled) {
          setPickupSuggestions(results);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Pickup geocoding failed', err);
          setPickupSuggestions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPickupSearching(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pickupQuery]);

  useEffect(() => {
    let cancelled = false;
    const trimmed = dropoffQuery.trim();

    if (trimmed.length < 3) {
      setDropoffSuggestions([]);
      return undefined;
    }

    setDropoffSearching(true);

    searchAddress(trimmed)
      .then((results) => {
        if (!cancelled) {
          setDropoffSuggestions(results);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Dropoff geocoding failed', err);
          setDropoffSuggestions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDropoffSearching(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dropoffQuery]);

  const updateLocation = (type, { address, lat, lng }) => {
    setForm((prev) => ({
      ...prev,
      ...(address !== undefined ? { [`${type}Address`]: address } : {}),
      ...(lat !== undefined ? { [`${type}Lat`]: formatCoordinate(lat) } : {}),
      ...(lng !== undefined ? { [`${type}Lng`]: formatCoordinate(lng) } : {})
    }));
  };

  const handleAddressChange = (type, value) => {
    setActiveLocation(type);
    updateLocation(type, { address: value, lat: '', lng: '' });
    if (type === 'pickup') {
      setPickupQuery(value);
    } else {
      setDropoffQuery(value);
    }
  };

  const handleSelectSuggestion = (type, suggestion) => {
    updateLocation(type, {
      address: suggestion.placeName,
      lat: suggestion.coordinates.lat,
      lng: suggestion.coordinates.lng
    });
    if (type === 'pickup') {
      setPickupSuggestions([]);
      setPickupQuery('');
    } else {
      setDropoffSuggestions([]);
      setDropoffQuery('');
    }
  };

  const handleMapLocationChange = async (type, coords) => {
    setActiveLocation(type);
    updateLocation(type, { lat: coords.lat, lng: coords.lng });
    try {
      const result = await reverseGeocode(coords);
      if (result?.placeName) {
        updateLocation(type, { address: result.placeName });
      }
    } catch (err) {
      console.error('Reverse geocoding failed', err);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    let pickup;
    let dropoff;

    try {
      ({ pickup, dropoff } = validateCoordinates(form));
    } catch (validationError) {
      setError(validationError.message);
      return;
    }

    setLoading(true);
    try {
      const ride = await client.post('/rides', {
        pickup: {
          address: form.pickupAddress,
          lat: pickup.lat,
          lng: pickup.lng
        },
        dropoff: {
          address: form.dropoffAddress,
          lat: dropoff.lat,
          lng: dropoff.lng
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
      {error && <p className="text-red-400" role="alert">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <label className="flex flex-col text-sm uppercase tracking-wide">
            Pickup Address
            <input
              className="mt-1 p-2 rounded bg-slate-800 border border-slate-700"
              name="pickupAddress"
              value={form.pickupAddress}
              onChange={(event) => handleAddressChange('pickup', event.target.value)}
              onFocus={() => setActiveLocation('pickup')}
              placeholder="Search pickup address"
              autoComplete="off"
              required
            />
          </label>
          {pickupQuery.trim().length >= 3 && (
            <ul className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded shadow-lg max-h-48 overflow-auto text-sm">
              {pickupSearching && (
                <li className="px-3 py-2 text-slate-400">Searching…</li>
              )}
              {!pickupSearching && pickupSuggestions.length === 0 && (
                <li className="px-3 py-2 text-slate-400">No results found</li>
              )}
              {pickupSuggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-slate-700"
                    onClick={() => handleSelectSuggestion('pickup', suggestion)}
                  >
                    {suggestion.placeName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="relative">
          <label className="flex flex-col text-sm uppercase tracking-wide">
            Dropoff Address
            <input
              className="mt-1 p-2 rounded bg-slate-800 border border-slate-700"
              name="dropoffAddress"
              value={form.dropoffAddress}
              onChange={(event) => handleAddressChange('dropoff', event.target.value)}
              onFocus={() => setActiveLocation('dropoff')}
              placeholder="Search dropoff address"
              autoComplete="off"
              required
            />
          </label>
          {dropoffQuery.trim().length >= 3 && (
            <ul className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded shadow-lg max-h-48 overflow-auto text-sm">
              {dropoffSearching && (
                <li className="px-3 py-2 text-slate-400">Searching…</li>
              )}
              {!dropoffSearching && dropoffSuggestions.length === 0 && (
                <li className="px-3 py-2 text-slate-400">No results found</li>
              )}
              {dropoffSuggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-slate-700"
                    onClick={() => handleSelectSuggestion('dropoff', suggestion)}
                  >
                    {suggestion.placeName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <span className="block text-sm uppercase tracking-wide text-slate-400">Pickup Coordinates</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <input
              className="p-2 rounded bg-slate-800 border border-slate-700"
              name="pickupLat"
              value={form.pickupLat}
              readOnly
            />
            <input
              className="p-2 rounded bg-slate-800 border border-slate-700"
              name="pickupLng"
              value={form.pickupLng}
              readOnly
            />
          </div>
        </div>
        <div>
          <span className="block text-sm uppercase tracking-wide text-slate-400">Dropoff Coordinates</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <input
              className="p-2 rounded bg-slate-800 border border-slate-700"
              name="dropoffLat"
              value={form.dropoffLat}
              readOnly
            />
            <input
              className="p-2 rounded bg-slate-800 border border-slate-700"
              name="dropoffLng"
              value={form.dropoffLng}
              readOnly
            />
          </div>
        </div>
      </div>
      <MapPreview
        pickup={pickupLocation ?? undefined}
        dropoff={dropoffLocation ?? undefined}
        interactive
        activeLocation={activeLocation}
        onPickupChange={(coords) => handleMapLocationChange('pickup', coords)}
        onDropoffChange={(coords) => handleMapLocationChange('dropoff', coords)}
      />
      <label className="flex flex-col text-sm">
        Bike Type
        <select
          className="mt-1 p-2 rounded bg-slate-800 border border-slate-700"
          name="bikeType"
          value={form.bikeType}
          onChange={(event) => setForm((prev) => ({ ...prev, bikeType: event.target.value }))}
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
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
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
