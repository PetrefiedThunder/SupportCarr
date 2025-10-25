import { create } from 'zustand';

export const useSessionStore = create((set, get) => ({
  sessions: {},
  currentRole: 'rider',
  setSession: (role, session) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [role]: session
      }
    })),
  switchRole: (role) => set({ currentRole: role }),
  clearSession: () => set({ sessions: {}, currentRole: 'rider' }),
  getActiveSession: () => {
    const { sessions, currentRole } = get();
    return sessions[currentRole] || {};
  }
}));
