"use strict";

document.addEventListener('DOMContentLoaded', function () {
  var bar = document.querySelector('.looz-bar');
  var img = document.querySelector('.looz-logo');
  if (!bar || !img) return;

  var playOnce = function playOnce() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    bar.classList.add('flash-once');
    var bolt = bar.querySelector('.looz-bolt');
    if (!bolt) return;
    bolt.addEventListener('animationend', function () {
      bar.classList.remove('flash-once'); // clean up
    }, {
      once: true
    });
  };

  img.complete ? playOnce() : img.addEventListener('load', playOnce, {
    once: true
  });
});