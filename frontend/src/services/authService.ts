import type { AuthResponse, PublicUser } from '../types/api';
import api from './api';

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
  return data;
}

export async function register(name: string, email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', { name, email, password });
  return data;
}

export async function getMe(): Promise<PublicUser> {
  const { data } = await api.get<{ success: boolean; user: PublicUser }>('/auth/me');
  return data.user;
}
