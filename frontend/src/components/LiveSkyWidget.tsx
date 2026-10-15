import { useSkyStream } from '../hooks/useSkyStream';

export default function LiveSkyWidget({ lat, lon }: { lat: number | null; lon: number | null }) {
  const hasCoords = lat !== null && lon !== null && !Number.isNaN(lat) && !Number.isNaN(lon);
  const { data, connected, error } = useSkyStream({ lat, lon, enabled: hasCoords });

  if (!hasCoords) return null;

  const available = data?.available === true;

  return (
    <div className="live-sky-widget">
      <div className="live-sky-header">
        <span className={`live-dot ${connected ? 'on' : 'off'}`} />
        <span className="live-sky-title">Condições agora</span>
        {connected && <span className="live-sky-badge">Ao vivo</span>}
      </div>

      {error && <p className="live-sky-error">{error}</p>}

      {available ? (
        <div className="live-sky-body">
          <div className="live-sky-readings">
            <span className="live-sky-cloud">{String(data?.cloudCover ?? '—')}% de nuvens</span>
            <span className="live-sky-sub">
              {String(data?.weatherLabel ?? '—')} ·{' '}
              {data?.temperature !== null && data?.temperature !== undefined
                ? `${Math.round(Number(data.temperature))}°C`
                : '—'}
            </span>
          </div>
          <span className="live-sky-updated">
            atualizado {formatUpdatedAt(String(data?.fetchedAt ?? ''))}
          </span>
        </div>
      ) : (
        !error && <p className="live-sky-loading">Conectando ao stream de condições do céu…</p>
      )}
    </div>
  );
}

function formatUpdatedAt(isoString: string) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
