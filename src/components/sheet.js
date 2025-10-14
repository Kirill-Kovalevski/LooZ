// src/components/sheet.js
export function openCreateSheet(){
  let wrap = document.querySelector('.c-sheet');
  if (!wrap){
    wrap = document.createElement('div');
    wrap.className = 'c-sheet u-hidden';
    wrap.innerHTML = `
      <div class="c-sheet__backdrop" data-sheet="close"></div>
      <section class="c-sheet__panel" role="dialog" aria-modal="true" aria-label="צור אירוע">
        <header class="c-sheet__header">
          <h3 class="c-sheet__title">אירוע חדש</h3>
          <button class="c-icon-btn--ghost" data-sheet="close">✕</button>
        </header>

        <form class="f-grid" id="newEventForm">
          <label class="f-field f-field--elevated">
            <span class="f-label">תיאור</span>
            <input class="f-input f-input--big" name="text" maxlength="80" placeholder="מה לעשות?" required>
          </label>
          <label class="f-field f-field--elevated">
            <span class="f-label">תאריך</span>
            <input class="f-input" type="date" name="date" required>
          </label>
          <label class="f-field f-field--elevated">
            <span class="f-label">שעה</span>
            <input class="f-input" type="time" name="time" required>
          </label>
        </form>

        <div class="c-sheet__actions">
          <button class="c-btn c-btn--ghost" data-sheet="close">ביטול</button>
          <button class="c-btn c-btn--primary" id="evtSave">שמור</button>
        </div>
      </section>
    `;
    document.body.appendChild(wrap);

    wrap.addEventListener('click', (e)=>{
      if (e.target.closest('[data-sheet="close"]')) closeCreateSheet();
    });
    wrap.querySelector('#evtSave')?.addEventListener('click', ()=>{
      const form = wrap.querySelector('#newEventForm');
      if (!form.reportValidity()) return;
      closeCreateSheet();
      const data = Object.fromEntries(new FormData(form).entries());
      document.dispatchEvent(new CustomEvent('looz:newEvent', { detail:data }));
    });
  }
  requestAnimationFrame(()=>{
    wrap.classList.remove('u-hidden');
    wrap.classList.add('is-open');
  });
}

export function closeCreateSheet(){
  const wrap = document.querySelector('.c-sheet');
  if (!wrap) return;
  wrap.classList.remove('is-open');
  setTimeout(()=>wrap.classList.add('u-hidden'), 280);
}
