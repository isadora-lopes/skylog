import { useQuery } from '@tanstack/react-query';
import AppHeader from '../components/AppHeader';
import MonthlyChart from '../components/MonthlyChart';
import * as obsService from '../services/observationService';
import { getApiErrorMessage } from '../utils/errors';
import '../styles/observations.css';
import '../styles/dashboard.css';

const CONDITION_ORDER = ['Excelente', 'Bom', 'Regular', 'Ruim'];

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['observations-stats'],
    queryFn: () => obsService.getStats(),
  });

  const stats = data?.stats;
  const chart = data?.chart ?? null;
  const errorMsg = isError ? getApiErrorMessage(error, 'Erro ao carregar o dashboard.') : '';

  return (
    <div className="app-shell">
      <AppHeader />

      <main className="app-main">
        <div className="toolbar">
          <h1>Dashboard</h1>
        </div>
        <p style={{ color: 'var(--ink-soft)', marginTop: -10, marginBottom: 24, fontSize: '0.9rem' }}>
          Visão geral das suas observações, equipamentos e condições do céu.
        </p>

        {errorMsg && <div className="auth-alert">{errorMsg}</div>}

        {isLoading ? (
          <p style={{ color: 'var(--ink-soft)' }}>Carregando…</p>
        ) : (
          <>
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-label">Total de observações</div>
                <div className="stat-value">{stats?.totalObservations ?? 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Objetos únicos</div>
                <div className="stat-value">{stats?.uniqueObjects ?? 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Este mês</div>
                <div className="stat-value">{stats?.observationsThisMonth ?? 0}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Equipamento + usado</div>
                <div className="stat-value" style={{ fontSize: '1.05rem' }}>
                  {stats?.topEquipment?.[0]?.name || '—'}
                </div>
              </div>
            </div>

            <div className="monthly-chart-card">
              <h2 className="chart-title">Sessões por mês</h2>
              <p className="chart-sub">Observações registradas nos últimos 6 meses</p>
              <MonthlyChart chart={chart} months={6} />
            </div>

            <div className="dashboard-grid">
              <EquipmentRanking topEquipment={stats?.topEquipment} />
              <ConditionsBreakdown conditionsBreakdown={stats?.conditionsBreakdown} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function EquipmentRanking({ topEquipment }: { topEquipment?: { name: string; count: number }[] }) {
  const hasData = (topEquipment?.length ?? 0) > 0;
  return (
    <div className="dashboard-card">
      <h2 className="chart-title">Equipamentos mais usados</h2>
      <p className="chart-sub">Ranking pelas suas observações registradas</p>
      {hasData ? (
        <ul className="ranking-list">
          {topEquipment!.map((item, index) => (
            <li key={item.name} className="ranking-item">
              <span className="ranking-position">{index + 1}</span>
              <span className="ranking-name">{item.name}</span>
              <span className="ranking-count">{item.count}x</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="dashboard-empty">Nenhum equipamento registrado ainda.</p>
      )}
    </div>
  );
}

function ConditionsBreakdown({
  conditionsBreakdown,
}: {
  conditionsBreakdown?: { name: string; count: number }[];
}) {
  const hasData = (conditionsBreakdown?.length ?? 0) > 0;
  const total = conditionsBreakdown?.reduce((sum, c) => sum + c.count, 0) || 0;
  const ordered = CONDITION_ORDER.map((name) => conditionsBreakdown?.find((c) => c.name === name)).filter(
    Boolean,
  ) as { name: string; count: number }[];

  return (
    <div className="dashboard-card">
      <h2 className="chart-title">Condições do céu</h2>
      <p className="chart-sub">Distribuição das condições nas suas observações</p>
      {hasData ? (
        <div className="conditions-bars">
          {ordered.map((item) => {
            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <div className="condition-row" key={item.name}>
                <span className="condition-label">{item.name}</span>
                <div className="condition-track">
                  <div className={`condition-fill condition-fill-${item.name}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="condition-count">
                  {item.count} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="dashboard-empty">Nenhuma observação registrada ainda.</p>
      )}
    </div>
  );
}
