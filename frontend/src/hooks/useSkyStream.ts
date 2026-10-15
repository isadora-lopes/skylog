import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export function useSkyStream({
  lat,
  lon,
  enabled,
}: {
  lat: number | null;
  lon: number | null;
  enabled: boolean;
}) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled || lat === null || lon === null || Number.isNaN(lat) || Number.isNaN(lon)) {
      return undefined;
    }

    const token = localStorage.getItem('skylog_token');
    if (!token) return undefined;

    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      token,
    });

    const url = `${API_URL}/observations/sky-stream?${params.toString()}`;
    const source = new EventSource(url);

    source.addEventListener('open', () => {
      setConnected(true);
      setError('');
    });

    source.addEventListener('sky-update', (event) => {
      try {
        const parsed = JSON.parse(event.data) as Record<string, unknown>;
        setData(parsed);
        setConnected(true);
        setError('');
      } catch {
        setError('Resposta inválida do servidor.');
      }
    });

    source.addEventListener('sky-error', (event) => {
      try {
        const parsed = JSON.parse(event.data) as { message?: string };
        setError(parsed.message || 'Erro ao atualizar condições do céu.');
      } catch {
        setError('Erro ao atualizar condições do céu.');
      }
    });

    source.onerror = () => {
      setConnected(false);
    };

    return () => {
      source.close();
      setConnected(false);
    };
  }, [lat, lon, enabled]);

  return { data, connected, error };
}
