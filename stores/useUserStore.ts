import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  age?: number;
  weight?: number;
  height?: number;
  goal?: 'cutting' | 'bulking' | 'maintenance' | 'strength' | 'endurance';
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  createdAt: string;
}

interface UserState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
      updateProfile: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      logout: () => set({ user: null, isAuthenticated: false, isLoading: false }),
    }),
    { name: 'trainova-user' }
  )
);
