import type { NightSkySummary, WeeklyBody, WeeklySuggestionsResponse } from '../../types/api';
import {
  formatDateLabel,
  formatDegrees,
  formatNightDate,
  formatShortDate,
  formatTime,
  formatWeekday,
  skyTone,
} from './suggestionFormatters';

interface Props {
  result: WeeklySuggestionsResponse;
}

export default function WeeklySuggestionsResults({ result }: Props) {
  const startDate = result.query.startDate;
  return (
    <>
      <TonightCard sky={result.sky} date={startDate} />
      <WeekStrip daily={result.sky?.daily} referenceDate={startDate} />
      <RecommendedBanner
        bodies={result.bodies}
        recommended={result.recommended}
        historySummary={result.historySummary}
      />
      <BodiesSection bodies={result.bodies} />
    </>
  );
}

function TonightCard({ sky, date }: { sky: NightSkySummary; date: string }) {
  if (!sky?.available) {
    return (
      <div className="sky-unavailable">
        Não foi possível obter a previsão do céu para essa data
        {sky?.error ? `: ${sky.error}` : '.'} A Open-Meteo fornece previsão apenas para os próximos dias.
      </div>
    );
  }

  const summary = sky.summary!;
  const {
    avgCloudCover,
    minCloudCover,
    maxCloudCover,
    maxPrecipProbability,
    weatherLabel,
    hasFog,
    hasRain,
    hasStorm,
  } = summary;
  const tone = skyTone(avgCloudCover, hasStorm, hasRain);

  return (
    <div className="tonight-card">
      <div className={`tonight-tone-badge tone-${tone}`}>{weatherLabel || 'Condição indisponível'}</div>
      <div className="tonight-details">
        <h3>Noite de {formatDateLabel(date)}</h3>
        <div className="tonight-stats">
          <span className="tonight-stat">Nuvens méd. {avgCloudCover}%</span>
          <span className="tonight-stat">
            mín. {minCloudCover}% / máx. {maxCloudCover}%
          </span>
          {maxPrecipProbability !== null && maxPrecipProbability !== undefined && (
            <span className="tonight-stat">Chance de chuva {maxPrecipProbability}%</span>
          )}
        </div>
        <div className="tonight-flags">
          {hasRain && <span className="tonight-flag flag-rain">Possibilidade de chuva</span>}
          {hasFog && <span className="tonight-flag flag-fog">Possibilidade de névoa</span>}
          {hasStorm && <span className="tonight-flag flag-storm">Possibilidade de tempestade</span>}
        </div>
      </div>
    </div>
  );
}

function WeekStrip({
  daily,
  referenceDate,
}: {
  daily?: NightSkySummary['daily'];
  referenceDate: string;
}) {
  if (!daily?.length) return null;

  return (
    <>
      <div className="bodies-section-title">
        <h2>Previsão dos próximos dias</h2>
      </div>
      <div className="week-strip">
        {daily.map((day) => {
          const isToday = day.date === referenceDate;
          const tone = skyTone(day.cloudCoverMean, day.isStorm, day.isRain);
          return (
            <div key={day.date} className={`week-day-card tone-${tone} ${isToday ? 'is-today' : ''}`}>
              <span className="week-day-name">{formatWeekday(day.date, isToday)}</span>
              <span className="week-day-date">{formatShortDate(day.date)}</span>
              <span className="week-day-temps">
                {day.temperatureMax !== null ? Math.round(day.temperatureMax) : '—'}°
                <span className="temp-min">
                  {day.temperatureMin !== null ? Math.round(day.temperatureMin) : '—'}°
                </span>
              </span>
              {day.precipitationProbability !== null && (
                <span className="week-day-precip">{day.precipitationProbability}% chuva</span>
              )}
              <span className="week-day-label">{day.weatherLabel}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function RecommendedBanner({
  bodies,
  recommended,
  historySummary,
}: {
  bodies: WeeklyBody[];
  recommended: string[];
  historySummary?: { totalObservedObjects: number };
}) {
  if (!recommended?.length) return null;

  const recommendedBodies = recommended
    .map((name) => bodies.find((b) => b.name === name))
    .filter((b): b is WeeklyBody => Boolean(b));

  return (
    <div className="recommended-banner">
      <div className="recommended-banner-title">
        Destaques da semana
        {historySummary && (
          <span className="recommended-banner-sub">
            Com base nos {historySummary.totalObservedObjects} objetos que você já observou
          </span>
        )}
      </div>
      <div className="recommended-list">
        {recommendedBodies.map((body) => (
          <div key={body.name} className="recommended-item">
            <span className="recommended-name">{body.name}</span>
            <span className={`recommended-tag ${body.alreadyObserved ? 'seen' : 'new'}`}>
              {body.alreadyObserved ? 'Já observado' : 'Novo para você'}
            </span>
            {body.bestNight && (
              <span className="recommended-night">
                Melhor noite: {formatNightDate(body.bestNight.date)} às {formatTime(body.bestNight.bestTime)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BodiesSection({ bodies }: { bodies: WeeklyBody[] }) {
  if (!bodies?.length) {
    return <p style={{ color: 'var(--ink-soft)' }}>Nenhum dado de visibilidade disponível.</p>;
  }

  const visibleCount = bodies.filter((b) => b.visible).length;

  return (
    <>
      <div className="bodies-section-title">
        <h2>Astros da semana</h2>
        <span className="count-tag">
          {visibleCount} de {bodies.length} visíveis em algum momento
        </span>
      </div>
      <div className="bodies-grid">
        {bodies.map((body) => (
          <BodyCard key={body.name} body={body} />
        ))}
      </div>
    </>
  );
}

function BodyCard({ body }: { body: WeeklyBody }) {
  return (
    <div className={`body-card ${body.visible ? '' : 'not-visible'}`}>
      <div className="body-card-top">
        <span className="body-name">{body.name}</span>
        <span className={`visibility-badge ${body.visible ? 'visible' : 'hidden'}`}>
          {body.visible ? 'Visível' : 'Não visível'}
        </span>
      </div>

      <div className="body-history-tag">
        {body.alreadyObserved ? (
          <span className="history-tag seen">Você já observou {body.timesObserved}x</span>
        ) : (
          <span className="history-tag new">Novo para você</span>
        )}
      </div>

      {body.error ? (
        <p className="body-card-error">{body.error}</p>
      ) : body.bestNight ? (
        <>
          <div className="body-detail-row">
            <span>Melhor noite</span>
            <span>{formatNightDate(body.bestNight.date)}</span>
          </div>
          <div className="body-detail-row">
            <span>Melhor horário</span>
            <span>{formatTime(body.bestNight.bestTime)}</span>
          </div>
          <div className="body-detail-row">
            <span>Elevação máx.</span>
            <span>{formatDegrees(body.bestNight.maxElevation)}</span>
          </div>
          <div className="body-detail-row">
            <span>Azimute</span>
            <span>{formatDegrees(body.bestNight.azimuth)}</span>
          </div>
          {body.bestNight.magnitude !== null && body.bestNight.magnitude !== undefined && (
            <div className="body-detail-row">
              <span>Magnitude</span>
              <span>{body.bestNight.magnitude}</span>
            </div>
          )}
          <div className="body-detail-row">
            <span>Noites visíveis</span>
            <span>{body.visibleNightsCount ?? 0} de 7</span>
          </div>
        </>
      ) : (
        <p className="body-card-error">Sem janela de visibilidade nesta semana.</p>
      )}
    </div>
  );
}
