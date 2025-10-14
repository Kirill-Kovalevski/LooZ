// Builds the header markup and attaches event handlers once mounted
export function renderHeader(){
  return `
    <header class="o-header" id="appHeader">
      <button class="c-topbtn" id="btnProfile" aria-label="פרופיל">👤</button>

      <a href="#/home" class="looz-logo" aria-label="LooZ">
        <svg class="looz-mark" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
          <circle cx="32" cy="32" r="28" fill="url(#g)"/>
          <defs><radialGradient id="g" cx=".38" cy=".26" r="1.1">
            <stop offset=".0" stop-color="#fff9ed"/><stop offset=".58" stop-color="#ffe9b7"/>
            <stop offset="1" stop-color="#e8b861"/>
          </radialGradient></defs>
        </svg>
      </a>

      <button class="c-topbtn" id="btnMenu" aria-label="הגדרות">⚙️</button>

      <!-- Lemon trigger row -->
      <button id="lemonToggle" class="c-icon-btn--lemon" aria-expanded="false" aria-controls="appNav">
        <svg class="lemon-svg" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3c4.5 0 9 4.5 9 9s-4.5 9-9 9-9-4.5-9-9 4.5-9 9-9z"/>
        </svg>
      </button>

      <!-- Collapsible Search/Nav panel -->
      <nav id="appNav" class="c-nav u-is-collapsed">
        <div class="c-nav__panel">
          <div class="c-nav__row">
            <button class="c-icon-btn c-nav-arrow" data-nav="prev" aria-label="חזרה">◀</button>

            <div class="c-search">
              <input class="c-search__input" type="search" placeholder="חפש משימה, קטגוריה…" />
              <button class="c-search__clear" aria-label="נקה">×</button>
              <button class="c-search__go" aria-label="חפש">↵</button>
            </div>

            <button class="c-icon-btn c-nav-arrow" data-nav="next" aria-label="קדימה">▶</button>
          </div>

          <div class="sug-wrap">
            <div class="sug-head">קטגוריות</div>
            <div class="sug-list">
              <div class="sug-item">
                <p class="sug-title">עבודה</p>
                <div class="sug-row">
                  <span class="sug-tag">פגישות</span>
                  <span class="sug-tag">משימות</span>
                </div>
                <div class="sug-actions">
                  <button class="sug-btn sug-btn--primary">בחר</button>
                  <button class="sug-btn">שמור</button>
                </div>
              </div>
              <!-- add more items as you like -->
            </div>
          </div>

          <div class="c-nav__icons">
            <button class="c-icon c-icon--left" aria-label="טוויטר">🜃</button>
            <button class="c-icon c-icon--right" aria-label="אינסטגרם">🜁</button>
          </div>
        </div>
      </nav>
    </header>
  `;
}

// attach handlers AFTER you inject the header HTML
export function initHeaderInteractions(){
  const lemon = document.getElementById('lemonToggle');
  const nav   = document.getElementById('appNav');
  if (!lemon || !nav) return;

  lemon.addEventListener('click', ()=>{
    const open = nav.classList.toggle('u-is-collapsed');
    lemon.setAttribute('aria-expanded', String(!open));
    // open/close animated panel
    nav.classList.toggle('is-open', !open);
    if (!open) nav.querySelector('.c-search__input')?.focus();
  });

  // clear search
  nav.querySelector('.c-search__clear')?.addEventListener('click', ()=>{
    const inp = nav.querySelector('.c-search__input');
    if (inp){ inp.value=''; inp.focus(); }
  });
}
