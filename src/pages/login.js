// /src/pages/login.js
import { auth } from '../core/firebase.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import logo from '../icons/profile-logo.png';

const $ = (s, r = document) => r.querySelector(s);

export function mount(root) {
  const target = root || document.getElementById('app') || document.body;
  target.innerHTML = template();
  wire(target);
}

function template() {
  return `
  <main class="auth u-center" dir="rtl">
    <section class="auth-card">
      <header class="auth-head">
        <img class="auth-logo" src="${logo}" alt="LooZ" />
        <h1 class="auth-title">כניסה</h1>
        <p class="auth-sub">היכנס/י או צר/י חשבון כדי להמשיך</p>
      </header>

      <form class="auth-form" id="loginForm">
        <label class="fld">
          <span class="lbl">אימייל</span>
          <input id="loginEmail" type="email" inputmode="email" placeholder="name@email.com" required />
        </label>
        <label class="fld">
          <span class="lbl">סיסמה</span>
          <input id="loginPass" type="password" placeholder="••••••••" minlength="6" required />
        </label>
        <button class="btn btn-primary" type="submit">כניסה</button>
      </form>

      <div class="auth-or"><span>או</span></div>

      <div class="auth-social">
        <button class="btn btn-ghost" id="googleBtn" aria-label="Google">Google</button>
      </div>

      <footer class="auth-foot">
        <button class="link" id="showSignup">אין חשבון? הרשמה</button>
      </footer>
    </section>

    <section class="auth-card" hidden id="signupCard">
      <header class="auth-head">
        <img class="auth-logo" src="${logo}" alt="LooZ" />
        <h1 class="auth-title">הרשמה</h1>
        <p class="auth-sub">דקה ואת/ה בפנים</p>
      </header>

      <form class="auth-form" id="signupForm">
        <label class="fld">
          <span class="lbl">אימייל</span>
          <input id="suEmail" type="email" inputmode="email" placeholder="name@email.com" required />
        </label>
        <label class="fld">
          <span class="lbl">סיסמה</span>
          <input id="suPass" type="password" placeholder="לפחות 6 תווים" minlength="6" required />
        </label>
        <label class="chk">
          <input id="suAgree" type="checkbox" required />
          <span>מסכים/ה למדיניות ולפרטיות</span>
        </label>
        <button class="btn btn-primary" type="submit">הרשמה</button>
      </form>

      <footer class="auth-foot">
        <button class="link" id="showLogin">יש חשבון? כניסה</button>
      </footer>
    </section>
  </main>
  `;
}

function wire(root) {
  // Toggle between login / signup
  $('#showSignup', root)?.addEventListener('click', () => {
    root.querySelector('.auth-card')?.setAttribute('hidden', '');
    $('#signupCard', root)?.removeAttribute('hidden');
  });
  $('#showLogin', root)?.addEventListener('click', () => {
    $('#signupCard', root)?.setAttribute('hidden', '');
    root.querySelector('.auth-card')?.removeAttribute('hidden');
  });

  // === LOGIN (email/password)
  $('#loginForm', root)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    const pass = $('#loginPass').value.trim();
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // redirect handled by onAuthStateChanged watcher
    } catch (err) {
      alert(err.message || 'Login failed');
      console.error(err);
    }
  });

  // === SIGNUP
  $('#signupForm', root)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#suEmail').value.trim();
    const pass = $('#suPass').value.trim();
    if (!$('#suAgree').checked) return alert('אנא אשר/י את המדיניות');
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      // redirect handled by onAuthStateChanged watcher
    } catch (err) {
      alert(err.message || 'Sign up failed');
      console.error(err);
    }
  });

  // === GOOGLE LOGIN (popup → redirect fallback)
  $('#googleBtn', root)?.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await signInWithPopup(auth, provider);
      // redirect handled by watcher
    } catch (e) {
      const code = String(e?.code || '');
      if (code.includes('popup') || code.includes('internal-error')) {
        try {
          await signInWithRedirect(auth, provider);
          await getRedirectResult(auth);
          return;
        } catch (e2) {
          alert(`Google redirect error:\n${e2?.message || e2}`);
          console.error(e2);
          return;
        }
      }
      alert(`Google error:\n${e?.message || e}`);
      console.error(e);
    }
  });
}

export default { mount };
