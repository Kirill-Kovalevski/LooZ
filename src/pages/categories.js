// src/pages/categories.js
// Categories page: mounts into #viewRoot (same as day/week/month pages)

const ICONS = {
  solo:      '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.97 0-9 2.239-9 5v2h18v-2c0-2.761-4.03-5-9-5Z"/></svg>',
  couple:    '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 10a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm10 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM2 19v2h10v-2c0-2.21-3.134-4-7-4s-7 1.79-7 4Zm12 0v2h8v-2c0-2-2.686-3.5-6-3.5S14 17 14 19Z" transform="translate(2 -1)"/></svg>',
  friends:   '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 10a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm12 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-6 2c-3.314 0-6 1.79-6 4v2h6v-2c0-1.508.755-2.846 1.986-3.79C7.198 14.418 6.623 14 6 14Zm12 0c-.623 0-1.198.418-1.986 1.21C16.245 16.154 17 17.492 17 19v2h6v-2c0-2.21-2.686-4-6-4Zm-6 0c3.866 0 7 1.79 7 4v2H5v-2c0-2.21 3.134-4 7-4Z"/></svg>',
  family:    '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 10a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm10 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3ZM4 20v2h8v-2c0-2.21-2.686-4-6-4s-6 1.79-6 4Zm12 0v2h8v-2c0-2.21-2.686-4-6-4s-6 1.79-6 4Z"/></svg>',
  chores:    '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v4H4zM7 10h10v10H7z"/></svg>',
  sport:     '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M13 5a2 2 0 1 1 2 2l-1.3 3.25 3.18 2.2A2 2 0 0 1 18 14.5V19h-2v-3.93l-3.2-2.2-1.3 3.28L9 16l1.7-4.28L9 10V8l3 .5z"/></svg>',
  food:      '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 2v11a3 3 0 1 0 2 0V2H7Zm8 0v8h-2v10h2V13h2V2h-2Z"/></svg>',
  culture:   '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M2 10l10-6 10 6-10 6-10-6Zm0 4 10 6 10-6v4l-10 6L2 18v-4Z"/></svg>',
  learn:     '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 3l10 5-10 5L2 8l10-5Zm-7 9v5ל7 4 7-4v-5l-7 4-7-4Z"/></svg>',
  relax:     '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 12h16v8H4zM9 4h6l1 6H8z"/></svg>',
  create:    '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm14.71-9.04a1 1 0 0 0 0-1.41l-1.5-1.5a1 1 0 0 0-1.41 0l-1.13 1.13 3.75 3.75 1.29-1.47Z"/></svg>',
  indoor:    '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 10l8-6 8 6v10H4V10Zm10 6h4v-6H6v6h4v-4h4v4Z"/></svg>',
  outdoor:   '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2l4 8H8l4-8Zm0 9l8 11H4L12 11Z"/></svg>',
  beach:     '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M2 20h20v2H2zM12 2a6 6 0 0 0-6 6h12a6 6 0 0 0-6-6Zm-8 8h16v2H4z"/></svg>',
  park:      '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2l5 9h-3l4 7H6l4-7H7l5-9Z"/></svg>',
  city:      '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 21h18v-2H3v2Zm2-4h5V4H5v13Zm9 0h5V8h-5v9Z"/></svg>',
  morning:   '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 4l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4l2-4Z"/></svg>',
  afternoon: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 6a6 6 0 1 1-6 6 6 6 0 0 1 6-6Zm1 1h-2v5l4 2 1-1-3-1V7Z"/></svg>',
  evening:   '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 12a9 9 0 1 0 9-9 7 7 0 0 1-9 9Z"/></svg>',
  night:     '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M20 12a8 8 0 1 1-8-8 6 6 0 1 0 8 8Z"/></svg>',
  spring:    '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2c3 2 4 6 0 10-4-4-3-8 0-10Zm-3 12c3 0 5 2 5 5H4c0-3 2-5 5-5Z"/></svg>',
  summer:    '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 4l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4Z"/></svg>',
  autumn:    '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 3c-5 0-8 4-8 9H4l7 7c0-5 4-8 9-8V3Z"/></svg>',
  winter:    '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M11 2h2v6l3-3 1 1-3 3h6v2h-6l3 3-1 1-3-3v6h-2v-6l-3 3-1-1 3-3H2v-2h6L5 6l1-1 3 3V2Z"/></svg>',
  tasks:     '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v3H4zM4 10h16v3H4zM4 16h16v3H4z"/></svg>',
};

const FILTER_GROUPS = [
  { id:'who', title:'עם מי?', items:[
    { id:'solo',    label:'לבד',   icon:'solo' },
    { id:'couple',  label:'זוג',   icon:'couple' },
    { id:'friends', label:'חבר׳ה', icon:'friends' },
    { id:'family',  label:'משפחה', icon:'family' },
  ]},
  { id:'type', title:'סוג פעילות', items:[
    { id:'sport',  label:'ספורט',  icon:'sport'  },
    { id:'food',   label:'אוכל',   icon:'food'   },
    { id:'culture',label:'תרבות',  icon:'culture'},
    { id:'learn',  label:'למידה',  icon:'learn'  },
    { id:'relax',  label:'רילקס',  icon:'relax'  },
    { id:'create', label:'יצירה',  icon:'create' },
    { id:'chores', label:'משימות', icon:'chores' },
    { id:'tasks',  label:'To-Do',  icon:'tasks'  },
  ]},
  { id:'when', title:'מתי?', items:[
    { id:'morning',   label:'בוקר',   icon:'morning'   },
    { id:'afternoon', label:'צהריים', icon:'afternoon' },
    { id:'evening',   label:'ערב',    icon:'evening'   },
    { id:'night',     label:'לילה',   icon:'night'     },
  ]},
  { id:'season', title:'עונה', items:[
    { id:'spring', label:'אביב', icon:'spring' },
    { id:'summer', label:'קיץ',  icon:'summer' },
    { id:'autumn', label:'סתיו', icon:'autumn' },
    { id:'winter', label:'חורף', icon:'winter' },
  ]},
  { id:'where', title:'איפה?', items:[
    { id:'indoor',  label:'בבית', icon:'indoor'  },
    { id:'outdoor', label:'בחוץ', icon:'outdoor' },
    { id:'beach',   label:'חוף',  icon:'beach'   },
    { id:'park',    label:'פארק', icon:'park'    },
    { id:'city',    label:'עיר',  icon:'city'    },
  ]},
];

const ACTIVITIES = [
  { id:'a01', title:'ריצת 5K בטיילת', desc:'מסלול קליל עם מוזיקה טובה.', tags:['solo','sport','outdoor','evening','summer','city'] },
  { id:'a02', title:'מדיטציה מודרכת', desc:'10–15 דקות נשימה עמוקה.', tags:['solo','relax','indoor','morning','winter'] },
  { id:'a03', title:'קורס קצר ב-JS',  desc:'שיעור אחד ב-freeCodeCamp/MDN.', tags:['solo','learn','indoor','evening'] },
  { id:'a04', title:'סידור משימות לשבוע', desc:'קפה + לוח משימות.', tags:['solo','tasks','chores','indoor','morning'] },
  { id:'a11', title:'פיקניק שקיעה',   desc:'גבינות, רוזה, שמיכה רכה.', tags:['couple','food','outdoor','evening','spring','park'] },
  { id:'a12', title:'דייט ציור בזוג',  desc:'אקריליק על קנווס.', tags:['couple','create','indoor','evening','winter'] },
  { id:'a13', title:'שיעור סלסה',      desc:'חוג מתחילים בעיר.', tags:['couple','sport','culture','city','evening'] },
  { id:'a21', title:'אליאס / קלפים',  desc:'חבר׳ה, חטיפים וצחוקים.', tags:['friends','culture','indoor','evening'] },
  { id:'a22', title:'טורניר פוטסאל',  desc:'5×5 במגרש שכונתי.', tags:['friends','sport','outdoor','afternoon','summer','city'] },
  { id:'a23', title:'סשן צילום בחוף', desc:'תמונות זהב לשקיעה.', tags:['friends','create','outdoor','beach','evening','summer'] },
  { id:'a31', title:'טיול יער קצר',    desc:'מסלול מעגלי ומשחקים.', tags:['family','outdoor','park','morning','spring'] },
  { id:'a32', title:'אפיית פיצה',      desc:'כל אחד בוחר טופינג.', tags:['family','food','create','indoor','evening'] },
  { id:'a33', title:'מוזיאון ילדים',   desc:'למידה אינטראקטיבית.', tags:['family','culture','learn','city','afternoon'] },
];

// PUBLIC: mount like other pages
export function mount(app){
  document.body.setAttribute('data-view','categories');

  const viewRoot =
    (app && app.querySelector?.('#viewRoot')) ||
    document.getElementById('viewRoot') ||
    app || document.body;

  viewRoot.innerHTML = `
    <section class="p-categories">
      <header class="cat-head">
        <h1>קטגוריות</h1>
        <p class="sub">בחרו קטגוריות — נקפיץ רעיונות שמתאימים לכם עכשיו</p>
      </header>
      <div class="cat-filters" dir="rtl"></div>
      <div class="cat-actions">
        <button class="cat-clear" type="button" aria-label="איפוס">איפוס</button>
        <div class="cat-count" aria-live="polite"></div>
      </div>
      <div class="cat-results" role="list"></div>
    </section>
  `;

  buildFilters(viewRoot.querySelector('.cat-filters'));

  const state = { selected: new Set() };

  const onToggle = (id, el) => {
    if (state.selected.has(id)) { state.selected.delete(id); el.classList.remove('is-on'); }
    else { state.selected.add(id); el.classList.add('is-on'); }
    renderResults(state, viewRoot);
  };

  viewRoot.querySelectorAll('.chip').forEach(chip=>{
    chip.addEventListener('click', ()=> onToggle(chip.dataset.id, chip));
  });
  viewRoot.querySelector('.cat-clear')?.addEventListener('click', ()=>{
    state.selected.clear();
    viewRoot.querySelectorAll('.chip.is-on').forEach(c=>c.classList.remove('is-on'));
    renderResults(state, viewRoot);
  });

  renderResults(state, viewRoot);
}

function buildFilters(host){
  host.innerHTML = '';
  FILTER_GROUPS.forEach(group=>{
    const sec = document.createElement('section');
    sec.className = 'filter-sec';
    sec.innerHTML = `<h2 class="sec-title">${group.title}</h2><div class="chip-grid" role="group"></div>`;
    const grid = sec.querySelector('.chip-grid');
    group.items.forEach(it=>{
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.type = 'button';
      chip.dataset.id = it.id;
      chip.innerHTML = `<span class="chip-ic">${ICONS[it.icon]||''}</span><span class="chip-tx">${it.label}</span>`;
      grid.appendChild(chip);
    });
    host.appendChild(sec);
  });
}

function renderResults(state, root){
  const box   = root.querySelector('.cat-results');
  const count = root.querySelector('.cat-count');
  const want  = [...state.selected];

  let list = ACTIVITIES;
  if (want.length) list = ACTIVITIES.filter(a => want.every(t => a.tags.includes(t)));

  count.textContent = want.length ? `נמצאו ${list.length} תוצאות` : `הצעות פופולריות (בחר/י קטגוריות לסינון)`;

  box.innerHTML = list.length ? '' : `<div class="cat-empty">לא נמצאו תוצאות. נסו להסיר חלק מהמסננים.</div>`;
  list.forEach(a=>{
    const card = document.createElement('article');
    card.className = 'res-card';
    card.setAttribute('role','listitem');
    card.innerHTML = `
      <div class="res-title">${a.title}</div>
      <div class="res-desc">${a.desc}</div>
      <div class="res-tags">${a.tags.slice(0,4).map(t=>`<span class="tag">${labelFor(t)}</span>`).join('')}</div>
    `;
    card.addEventListener('click', ()=> alert('בקרוב: פתיחת כרטיס פעילות/יצירת אירוע'));
    box.appendChild(card);
  });
}

function labelFor(id){
  for (const g of FILTER_GROUPS) {
    const f = g.items.find(i=>i.id===id);
    if (f) return f.label;
  }
  return id;
}
