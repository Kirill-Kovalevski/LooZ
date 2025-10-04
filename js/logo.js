document.addEventListener('DOMContentLoaded', () => {
  const bar = document.querySelector('.looz-bar');
  const img = document.querySelector('.looz-logo');
  if (!bar || !img) return;

  const playOnce = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    bar.classList.add('flash-once');
    const bolt = bar.querySelector('.looz-bolt');
    if (!bolt) return;
    bolt.addEventListener('animationend', () => {
      bar.classList.remove('flash-once'); // clean up
    }, { once: true });
  };

  img.complete ? playOnce() : img.addEventListener('load', playOnce, { once: true });
});
