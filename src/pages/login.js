// /src/pages/login.js
// Auth screen with flip (login/register), RTL Hebrew, iPhone 12 Pro layout.
// This version removes the white header pills and the footer gradient block.

import { auth } from '../core/firebase.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signInWithPopup
} from 'firebase/auth';

import loginLogo from '../icons/login-logo.png';

const $ = (s, r = document) => r.querySelector(s);

function screenHTML() {
  return `
  <main class="auth-screen" dir="rtl" data-mode="login" aria-live="polite">
    <!-- brand -->
    <header class="auth-header">
      <button class="brandmark" aria-label="LooZ">
        <img src="${loginLogo}" alt="LooZ" />
      </button>
    </header>

    <!-- flip-card wrapper -->
    <div class="auth-card">
      <!-- LOGIN FACE -->
      <section class="face face--login" aria-label="התחברות">
        <div class="face-head">
          <h1 class="face-title">התחברות</h1>
        </div>

        <form id="loginForm" class="auth-form" autocomplete="on" novalidate>
          <!-- email -->
          <div class="f-block">
            <label class="f-label">
              <span>דוא״ל</span>
            </label>
            <input
              class="f-input"
              type="email"
              inputmode="email"
              name="email"
              placeholder="name@email.com"
              required
            />
          </div>

          <!-- password -->
          <div class="f-block">
            <label class="f-label">
              <span>סיסמה</span>
              <button
                class="forgot-link"
                type="button"
                aria-label="שכחתי סיסמה"
              >שכחתי סיסמה</button>
            </label>
            <input
              class="f-input"
              type="password"
              name="password"
              placeholder="••••••••"
              required
            />
          </div>

          <!-- buttons -->
          <div class="btn-stack">
            <button class="btn btn--main" type="submit">כניסה</button>
            <button
              id="btnToRegister"
              class="btn btn--alt"
              type="button"
            >יצירת חשבון חדש</button>
          </div>

          <!-- social row -->
          <div class="social-row" aria-label="התחברות עם ספק חיצוני">
            <button
              class="social-btn social-btn--google"
              type="button"
              aria-label="Google"
              title="Google"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1a6.4 6.4 0 1 1 0-12.8 5.7 5.7 0 0 1 4 1.6l2.7-2.7A9.5 9.5 0 1 0 12 21.5c5.5 0 9.2-3.9 9.2-9.4 0-.63-.07-1.1-.16-1.6H12Z"/>
                <path fill="#4285F4" d="M3.2 7.3l3.2 2.3A6.4 6.4 0 0 1 12 5.4c1.7 0 3.2.6 4.4 1.6l2.6-2.6A9.5 9.5 0 0 0 12 2.5 9.4 9.4 0 0 0 3.2 7.3Z"/>
                <path fill="#FBBC04" d="M12 21.5c2.6 0 4.9-.86 6.6-2.3l-2.9-2.2c-1 .7-2.3 1.1-3.7 1.1-2.9 0-5.3-2-6.1-4.6l-3.2 2.4A9.5 9.5 0 0 0 12 21.5Z"/>
                <path fill="#34A853" d="M5.9 13.5a6.1 6.1 0 0 1 0-3l-3.2-2.3a9.5 9.5 0 0 0 0 7.6l3.2-2.3Z"/>
              </svg>
            </button>

            <button
              class="social-btn social-btn--apple"
              type="button"
              aria-label="Apple"
              title="Apple"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="currentColor" d="M17.4 12.9c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.7.8-3.3.8-.7 0-1.7-.8-2.8-.7-1.4 0-2.7.8-3.4 2-.1.1-1.2 2.1-.3 4.4.6 1.7 2.2 3.7 3.9 3.7.8 0 1.3-.6 2.5-.6s1.6.6 2.6.6c1.7 0 3.1-1.7 3.7-3.4-.1 0-2.5-1-2.5-3.5ZM14.8 5.5c.6-.8 1-1.8.9-2.8-1 .1-2 .6-2.7 1.4-.6.8-1 1.7-.9 2.7 1-.1 2-.6 2.7-1.3Z"/>
              </svg>
            </button>

            <button
              class="social-btn social-btn--facebook"
              type="button"
              aria-label="Facebook"
              title="Facebook"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="#1877F2" d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.5V12h2.9V9.7c0-2.8 1.7-4.3 4.2-4.3 1.2 0 2.4.2 2.4.2v2.6h-1.3c-1.3 0-1.7.8-1.7 1.6V12h3l-.5 2.9h-2.5v7A10 10 0 0 0 22 12Z"/>
                <path fill="#fff" d="M16.3 14.9 16.8 12h-3v-2.1c0-.8.4-1.6 1.7-1.6h1.3V5.7s-1.1-.2-2.4-.2c-2.5 0-4.2 1.5-4.2 4.3V12H7.5v2.9h2.9v7c.57.09 1.15.14 1.75.14.6 0 1.18-.05 1.75-.14v-7h2.5Z"/>
              </svg>
            </button>
          </div>
        </form>
      </section>

      <!-- REGISTER FACE -->
      <section class="face face--register" aria-label="יצירת חשבון">
        <div class="face-head">
          <h1 class="face-title">יצירת חשבון</h1>
        </div>

        <form id="registerForm" class="auth-form" autocomplete="on" novalidate>
          <!-- first / last -->
          <div class="row-2col">
            <div class="f-block">
              <label class="f-label"><span>שם פרטי</span></label>
              <input class="f-input" type="text" name="fname" required />
            </div>
            <div class="f-block">
              <label class="f-label"><span>שם משפחה</span></label>
              <input class="f-input" type="text" name="lname" required />
            </div>
          </div>

          <!-- email -->
          <div class="f-block">
            <label class="f-label"><span>דוא״ל</span></label>
            <input
              class="f-input"
              type="email"
              inputmode="email"
              name="email"
              placeholder="name@email.com"
              required
            />
          </div>

          <!-- password -->
          <div class="f-block">
            <label class="f-label">
              <span>סיסמה</span>
              <span class="hint">מינ׳ 6 תווים</span>
            </label>
            <input
              class="f-input"
              type="password"
              name="password"
              placeholder="מינ׳ 6 תווים"
              minlength="6"
              required
            />
          </div>

          <!-- confirm password -->
          <div class="f-block">
            <label class="f-label"><span>אימות סיסמה</span></label>
            <input
              class="f-input"
              type="password"
              name="confirm"
              placeholder="אימות סיסמה"
              minlength="6"
              required
            />
          </div>

          <!-- buttons -->
          <div class="btn-stack">
            <button class="btn btn--main" type="submit">יצירת חשבון</button>
            <button
              id="btnToLogin"
              class="btn btn--alt"
              type="button"
            >כבר יש לי חשבון</button>
          </div>

          <!-- social row (visible on register too) -->
          <div class="social-row" aria-label="הרשמה עם ספק חיצוני">
            <button
              class="social-btn social-btn--facebook"
              type="button"
              aria-label="Facebook"
              title="Facebook"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="#1877F2" d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.5V12h2.9V9.7c0-2.8 1.7-4.3 4.2-4.3 1.2 0 2.4.2 2.4.2v2.6h-1.3c-1.3 0-1.7.8-1.7 1.6V12h3l-.5 2.9h-2.5v7A10 10 0 0 0 22 12Z"/>
                <path fill="#fff" d="M16.3 14.9 16.8 12h-3v-2.1c0-.8.4-1.6 1.7-1.6h1.3V5.7s-1.1-.2-2.4-.2c-2.5 0-4.2 1.5-4.2 4.3V12H7.5v2.9h2.9v7c.57.09 1.15.14 1.75.14.6 0 1.18-.05 1.75-.14v-7h2.5Z"/>
              </svg>
            </button>

            <button
              class="social-btn social-btn--apple"
              type="button"
              aria-label="Apple"
              title="Apple"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="currentColor" d="M17.4 12.9c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.7.8-3.3.8-.7 0-1.7-.8-2.8-.7-1.4 0-2.7.8-3.4 2-.1.1-1.2 2.1-.3 4.4.6 1.7 2.2 3.7 3.9 3.7.8 0 1.3-.6 2.5-.6s1.6.6 2.6.6c1.7 0 3.1-1.7 3.7-3.4-.1 0-2.5-1-2.5-3.5ZM14.8 5.5c.6-.8 1-1.8.9-2.8-1 .1-2 .6-2.7 1.4-.6.8-1 1.7-.9 2.7 1-.1 2-.6 2.7-1.3Z"/>
              </svg>
            </button>

            <button
              class="social-btn social-btn--google"
              type="button"
              aria-label="Google"
              title="Google"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1a6.4 6.4 0 1 1 0-12.8 5.7 5.7 0 0 1 4 1.6l2.7-2.7A9.5 9.5 0 1 0 12 21.5c5.5 0 9.2-3.9 9.2-9.4 0-.63-.07-1.1-.16-1.6H12Z"/>
                <path fill="#4285F4" d="M3.2 7.3l3.2 2.3A6.4 6.4 0 0 1 12 5.4c1.7 0 3.2.6 4.4 1.6l2.6-2.6A9.5 9.5 0 0 0 12 2.5 9.4 9.4 0 0 0 3.2 7.3Z"/>
                <path fill="#FBBC04" d="M12 21.5c2.6 0 4.9-.86 6.6-2.3l-2.9-2.2c-1 .7-2.3 1.1-3.7 1.1-2.9 0-5.3-2-6.1-4.6l-3.2 2.4A9.5 9.5 0 0 0 12 21.5Z"/>
                <path fill="#34A853" d="M5.9 13.5a6.1 6.1 0 0 1 0-3l-3.2-2.3a9.5 9.5 0 0 0 0 7.6l3.2-2.3Z"/>
              </svg>
            </button>
          </div>
        </form>
      </section>
    </div>
  </main>
  `;
}

function wire(root) {
  const screen        = root.querySelector('.auth-screen');
  const loginForm     = root.querySelector('#loginForm');
  const registerForm  = root.querySelector('#registerForm');

  // flip
  root.querySelector('#btnToRegister')?.addEventListener('click', () => {
    screen.setAttribute('data-mode', 'register');
  });
  root.querySelector('#btnToLogin')?.addEventListener('click', () => {
    screen.setAttribute('data-mode', 'login');
  });

  // logo animation
  const brand = root.querySelector('.brandmark');
  if (brand) {
    brand.addEventListener('pointerdown', () => {
      brand.classList.add('is-tilt');
      setTimeout(() => brand.classList.remove('is-tilt'), 280);
    });
  }

  // forgot password link
  root.querySelector('.forgot-link')?.addEventListener('click', () => {
    alert('נשלח לינק לאיפוס סיסמה (דמו).');
    // prod: sendPasswordResetEmail(auth, emailFromField)
  });

  // providers for login & register
  const google   = new GoogleAuthProvider();
  const facebook = new FacebookAuthProvider();
  const apple    = new OAuthProvider('apple.com');

  function providerHook(sel, prov) {
    root.querySelectorAll(sel).forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await signInWithPopup(auth, prov);
          localStorage.setItem('looz_uid', auth.currentUser?.uid || '1');
          location.replace('#/month');
        } catch (e) { console.error(e); }
      });
    });
  }
  providerHook('.social-btn--google', google);
  providerHook('.social-btn--facebook', facebook);
  providerHook('.social-btn--apple', apple);

  // email/password login
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data  = new FormData(loginForm);
    const email = String(data.get('email') || '').trim();
    const pw    = String(data.get('password') || '').trim();
    if (!email || !pw) return;
    try {
      await signInWithEmailAndPassword(auth, email, pw);
      localStorage.setItem('looz_uid', auth.currentUser?.uid || '1');
      location.replace('#/month');
    } catch (err) {
      console.error(err);
      alert('שגיאה בהתחברות.');
    }
  });

  // registration
  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data     = new FormData(registerForm);
    const email    = String(data.get('email') || '').trim();
    const pw       = String(data.get('password') || '').trim();
    const confirm  = String(data.get('confirm')  || '').trim();
    if (!email || !pw || !confirm) return;
    if (pw !== confirm) {
      alert('הסיסמאות לא תואמות');
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, pw);
      localStorage.setItem('looz_uid', auth.currentUser?.uid || '1');
      location.replace('#/month');
    } catch (err) {
      console.error(err);
      alert('לא הצלחנו ליצור חשבון.');
    }
  });
}

export function mount(root) {
  document.body.setAttribute('data-view', 'login');
  root.innerHTML = screenHTML();
  wire(root);
}

export default { mount };
