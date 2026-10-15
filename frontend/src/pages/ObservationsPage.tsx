import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import AppHeader from '../components/AppHeader';
import ObservationFormModal from '../components/ObservationFormModal';
import type { Observation } from '../types/api';
import * as obsService from '../services/observationService';
import { getApiErrorMessage } from '../utils/errors';
import '../styles/observations.css';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function ObservationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Observation | null>(null);

  const listQuery = useQuery({
    queryKey: ['observations', debouncedSearch, dateFrom, dateTo, page],
    queryFn: () =>
      obsService.listObservations({
        object: debouncedSearch || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        page,
        limit: 12,
      }),
  });

  const statsQuery = useQuery({
    queryKey: ['observations-stats'],
    queryFn: () => obsService.getStats(),
  });

  const observations = listQuery.data?.data ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;
  const stats = statsQuery.data?.stats;
  const errorMsg = listQuery.isError
    ? getApiErrorMessage(listQuery.error, 'Erro ao carregar observações.')
    : '';

  const pageButtons = useMemo(() => {
    const maxButtons = 7;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const start = Math.max(1, page - 3);
    const end = Math.min(totalPages, start + maxButtons - 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  async function handleFormSubmit(payload: Record<string, unknown>) {
    if (editing) {
      await obsService.updateObservation(editing._id, payload);
    } else {
      await obsService.createObservation(payload);
    }
    setModalOpen(false);
    setEditing(null);
    await queryClient.invalidateQueries({ queryKey: ['observations'] });
    await queryClient.invalidateQueries({ queryKey: ['observations-stats'] });
  }

  async function handleDelete(obs: Observation) {
    const confirmed = window.confirm(
      `Excluir a observação de "${obs.object}" em ${formatDate(obs.date)}?`,
    );
    if (!confirmed) return;
    try {
      await obsService.deleteObservation(obs._id);
      await queryClient.invalidateQueries({ queryKey: ['observations'] });
      await queryClient.invalidateQueries({ queryKey: ['observations-stats'] });
    } catch (err) {
      alert(getApiErrorMessage(err, 'Erro ao excluir observação.'));
    }
  }

  return (
    <div className="app-shell">
      <AppHeader />

      <main className="app-main">
        {stats && (
          <div className="stats-row stats-row-compact">
            <div className="stat-card">
              <div className="stat-label">Total de observações</div>
              <div className="stat-value">{stats.totalObservations}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Este mês</div>
              <div className="stat-value">{stats.observationsThisMonth}</div>
            </div>
          </div>
        )}

        <div className="toolbar">
          <h1>Minhas observações</h1>
          <div className="toolbar-filters">
            <input
              type="text"
              placeholder="Buscar por objeto (ex: Lua, Júpiter...)"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <div className="date-filter-group">
              <span>De</span>
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="date-filter-group">
              <span>Até</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            {(search || dateFrom || dateTo) && (
              <button
                type="button"
                className="btn-clear-filters"
                onClick={() => {
                  setSearch('');
                  setDateFrom('');
                  setDateTo('');
                  setPage(1);
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
          <button type="button" className="btn-primary-sm" onClick={() => { setEditing(null); setModalOpen(true); }}>
            + Nova observação
          </button>
        </div>

        {errorMsg && <div className="auth-alert">{errorMsg}</div>}

        {listQuery.isLoading ? (
          <p style={{ color: 'var(--ink-soft)' }}>Carregando…</p>
        ) : observations.length === 0 ? (
          <div className="empty-state">
            <h3>Nenhuma observação registrada ainda</h3>
            <p>Comece registrando o que você observou no céu hoje.</p>
            <button type="button" className="btn-primary-sm" style={{ marginTop: 16 }} onClick={() => setModalOpen(true)}>
              + Nova observação
            </button>
          </div>
        ) : (
          <>
            <div className="obs-grid">
              {observations.map((obs) => (
                <article className="obs-card" key={obs._id}>
                  {obs.photo?.url ? (
                    <img className="obs-photo" src={obs.photo.url} alt={obs.object} loading="lazy" />
                  ) : (
                    <div className="obs-photo-placeholder">Sem foto</div>
                  )}
                  <div className="obs-body">
                    <div className="obs-object">{obs.object}</div>
                    <div className="obs-date">{formatDate(obs.date)}</div>
                    <div className="obs-meta">
                      <span className={`obs-tag condition-${obs.conditions}`}>{obs.conditions}</span>
                      <span className="obs-tag">{obs.equipment}</span>
                      {obs.location?.name && <span className="obs-tag">{obs.location.name}</span>}
                    </div>
                    {obs.notes && <p className="obs-notes">{obs.notes}</p>}
                    <div className="obs-actions">
                      <button type="button" className="edit-btn" onClick={() => { setEditing(obs); setModalOpen(true); }}>
                        Editar
                      </button>
                      <button type="button" className="delete-btn" onClick={() => handleDelete(obs)}>
                        Excluir
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  ‹
                </button>
                {pageButtons.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={p === page ? 'active' : ''}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {modalOpen && (
        <ObservationFormModal
          initial={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}
