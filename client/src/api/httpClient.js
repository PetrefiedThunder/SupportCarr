import axios from 'axios';
import { useSessionStore } from '../store/useSessionStore';
import { env as metaEnv } from '../utils/metaEnv.js';

const baseURL = metaEnv.VITE_API_URL || process.env.VITE_API_URL || 'http://localhost:4000/api';

const client = axios.create({
  baseURL
});

client.interceptors.request.use((config) => {
  const { getActiveSession } = useSessionStore.getState();
  const { accessToken } = getActiveSession();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export default client;
