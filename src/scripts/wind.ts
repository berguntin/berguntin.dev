// Viento actual en la ría de A Coruña desde Open-Meteo, con un valor de referencia si no hay conexión.

export interface Wind {
  direction: number; // grados, de donde sopla
  speed: number; // nudos
  gusts: number; // nudos
  time: string | null; // hora local de la lectura, null si es el valor de referencia
}

const RIA = { latitude: 43.39, longitude: -8.37 };
const CACHE_KEY = 'wind:ria-coruna';
const CACHE_MS = 10 * 60 * 1000;
export const REFERENCE_WIND: Wind = { direction: 45, speed: 12, gusts: 17, time: null };

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
export const compassPoint = (deg: number) => POINTS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
export const localName = (deg: number) => (deg >= 22.5 && deg < 67.5 ? 'nordés' : null);

export async function fetchWind(): Promise<Wind> {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null');
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.wind;
  } catch {}

  const params = new URLSearchParams({
    latitude: String(RIA.latitude),
    longitude: String(RIA.longitude),
    current: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    wind_speed_unit: 'kn',
    timezone: 'Europe/Madrid',
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Open Meteo ${response.status}`);
    const { current } = await response.json();
    const wind: Wind = {
      direction: current.wind_direction_10m,
      speed: Math.round(current.wind_speed_10m),
      gusts: Math.round(current.wind_gusts_10m),
      time: String(current.time).slice(11, 16),
    };
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), wind }));
    } catch {}
    return wind;
  } finally {
    clearTimeout(timeout);
  }
}
