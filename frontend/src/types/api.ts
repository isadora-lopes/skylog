export interface UserStats {
  totalObservations: number;
  lastObservation: string | null;
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  stats: UserStats;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: PublicUser;
}

export interface ObservationPhoto {
  url: string | null;
  filename: string | null;
}

export interface ObservationLocation {
  name: string;
  lat: number | null;
  lon: number | null;
}

export interface Observation {
  id: number;
  _id: number;
  object: string;
  date: string;
  equipment: string;
  conditions: string;
  location: ObservationLocation;
  notes: string;
  photo: ObservationPhoto;
}

export interface StatsPayload {
  totalObservations: number;
  uniqueObjects: number;
  observationsThisMonth: number;
  topEquipment: { name: string; count: number }[];
  conditionsBreakdown: { name: string; count: number }[];
}

export interface ChartPoint {
  _id: { year: number; month: number };
  count: number;
}

export interface SkyNightSummaryBlock {
  avgCloudCover: number | null;
  minCloudCover: number | null;
  maxCloudCover: number | null;
  maxPrecipProbability: number | null;
  skyQuality?: string | null;
  weatherCode?: number | null;
  weatherLabel?: string | null;
  hasFog?: boolean;
  hasRain?: boolean;
  hasStorm?: boolean;
}

export interface SkyDailyForecastDay {
  date: string;
  weatherCode: number | null;
  weatherLabel: string | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  precipitationProbability: number | null;
  precipitationSum: number | null;
  windSpeedMax: number | null;
  cloudCoverMean: number | null;
  isFog?: boolean;
  isRain?: boolean;
  isStorm?: boolean;
}

export interface NightSkySummary {
  available: boolean;
  error?: string;
  summary?: SkyNightSummaryBlock;
  daily?: SkyDailyForecastDay[];
}

export interface WeeklyBodyNight {
  date: string;
  visible: boolean;
  bestTime?: string;
  maxElevation?: number | null;
  azimuth?: number | null;
  magnitude?: number | null;
}

export interface WeeklyBody {
  name: string;
  visible: boolean;
  error?: string | null;
  bestNight?: WeeklyBodyNight | null;
  visibleNightsCount?: number;
  nights?: WeeklyBodyNight[];
  alreadyObserved?: boolean;
  timesObserved?: number;
}

export interface WeeklySuggestionsResponse {
  success: boolean;
  query: { lat: number; lon: number; startDate: string; days: number };
  bodies: WeeklyBody[];
  recommended: string[];
  sky: NightSkySummary;
  historySummary?: { totalObservedObjects: number };
}
