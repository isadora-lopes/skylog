import type { ChartPoint } from '../types/api';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function buildMonthRange(months: number) {
  const result: { year: number; month: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return result;
}

export default function MonthlyChart({ chart, months = 6 }: { chart: ChartPoint[] | null; months?: number }) {
  const range = buildMonthRange(months);
  const countByKey = new Map(
    (chart || []).map((entry) => [`${entry._id.year}-${entry._id.month}`, entry.count]),
  );

  const bars = range.map(({ year, month }) => ({
    year,
    month,
    label: MONTH_LABELS[month - 1],
    count: countByKey.get(`${year}-${month}`) || 0,
  }));

  const maxCount = Math.max(1, ...bars.map((b) => b.count));
  const hasAnyData = bars.some((b) => b.count > 0);

  if (!hasAnyData) {
    return (
      <div className="monthly-chart-empty">
        Sem observações registradas nos últimos {months} meses.
      </div>
    );
  }

  return (
    <div className="monthly-chart">
      {bars.map((bar) => {
        const heightPct = (bar.count / maxCount) * 100;
        return (
          <div className="monthly-chart-col" key={`${bar.year}-${bar.month}`}>
            <span className="monthly-chart-count">{bar.count > 0 ? bar.count : ''}</span>
            <div className="monthly-chart-track">
              <div
                className="monthly-chart-bar"
                style={{ height: `${Math.max(heightPct, bar.count > 0 ? 6 : 0)}%` }}
              />
            </div>
            <span className="monthly-chart-label">{bar.label}</span>
          </div>
        );
      })}
    </div>
  );
}
