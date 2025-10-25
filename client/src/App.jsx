import { Routes, Route, Navigate, Link } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import RideRequestPage from './pages/RideRequestPage.jsx';
import ActiveRidePage from './pages/ActiveRidePage.jsx';
import DriverPage from './pages/DriverPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import { useDemoSession } from './hooks/useDemoSession.js';
import { useSessionStore } from './store/useSessionStore.js';

export default function App() {
  useDemoSession();
  const { currentRole, switchRole, sessions } = useSessionStore((state) => ({
    currentRole: state.currentRole,
    switchRole: state.switchRole,
    sessions: state.sessions
  }));
  const roles = Object.keys(sessions).length ? Object.keys(sessions) : ['rider', 'driver'];

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 bg-slate-950 text-white border-b border-slate-800">
        <Link to="/" className="font-bold tracking-wide uppercase">
          SupportCarr
        </Link>
        <div className="flex gap-4 text-sm items-center">
          <Link to="/request" className="hover:text-brand-400">
            Request Rescue
          </Link>
          <Link to="/active" className="hover:text-brand-400">
            Active Ride
          </Link>
          <Link to="/driver" className="hover:text-brand-400">
            Driver
          </Link>
          <Link to="/admin" className="hover:text-brand-400">
            Admin
          </Link>
          <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
            Role
            <select
              value={currentRole}
              onChange={(event) => switchRole(event.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/request" element={<RideRequestPage />} />
        <Route path="/active" element={<ActiveRidePage />} />
        <Route path="/driver" element={<DriverPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <footer className="mt-auto bg-slate-950 text-slate-500 text-xs text-center py-4 border-t border-slate-900">
        © {new Date().getFullYear()} SupportCarr • PWA v{__APP_VERSION__}
      </footer>
    </div>
  );
}
