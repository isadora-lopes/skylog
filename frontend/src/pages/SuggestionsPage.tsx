import { useState } from 'react';
import AppHeader from '../components/AppHeader';
import LiveSkyWidget from '../components/LiveSkyWidget';
import WeeklySuggestionsResults from '../components/suggestions/WeeklySuggestionsResults';
import * as obsService from '../services/observationService';
import type { WeeklySuggestionsResponse } from '../types/api';
import { getApiErrorMessage } from '../utils/errors';
import '../styles/auth.css';
import '../styles/observations.css';
import '../styles/suggestions.css';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function SuggestionsPage() {
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [date, setDate] = useState(todayISO());
  const [locating, setLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<WeeklySuggestionsResponse | null>(null);

  function handleUseMyLocation() {
    setErrorMsg('');
    if (!navigator.geolocation) {
      setErrorMsg('Seu navegador não suporta geolocalização.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(String(position.coords.latitude.toFixed(4)));
        setLon(String(position.coords.longitude.toFixed(4)));
        setLocationLabel('Localização atual (GPS)');
        setLocating(false);
      },
      () => {
        setErrorMsg('Não foi possível obter sua localização.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    const latNum = Number(lat);
    const lonNum = Number(lon);
    if (lat === '' || lon === '' || Number.isNaN(latNum) || Number.isNaN(lonNum)) {
      setErrorMsg('Informe latitude e longitude válidas.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = (await obsService.getWeeklySuggestions({
        lat: latNum,
        lon: lonNum,
        date,
      })) as WeeklySuggestionsResponse;
      setResult(data);
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Erro ao buscar sugestões.'));
    } finally {
      setLoading(false);
    }
  }

  const latNum = lat !== '' ? Number(lat) : null;
  const lonNum = lon !== '' ? Number(lon) : null;

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main">
        <div className="toolbar">
          <h1>Sugestões de observação</h1>
        </div>
        <p style={{ color: 'var(--ink-soft)', marginTop: -10, marginBottom: 20, fontSize: '0.9rem' }}>
          Informe local e data inicial para ver astros visíveis na semana e previsão do céu.
        </p>

        <form className="suggestions-form" onSubmit={handleSubmit}>
          <div className="suggestions-form-row">
            <div className="location-field">
              <label htmlFor="lat">Latitude</label>
              <input
                id="lat"
                type="number"
                step="any"
                placeholder="Ex: -27.5954"
                value={lat}
                onChange={(e) => {
                  setLat(e.target.value);
                  setLocationLabel('');
                }}
              />
              <div className="field-hint">{locationLabel || 'Use GPS ou digite manualmente'}</div>
              <button type="button" className="btn-locate" onClick={handleUseMyLocation} disabled={locating}>
                {locating ? 'Localizando…' : 'Usar minha localização'}
              </button>
            </div>
            <div className="field">
              <label htmlFor="lon">Longitude</label>
              <input
                id="lon"
                type="number"
                step="any"
                placeholder="Ex: -48.5480"
                value={lon}
                onChange={(e) => {
                  setLon(e.target.value);
                  setLocationLabel('');
                }}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="date">Início da semana</label>
              <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <button
            className="btn-primary-sm suggestions-submit"
            type="submit"
            style={{ marginTop: 16 }}
            disabled={loading}
          >
            {loading ? 'Buscando…' : 'Ver sugestões da semana'}
          </button>
        </form>

        {errorMsg && <div className="auth-alert">{errorMsg}</div>}

        <LiveSkyWidget lat={latNum} lon={lonNum} />

        {result?.success && <WeeklySuggestionsResults result={result} />}
      </main>
    </div>
  );
}
