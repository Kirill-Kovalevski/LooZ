(function () {
  const form     = document.getElementById('catForm');
  const summary  = document.getElementById('catSummary');
  const clearBtn = document.getElementById('clearCats');
  const tagsBar  = document.getElementById('pickedTags');
  const results  = document.getElementById('results');

  // Quick pills (no-op demo toggles; you can wire them to real logic later)
  document.querySelectorAll('.pill').forEach(p=>{
    p.addEventListener('click', ()=> p.classList.toggle('is-on'));
  });

  // Demo activities (swap with backend later)
  let ACTIVITIES = [
    {
      id:'ride-yafo', title:'רכיבת שקיעה בטיילת יפו', img:'assets/demo/yafo.jpg',
      facets:{ timeOfDay:['ערב'], location:['בחוץ','בעיר'], mood:['ספורטיבי','רומנטי'], weather:['שמשי','מעונן'], people:['זוג','חברים'], season:['קיץ','אביב'] },
      meta:'זמן: 1–2 ש׳ · תקציב: חינם · מקום: תל-אביב'
    },
    {
      id:'museum', title:'מוזיאון ואספרסו', img:'assets/demo/museum.jpg',
      facets:{ timeOfDay:['בוקר','צהריים'], location:['בעיר','בבית','בפנים'], mood:['תרבותי','רגוע'], weather:['גשום','קריר','מעונן'], people:['לבד','זוג','חברים'] },
      meta:'זמן: 1–3 ש׳ · תקציב: ₪ · מקום: קרוב אליך'
    },
    {
      id:'wadi', title:'נחל קצר עם פיקניק', img:'assets/demo/wadi.jpg',
      facets:{ timeOfDay:['אחה״צ','בוקר'], location:['בטבע'], mood:['טבע','חברתי'], weather:['שמשי'], people:['משפחה','חברים','קבוצה'] },
      meta:'זמן: 2–4 ש׳ · תקציב: נמוך · איזור ההר'
    }
  ];

  // Equal-height selectable chips
  form.querySelectorAll('.chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      chip.classList.toggle('is-on');
      renderTags();
      updateSummary();
    });
  });

  clearBtn.addEventListener('click', ()=>{
    form.querySelectorAll('.chip.is-on').forEach(c=>c.classList.remove('is-on'));
    renderTags(); updateSummary(); results.innerHTML = '';
  });

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    // skeletons
    results.innerHTML = `
      <div class="r-card"><div class="r-img skel"></div><div class="skel" style="height:20px;border-radius:10px"></div></div>
      <div class="r-card"><div class="r-img skel"></div><div class="skel" style="height:20px;border-radius:10px"></div></div>
    `;
    const filters = getPayload();
    // simulate fetch
    setTimeout(()=>{
      const list = filterActivities(ACTIVITIES, filters);
      renderResults(list);
    }, 400);
  });

  function getPayload(){
    const payload = {};
    form.querySelectorAll('.chips').forEach(wrap=>{
      const group = wrap.dataset.group;
      const selected = [...wrap.querySelectorAll('.chip.is-on')].map(b=>b.dataset.key);
      if (selected.length) payload[group] = selected;
    });
    return payload;
  }

  function updateSummary(){
    const count = form.querySelectorAll('.chip.is-on').length;
    summary.textContent = count ? `נבחרו ${count} קטגוריות` : 'לא נבחרו קטגוריות';
  }

  function renderTags(){
    const payload = getPayload();
    const entries = Object.entries(payload).flatMap(([group, vals]) =>
      vals.map(v => ({ group, v }))
    );
    tagsBar.innerHTML = entries.map(({group, v})=>`
      <span class="tag" data-group="${group}" data-val="${v}">
        <span>${v}</span>
        <button type="button" aria-label="הסר ${v}" title="הסר">
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </span>
    `).join('');

    // X remove => also untoggle the source chip
    tagsBar.querySelectorAll('.tag button').forEach(btn=>{
      btn.addEventListener('click', (ev)=>{
        const tag = ev.currentTarget.closest('.tag');
        const { group, val } = tag.dataset;
        const chip = form.querySelector(`.chips[data-group="${group}"] .chip[data-key="${CSS.escape(val)}"]`);
        if (chip) chip.classList.remove('is-on');
        renderTags(); updateSummary();
      });
    });
  }

  function overlap(a=[], b=[]){
    const s = new Set(a); return b.some(x=>s.has(x));
  }

  function filterActivities(items, filters){
    const keys = Object.keys(filters);
    if (!keys.length) return items;
    return items.filter(item =>
      keys.every(k => overlap(filters[k], item.facets[k] || []))
    );
  }

  function renderResults(list){
    if (!list.length){
      results.innerHTML = `<p class="cat__summary">אין תוצאות תואמות — נסו להסיר כמה מסננים.</p>`;
      return;
    }
    results.innerHTML = list.map(x=>`
      <article class="r-card">
        <img class="r-img" src="${x.img}" alt="">
        <div>
          <h4 class="r-title">${x.title}</h4>
          <p class="r-meta">${x.meta}</p>
          <div class="r-actions">
            <button class="r-btn r-btn--primary" data-id="${x.id}">פתח</button>
            <button class="r-btn r-btn--ghost" data-id="${x.id}" data-save="1">שמור</button>
          </div>
        </div>
      </article>
    `).join('');
  }

  // init
  renderTags(); updateSummary();
})();
