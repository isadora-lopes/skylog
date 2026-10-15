import type { ChartPoint, Observation, StatsPayload, WeeklySuggestionsResponse } from '../types/api';
import api from './api';

export interface ListParams {
  object?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function listObservations(params: ListParams = {}) {
  const { data } = await api.get<{
    success: boolean;
    data: Observation[];
    total: number;
    totalPages: number;
  }>('/observations', { params });
  return data;
}

export async function getStats() {
  const { data } = await api.get<{ success: boolean; stats: StatsPayload; chart: ChartPoint[] }>(
    '/observations/stats',
  );
  return data;
}

export async function getWeeklySuggestions(params: { lat: number; lon: number; date: string }) {
  const { data } = await api.get<WeeklySuggestionsResponse>('/observations/suggestions/week', { params });
  return data;
}

export async function createObservation(payload: Record<string, unknown>) {
  const body = toFormData(payload);
  const { data } = await api.post('/observations', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data as Observation;
}

export async function updateObservation(id: number, payload: Record<string, unknown>) {
  const body = toFormData(payload);
  const { data } = await api.put(`/observations/${id}`, body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data as Observation;
}

export async function deleteObservation(id: number) {
  const { data } = await api.delete(`/observations/${id}`);
  return data;
}

function toFormData(payload: Record<string, unknown>) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (value instanceof File) {
      formData.append(key, value);
    } else {
      formData.append(key, String(value));
    }
  });
  return formData;
}
