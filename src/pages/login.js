// /src/pages/login.js
// LooZ — RTL login/register with CRISP switch-flip (card collision),
// logo tilt, Google/Apple auth, and exact #e6edee background tone.

import { auth } from '../core/firebase.js';
let S = null;
try { S = await import('../services/auth.service.js'); } catch (_) {}

import loginLogo from '../icons/login-logo.png';

const $ = (s, r = document) => r.querySelector(s);

export function mount(root = document.getElementById('app')) {
  document.documentElement.setAttribute('dir', 'rtl');
  document.body.setAttribute('data-view', 'login');

  root.innerHTML = `
  <section class="login-page">

    <header class="lp-head">
      <img class="lp-logo" id="loozLogo" src="${loginLogo}" alt="LooZ" />
    </header>

    <main class="lp-center">
      <div class="lp-stage" id="stage" aria-live="polite">
        <!-- Toggle -->
        <div class="lp-toggle" role="tablist" aria-label="החלף מצב">
          <button class="lp-toggle__btn is-on"  id="tglLogin"  role="tab" aria-selected="true">כניסה</button>
          <button class="lp-toggle__btn"        id="tglSignup" role="tab" aria-selected="false">הרשמה</button>
          <span class="lp-toggle__pill" aria-hidden="true"></span>
        </div>

        <!-- Card stack -->
        <article class="lp-cardstack" id="stack">
          <!-- LOGIN -->
          <section class="lp-pane is-active pane--login" id="paneLogin">
            <h1 class="lp-title">כניסה</h1>
            <form id="formLogin" autocomplete="on" novalidate>
              <label class="lp-label" for="loginEmail">אימייל</label>
              <input id="loginEmail" class="lp-input" type="email" inputmode="email" placeholder="name@email.com" required />

              <div class="lp-row">
                <div class="lp-col"><label class="lp-label" for="loginPass">סיסמה</label></div>
                <div class="lp-col lp-col--end"><button type="button" class="lp-linkbtn" id="btnForgot">שכחת סיסמה?</button></div>
              </div>
              <input id="loginPass" class="lp-input" type="password" placeholder="••••••••" minlength="6" required />

              <button class="lp-cta lp-cta--primary" type="submit">כניסה</button>

              <div class="lp-or" role="separator" aria-label="או">או</div>
              <button class="lp-cta lp-cta--google" type="button" id="btnGoogleLogin">${googleSVG()} המשך עם Google</button>
              <button class="lp-cta lp-cta--apple"  type="button" id="btnAppleLogin">${appleSVG()} המשך עם Apple</button>
            </form>
          </section>

          <!-- SIGNUP -->
          <section class="lp-pane pane--signup" id="paneSignup" aria-hidden="true">
            <h1 class="lp-title">הרשמה</h1>
            <form id="formSignup" autocomplete="on" novalidate>
              <label class="lp-label" for="name">שם מלא</label>
              <input id="name" class="lp-input" type="text" placeholder="שם ושם משפחה" required />

              <label class="lp-label" for="signupEmail">אימייל</label>
              <input id="signupEmail" class="lp-input" type="email" inputmode="email" placeholder="name@email.com" required />

              <label class="lp-label" for="signupPass">סיסמה</label>
              <input id="signupPass" class="lp-input" type="password" placeholder="מינימום 6 תווים" minlength="6" required />

              <button class="lp-cta lp-cta--primary" type="submit">צור חשבון</button>

              <div class="lp-or" role="separator" aria-label="או">או</div>
              <button class="lp-cta lp-cta--google" type="button" id="btnGoogleSignup">${googleSVG()} הירשם עם Google</button>
              <button class="lp-cta lp-cta--apple"  type="button" id="btnAppleSignup">${appleSVG()} הירשם עם Apple</button>

              <p class="lp-footnote">בהרשמה אתה מאשר את תנאי השימוש ומדיניות הפרטיות.</p>
            </form>
          </section>
        </article>
      </div>
    </main>
  </section>
  `;

  // Toggle wiring + flip
  const stage     = $('#stage');
  const pill      = $('.lp-toggle__pill');
  const btnLogin  = $('#tglLogin');
  const btnSignup = $('#tglSignup');
  const loginPane = $('#paneLogin');
  const signupPane= $('#paneSignup');

  let flipping = false;
  function setMode(mode){
    if (flipping) return;
    const toSignup = mode === 'signup';
    const active   = toSignup ? loginPane : signupPane;
    const incoming = toSignup ? signupPane : loginPane;

    // toggle UI
    btnLogin.classList.toggle('is-on', !toSignup);
    btnSignup.classList.toggle('is-on', toSignup);
    btnLogin.setAttribute('aria-selected', String(!toSignup));
    btnSignup.setAttribute('aria-selected', String(toSignup));
    pill.style.transform = toSignup ? 'translateX(-100%)' : 'translateX(0%)';
    pill.classList.remove('spring'); void pill.offsetWidth; pill.classList.add('spring');

    // prepare incoming
    incoming.removeAttribute('aria-hidden');

    // trigger CRISP switch-flip (collision in the middle)
    flipping = true;
    const dirClass = toSignup ? 'flip-to-signup' : 'flip-to-login';
    stage.classList.add(dirClass);

    // finish after animation
    setTimeout(() => {
      stage.classList.remove(dirClass);
      active.classList.remove('is-active');
      active.setAttribute('aria-hidden', 'true');
      incoming.classList.add('is-active');
      flipping = false;
    }, 560); // must match CSS --flipDur
  }

  btnLogin.addEventListener('click',  () => setMode('login'));
  btnSignup.addEventListener('click', () => setMode('signup'));

  // Logo tilt (subtle)
  const logo = $('#loozLogo');
  let raf = 0;
  function tiltLogo(x, y){
    const r = logo.getBoundingClientRect();
    const cx = r.left + r.width/2, cy = r.top + r.height/2;
    const dx = (x - cx) / r.width, dy = (y - cy) / r.height;
    const rx = Math.max(-8, Math.min(8, -dy * 10));
    const ry = Math.max(-8, Math.min(8,  dx * 10));
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      logo.style.setProperty('--logoTiltX', `${rx}deg`);
      logo.style.setProperty('--logoTiltY', `${ry}deg`);
      logo.style.setProperty('--logoMoveX', `${ry * 0.6}px`);
      logo.style.setProperty('--logoMoveY', `${-rx * 0.6}px`);
    });
  }
  const resetLogo = () => {
    logo.style.setProperty('--logoTiltX', '0deg');
    logo.style.setProperty('--logoTiltY', '0deg');
    logo.style.setProperty('--logoMoveX', '0px');
    logo.style.setProperty('--logoMoveY', '0px');
  };
  logo.addEventListener('pointermove', (e)=>tiltLogo(e.clientX,e.clientY));
  logo.addEventListener('pointerleave', resetLogo);
  logo.addEventListener('touchstart', (e)=>{const t=e.touches[0]; if(t) tiltLogo(t.clientX,t.clientY)}, {passive:true});
  logo.addEventListener('touchmove',  (e)=>{const t=e.touches[0]; if(t) tiltLogo(t.clientX,t.clientY)}, {passive:true});
  logo.addEventListener('touchend', resetLogo);

  // Auth handlers
  $('#formLogin')     .addEventListener('submit', onLogin);
  $('#formSignup')    .addEventListener('submit', onSignup);
  $('#btnForgot')     ?.addEventListener('click', onForgot);
  $('#btnGoogleLogin').addEventListener('click', onGoogle);
  $('#btnGoogleSignup').addEventListener('click', onGoogle);
  $('#btnAppleLogin') ?.addEventListener('click', onApple);
  $('#btnAppleSignup')?.addEventListener('click', onApple);

  async function onLogin(e){
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    const pass  = $('#loginPass').value;
    if (!email || pass.length < 6) return shake();
    busy(true);
    try {
      if (S?.signInEmailPassword) await S.signInEmailPassword(email, pass);
      else { const { signInWithEmailAndPassword } = await import('firebase/auth'); await signInWithEmailAndPassword(auth, email, pass); }
      done();
    } catch { toast('שגיאה בכניסה.'); shake(); } finally { busy(false); }
  }
  async function onSignup(e){
    e.preventDefault();
    const name  = $('#name').value.trim();
    const email = $('#signupEmail').value.trim();
    const pass  = $('#signupPass').value;
    if (!name || !email || pass.length < 6) return shake();
    busy(true);
    try {
      if (S?.signUpEmailPassword) await S.signUpEmailPassword({ name, email, password: pass });
      else {
        const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        try { await updateProfile(cred.user, { displayName: name }); } catch {}
      }
      toast('נרשמת בהצלחה!'); done();
    } catch { toast('ההרשמה נכשלה.'); shake(); } finally { busy(false); }
  }
  async function onGoogle(){
    busy(true);
    try {
      if (S?.signInWithGoogle) await S.signInWithGoogle();
      else { const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth'); await signInWithPopup(auth, new GoogleAuthProvider()); }
      done();
    } catch { toast('הכניסה באמצעות Google נכשלה.'); shake(); } finally { busy(false); }
  }
  async function onApple(){
    busy(true);
    try {
      if (S?.signInWithApple) await S.signInWithApple();
      else {
        const { OAuthProvider, signInWithPopup } = await import('firebase/auth');
        const provider = new OAuthProvider('apple.com'); provider.addScope('email'); provider.addScope('name');
        await signInWithPopup(auth, provider);
      }
      done();
    } catch { toast('הכניסה באמצעות Apple נכשלה.'); shake(); } finally { busy(false); }
  }
  async function onForgot(){
    const email = $('#loginEmail').value.trim();
    if (!email) { toast('הקלד אימייל לשחזור.'); return; }
    busy(true);
    try {
      if (S?.sendPasswordReset) await S.sendPasswordReset(email);
      else { const { sendPasswordResetEmail } = await import('firebase/auth'); await sendPasswordResetEmail(auth, email); }
      toast('קישור לאיפוס נשלח לאימייל.');
    } catch { toast('לא ניתן לשלוח איפוס.'); } finally { busy(false); }
  }

  function done(){
    const redirect = sessionStorage.getItem('looz.postLoginRedirect') || '#/week';
    try { sessionStorage.removeItem('looz.postLoginRedirect'); } catch {}
    location.replace(redirect);
  }
  function busy(on){ const c=$('#stack'); c.classList.toggle('is-busy', !!on); c.setAttribute('aria-busy', String(!!on)); }
  function shake(){ const c=$('#stack'); c.classList.remove('do-shake'); void c.offsetWidth; c.classList.add('do-shake'); setTimeout(()=>c.classList.remove('do-shake'),700); }
  function toast(msg){ let t=document.createElement('div'); t.className='lp-toast'; t.textContent=msg; document.body.appendChild(t); requestAnimationFrame(()=>t.classList.add('is-on')); setTimeout(()=>{ t.classList.remove('is-on'); setTimeout(()=>t.remove(),240); },2000); }
}

function googleSVG(){ return `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48" class="gicon"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.5 29.4 36 24 36a12 12 0 1 1 0-24c3 0 5.7 1.1 7.8 3l5.6-5.6C34.3 6.3 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 19.3-8.9 19.3-20c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16.3 18.8 14 24 14c3 0 5.7 1.1 7.8 3l5.6-5.6C34.3 6.3 29.4 4 24 4 16.3 4 9.6 8.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 10.1-2 13.6-5.3l-6.3-5.2c-2 1.4-4.7 2.5-7.3 2.5-5.2 0-9.6-3.4-11.2-8l-6.6 5.1C9.6 39.6 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.8-3 5-5.6 6.5h.1l6.3 5.2c-.4.3 8.9-5.2 8.9-15.7 0-1.2-.1-2.3-.4-3.5z"/></svg>`; }
function appleSVG(){ return `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" class="aicon"><path fill="currentColor" d="M16.365 2c-.947.056-2.062.66-2.715 1.434-.593.7-1.1 1.74-.904 2.773 1.034.032 2.09-.59 2.737-1.372.6-.73 1.06-1.77.882-2.835zM21 17.313c-.435.992-.956 1.86-1.563 2.607-.823 1.038-1.487 1.753-2.3 1.753-.783 0-1.26-.512-2.355-.512s-1.43.495-2.342.526c-.945.03-1.668-.84-2.49-1.877-.947-1.217-1.758-3.07-1.758-4.915 0-2.305 1.02-3.52 2.785-3.52.74 0 1.36.267 1.86.8.447.48.756 1.124.9 1.787.87-.174 1.69-.54 2.375-1.084a4.9 4.9 0 0 0 1.2-1.45c-.378-.23-1.075-.86-1.075-1.998 0-1.118.52-1.838 1.12-2.366.63-.544 1.49-.89 2.268-.89.17 0 .33.01 .48.032-.188.584-.497 1.113-.92 1.585-.437.487-1.003.877-1.64 1.13.015.05.03.098.045.146.19.6.52 1.09.98 1.463.378.305.86.523 1.44.65-.14.422-.285.844-.432 1.266-.3.87-.45 1.77-.45 2.69 0 1.016.232 1.93.68 2.72z"/></svg>`; }

export default { mount };
