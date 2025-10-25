import { useEffect, useState } from 'react';
import client from '../api/httpClient';

export function useRideData(enabled = true) {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    client
      .get('/rides')
      .then((res) => setRides(res.data))
      .finally(() => setLoading(false));
  }, [enabled]);

  return { rides, loading };
}
