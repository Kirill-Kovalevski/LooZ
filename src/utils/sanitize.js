// /src/utils/sanitize.js
// Lightweight escaping & helpers to keep DOM output safe.

export function escapeHTML(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Cache-busting for image URLs
export function bust(url) {
  try {
    const u = new URL(url, location.origin);
    u.searchParams.set('ts', Date.now().toString());
    return u.toString();
  } catch {
    return url + (url.includes('?') ? '&' : '?') + 'ts=' + Date.now();
  }
}

// Safe CSS url() — only allow http(s)/data blob
export function cssUrlSafe(url='') {
  if (!/^data:|^blob:|^https?:/i.test(url)) return '';
  // Basic escape: wrap in quotes to avoid ) breaks
  return `"${url.replaceAll('"','%22')}"`;
}
