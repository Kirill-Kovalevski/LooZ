// src/components/category.js
// We transform the RIGHT side "…" button inside the search capsule into the green Categories button.
// This guarantees perfect alignment because we reuse the same slot.

const CAT_SVG = `
<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
  <g fill="currentColor">
    <circle cx="5"  cy="5"  r="2"></circle>
    <circle cx="12" cy="5"  r="2"></circle>
    <circle cx="19" cy="5"  r="2"></circle>
    <circle cx="5"  cy="12" r="2"></circle>
    <circle cx="12" cy="12" r="2"></circle>
    <circle cx="19" cy="12" r="2"></circle>
    <circle cx="5"  cy="19" r="2"></circle>
    <circle cx="12" cy="19" r="2"></circle>
    <circle cx="19" cy="19" r="2"></circle>
  </g>
</svg>
`;

function findHost(root=document){
  // your search capsule wrapper
  return root.querySelector('#quickDock[data-role="searchbar"]')
      || root.querySelector('.p-searchbar, .c-search, .searchbar');
}

export function mountCategoryButton(root=document){
  const host = findHost(root);
  if (!host) return;

  // Prefer the RIGHT side slot so position matches the original "…" button.
  let sideRight = host.querySelector('.c-dock__side.c-dock__right');

  // If we’ve already converted it, stop.
  if (sideRight && sideRight.classList.contains('cat-btn')) return;

  // If the slot exists — convert it in place (keeps alignment, spacing, shadows, etc.)
  if (sideRight) {
    sideRight.classList.add('cat-btn');
    sideRight.setAttribute('aria-label','קטגוריות');
    sideRight.setAttribute('title','קטגוריות');
    sideRight.innerHTML = `<span class="cat-ic">${CAT_SVG}</span>`;
  } else {
    // Fallback: append a new button inside the host (in case markup changed)
    const btn = document.createElement('button');
    btn.className = 'c-dock__side cat-btn';
    btn.setAttribute('aria-label','קטגוריות');
    btn.setAttribute('title','קטגוריות');
    btn.innerHTML = `<span class="cat-ic">${CAT_SVG}</span>`;
    host.appendChild(btn);
    sideRight = btn;
  }

  sideRight.addEventListener('click', () => {
    if (window.location.hash !== '#/categories') {
      window.location.hash = '#/categories';
    } else {
      window.dispatchEvent(new Event('hashchange'));
    }
  });
}
