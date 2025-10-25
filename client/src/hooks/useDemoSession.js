import { useEffect } from 'react';
import client from '../api/httpClient.js';
import { useSessionStore } from '../store/useSessionStore.js';

const DEMO_RIDER = {
  email: 'demo-rider@supportcarr.test',
  password: 'DemoPass123!',
  name: 'Demo Rider',
  phoneNumber: '+13235550100',
  role: 'rider'
};

const DEMO_DRIVER = {
  email: 'demo-driver@supportcarr.test',
  password: 'DemoPass123!',
  name: 'Demo Driver',
  phoneNumber: '+13235550200',
  role: 'driver'
};

async function ensureAccount(payload) {
  try {
    const { data } = await client.post('/auth/login', {
      email: payload.email,
      password: payload.password
    });
    return data;
  } catch (error) {
    const { data } = await client.post('/auth/register', payload);
    return data;
  }
}

export function useDemoSession() {
  const setSession = useSessionStore((state) => state.setSession);
  const switchRole = useSessionStore((state) => state.switchRole);

  useEffect(() => {
    async function bootstrap() {
      const riderSession = await ensureAccount(DEMO_RIDER);
      setSession('rider', riderSession);

      const driverSession = await ensureAccount(DEMO_DRIVER);
      setSession('driver', driverSession);
      switchRole('rider');

      try {
        const { data: driverProfile } = await client.post(
          '/drivers',
          { vehicleType: 'van', vehicleDescription: 'Demo Rescue Van' },
          { headers: { Authorization: `Bearer ${driverSession.accessToken}` } }
        );
        await client.patch(
          `/drivers/${driverProfile._id}`,
          { active: true, currentLocation: { lat: 34.077, lng: -118.26 } },
          { headers: { Authorization: `Bearer ${driverSession.accessToken}` } }
        );
        setSession('driver', { ...driverSession, driverProfile });
      } catch (error) {
        // profile probably exists
        setSession('driver', driverSession);
      }
    }

    bootstrap();
  }, [setSession, switchRole]);
}
