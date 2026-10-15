import { createContext } from 'react';
import type { PublicUser } from '../types/api';

export interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (name: string, email: string, password: string) => Promise<PublicUser>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
