import './styles/main.scss';

// Tiny demo DOM so you see styles immediately
const app = document.querySelector('#app');
app.innerHTML = `
  <main class="o-page">
    <section class="o-phone o-inner">
      <header class="o-header">
        <button class="c-topbtn" id="btnProfile" aria-label="פרופיל">👤</button>
        <a href="#" class="looz-logo" aria-label="LooZ">
          <img class="brand-logo brand-logo--light" alt="LooZ" src="/src/assets/logo-light.png">
          <img class="brand-logo brand-logo--dark" alt="LooZ" src="/src/assets/logo-dark.png">
        </a>
        <button class="c-topbtn" id="btnMenu" aria-label="תפריט">☰</button>
      </header>

      <div class="c-meta-block">
        <span class="c-title--date">היום</span>
        <p class="c-subtitle"><b>ברוך הבא</b> ללוז החדש ✨</p>
      </div>

      <div class="c-cta-wrap">
        <button class="c-cta c-cta--bang btn-create-orb" aria-label="צור אירוע"></button>
      </div>
    </section>
  </main>
`;

// Simple theme toggle helper (optional)
window.toggleDark = (on = true) => {
  document.documentElement.classList.toggle('is-dark', on);
  document.body.classList.toggle('is-dark', on);
};
