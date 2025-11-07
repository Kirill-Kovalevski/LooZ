// /src/services/weather.service.js

const DEFAULT_LAT = 32.0853;
const DEFAULT_LON = 34.7818;

// map Open-Meteo weathercode to our "kind" strings
export function weatherCodeToKind(code, rainProb = 0) {
  if (code === 0) return 'sun';
  if (code === 1 || code === 2) return 'partly';
  if (code === 3) return 'cloud';
  if ([45, 48].includes(code)) return 'cloud';
  if ([51, 53, 55, 56, 57].includes(code)) return 'rain';
  if ([61, 63, 65, 66, 67].includes(code)) {
    return rainProb > 70 ? 'rain-heavy' : 'rain';
  }
  if ([71, 73, 75, 77].includes(code)) return 'snow';
  if ([80, 81, 82].includes(code)) return 'rain-heavy';
  if ([85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'thunder';
  return 'cloud';
}

// try to get browser geolocation; if fails, return defaults
function getPositionOrDefault() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: DEFAULT_LAT, longitude: DEFAULT_LON });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {
        resolve({ latitude: DEFAULT_LAT, longitude: DEFAULT_LON });
      },
      { enableHighAccuracy: false, timeout: 3000 }
    );
  });
}

// fetch daily weather (from OUR origin → /api/weather) and return object keyed by yyyy-mm-dd
export async function getDailyWeather() {
  const { latitude, longitude } = await getPositionOrDefault();

  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    timezone: 'auto'
  });

  // IMPORTANT: this is same-origin, so your CSP allows it
  const res = await fetch(`/api/weather?${params.toString()}`);
  if (!res.ok) {
    console.warn('[weather] bad response', res.status);
    throw new Error('weather fetch failed');
  }

  const data = await res.json();

  const days = data.daily?.time || [];
  const codes = data.daily?.weathercode || [];
  const temps = data.daily?.temperature_2m_max || [];
  const prob  = data.daily?.precipitation_probability_max || [];

  const byDate = {};
  for (let i = 0; i < days.length; i++) {
    byDate[days[i]] = {
      code: codes[i],
      tMax: temps[i],
      rainProb: prob[i]
    };
  }

  return byDate;
}
