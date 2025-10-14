export function mount(root){
  root.innerHTML = `
    <main class="o-page">
      <section class="o-phone o-inner">
        <header class="o-header">
          <button class="c-topbtn" id="btnProfile" aria-label="פרופיל">👤</button>
          <a href="#/home" class="looz-logo" aria-label="LooZ">LooZ</a>
          <button class="c-topbtn" id="btnMenu" aria-label="תפריט">☰</button>
        </header>

        <div class="c-meta-block">
          <span class="c-title--date">היום</span>
          <p class="c-subtitle"><b>ברוך הבא</b> ללוז ✨</p>
        </div>

        <div class="c-cta-wrap">
          <nav class="c-view-switch">
            <a class="c-headbtn" href="#/day">יום</a>
            <a class="c-headbtn" href="#/week">שבוע</a>
            <a class="c-headbtn" href="#/month">חודש</a>
            <a class="c-headbtn" href="#/settings">הגדרות</a>
          </nav>
        </div>

        <div class="c-cta-wrap">
          <button class="c-cta c-cta--bang btn-create-orb" aria-label="צור אירוע"></button>
        </div>
      </section>
    </main>
  `;
}
