// /src/services/weather.service.js
// Fetch daily weather through Vite proxy and map it to small icon names.

const DEFAULT_COORDS = {
  lat: 32.0853,  // Tel Aviv – change to user city if you want
  lon: 34.7818,
};

export async function getDailyWeather({ lat, lon } = DEFAULT_COORDS) {
  const params =
    `?latitude=${lat}&longitude=${lon}` +
    `&daily=weathercode,precipitation_probability_max,temperature_2m_max,temperature_2m_min` +
    `&timezone=auto`;

  // hits Vite proxy → https://api.open-meteo.com/v1/forecast
  const res = await fetch(`/api/weather${params}`);
  if (!res.ok) {
    console.warn('[weather] bad response', res.status, res.statusText);
    throw new Error('weather fetch failed');
  }

  const data = await res.json();
  // 👇 this will tell us in the console what dates we actually got
  console.log('[weather] received daily data:', data?.daily);

  const dates = data?.daily?.time || [];
  const codes = data?.daily?.weathercode || [];
  const rain  = data?.daily?.precipitation_probability_max || [];
  const tMax  = data?.daily?.temperature_2m_max || [];
  const tMin  = data?.daily?.temperature_2m_min || [];

  const map = {};
  for (let i = 0; i < dates.length; i++) {
    map[dates[i]] = {
      code: codes[i],
      rainProb: rain[i],
      tMax: tMax[i],
      tMin: tMin[i],
    };
  }

  console.log('[weather] mapped dates → icons:', map);
  return map;
}

// map Open-Meteo codes to our icon names used in month.js
export function weatherCodeToKind(code, rainProb = 0) {
  if (code === 0) return 'sun';               // clear
  if (code === 1 || code === 2) return 'partly'; // mostly clear
  if (code === 3) return 'cloud';             // overcast

  // drizzle / light rain
  if (code >= 51 && code <= 57) return 'rain';

  // rain
  if (code >= 61 && code <= 65) {
    return rainProb > 60 ? 'rain-heavy' : 'rain';
  }

  // freezing rain / sleet
  if (code >= 66 && code <= 67) return 'sleet';

  // snow
  if (code >= 71 && code <= 77) return 'snow';

  // rain showers
  if (code >= 80 && code <= 82) return 'rain';

  // thunderstorms
  if (code >= 95) return 'thunder';

  // fallback
  return 'cloud';
}
