import { getWeekStart, setWeekStart } from '../utils/date.js';
import { dayNames, buildWeek, fmtDM, keyOf, TODAY_KEY } from '../utils/date.js';

export function mount(root){
  const weekStart = getWeekStart(); // 'sun' | 'mon'

  root.innerHTML = `
    <section class="s o-inner">
      <header class="s__header">
        <h2 class="s__title">הגדרות</h2>
      </header>

      <div class="s__group">
        <h3 class="s__group-title">ערכת נושא</h3>
        <div class="s__row">
          <button class="c-headbtn" type="button" onclick="toggleDark(false)">בהיר</button>
          <button class="c-headbtn" type="button" onclick="toggleDark(true)">כהה</button>
        </div>
      </div>

      <div class="s__group">
        <h3 class="s__group-title">תחילת שבוע</h3>
        <div class="s__row">
          <button class="c-headbtn ${weekStart==='sun'?'is-active':''}" type="button"
            onclick="localStorage.setItem('weekStart','sun'); location.hash='#/week'">ראשון</button>
          <button class="c-headbtn ${weekStart==='mon'?'is-active':''}" type="button"
            onclick="localStorage.setItem('weekStart','mon'); location.hash='#/week'">שני</button>
        </div>
      </div>

      <div class="s__group">
        <h3 class="s__group-title">שפה</h3>
        <div class="s__row">
          <button class="c-headbtn is-active" type="button">עברית</button>
          <button class="c-headbtn" type="button" disabled>English (בהמשך)</button>
        </div>
      </div>
    </section>
  `;
}
// in Settings page
localStorage.setItem('pillHue', '195'); // teal-ish
