import { useCallback, useEffect, useRef, useState } from 'react';
import client from '../api/httpClient';
import { useSessionStore } from '../store/useSessionStore.js';

function normalizeOptions(options) {
  if (typeof options === 'boolean') {
    return { enabled: options };
  }

  return { enabled: true, pollInterval: 30000, ...(options || {}) };
}

export function useRideData(options) {
  const { enabled, pollInterval } = normalizeOptions(options);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const eventSourcesRef = useRef(new Map());
  const pollTimerRef = useRef(null);
  const session = useSessionStore((state) => state.getActiveSession());
  const accessToken = session?.accessToken;

  const fetchRides = useCallback(
    async (showSpinner = true) => {
      if (!enabled) return [];
      if (showSpinner) {
        setLoading(true);
      }

      try {
        const response = await client.get('/rides');
        setRides(response.data);
        setError(null);
        return response.data;
      } catch (err) {
        const message = err?.response?.data?.message || 'Unable to load rides';
        setError(message);
        return [];
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
      }
    },
    [enabled]
  );

  const closeAllStreams = useCallback(() => {
    eventSourcesRef.current.forEach((source) => source.close());
    eventSourcesRef.current.clear();
  }, []);

  const subscribeToRide = useCallback(
    (rideId) => {
      if (!rideId || eventSourcesRef.current.has(rideId)) {
        return;
      }

      if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
        return;
      }

      let baseURL = client.defaults.baseURL || '';
      if (baseURL.startsWith('/')) {
        baseURL = `${window.location.origin}${baseURL}`;
      }
      const normalizedBase = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
      const streamUrl = new URL(`rides/${rideId}/stream`, normalizedBase);

      if (accessToken) {
        streamUrl.searchParams.set('token', accessToken);
      }

      const source = new EventSource(streamUrl.toString());
      const handleUpdate = (event) => {
        if (!event.data) return;

        try {
          const payload = JSON.parse(event.data);
          setRides((current) => {
            const index = current.findIndex((ride) => ride._id === payload._id);
            if (index === -1) {
              return current;
            }

            const next = [...current];
            next[index] = { ...current[index], ...payload };
            return next;
          });
          setError(null);
        } catch (parseError) {
          console.error('Failed to parse ride update', parseError);
        }
      };

      source.addEventListener('snapshot', handleUpdate);
      source.addEventListener('status', handleUpdate);
      source.onerror = () => {
        setError('Real-time connection interrupted. Retrying…');
      };

      eventSourcesRef.current.set(rideId, source);
    },
    [accessToken]
  );

  useEffect(() => {
    if (!enabled) {
      closeAllStreams();
      return undefined;
    }

    let cancelled = false;
    (async () => {
      const data = await fetchRides(true);
      if (!cancelled) {
        data.forEach((ride) => {
          if (!['completed', 'cancelled'].includes(ride.status)) {
            subscribeToRide(ride._id);
          }
        });
      }
    })();

    if (pollInterval > 0) {
      pollTimerRef.current = setInterval(() => {
        fetchRides(false);
      }, pollInterval);
    }

    return () => {
      cancelled = true;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      closeAllStreams();
    };
  }, [enabled, fetchRides, subscribeToRide, pollInterval, closeAllStreams]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const activeRideIds = new Set(
      rides
        .filter((ride) => !['completed', 'cancelled'].includes(ride.status))
        .map((ride) => ride._id)
    );

    activeRideIds.forEach((rideId) => subscribeToRide(rideId));

    eventSourcesRef.current.forEach((source, rideId) => {
      if (!activeRideIds.has(rideId)) {
        source.close();
        eventSourcesRef.current.delete(rideId);
      }
    });
  }, [enabled, rides, subscribeToRide]);

  const refresh = useCallback(() => fetchRides(true), [fetchRides]);

  return { rides, loading, error, refresh };
}
