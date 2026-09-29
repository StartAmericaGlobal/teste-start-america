/* ============================================================
   Efeito de brilho nos botões — Start América
   Adaptado do componente "CursorEdgeGlowButton", recolorido para a
   identidade dourada do site. Envolve cada .btn com um anel de
   brilho dourado que reage à posição do cursor com uma mola física
   (o brilho "sobra" pro lado de onde o cursor está).
   ============================================================ */
(function () {
  'use strict';

  var FREQUENCY = 3.4;
  var DAMPING = 0.78;
  var GLOW_RISE = 0.55;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function wrapButton(btn) {
    if (btn.closest('.btn-glow')) return; // já envolvido
    if (btn.dataset.noGlow === 'true') return;

    var wrap = document.createElement('span');
    wrap.className = 'btn-glow';

    var rightGlow = document.createElement('span');
    rightGlow.className = 'btn-glow__ring btn-glow__ring--right';
    rightGlow.setAttribute('aria-hidden', 'true');

    var leftGlow = document.createElement('span');
    leftGlow.className = 'btn-glow__ring btn-glow__ring--left';
    leftGlow.setAttribute('aria-hidden', 'true');

    btn.parentNode.insertBefore(wrap, btn);
    wrap.appendChild(rightGlow);
    wrap.appendChild(leftGlow);
    wrap.appendChild(btn);

    var bound = wrap.getBoundingClientRect().width / 2 + 10;
    var x = 0, velocity = 0, target = 0, inside = false, last = 0, raf = null;

    function measure() { bound = wrap.getBoundingClientRect().width / 2 + 10; }
    function paint() {
      var normalized = bound > 0 ? Math.max(-1, Math.min(1, x / bound)) : 0;
      var magnitude = Math.abs(normalized);
      var intensity = Math.pow(magnitude, GLOW_RISE);
      rightGlow.style.opacity = (normalized > 0 ? intensity : 0).toFixed(3);
      leftGlow.style.opacity = (normalized < 0 ? intensity : 0).toFixed(3);
    }
    measure(); paint();

    var ro = new ResizeObserver(measure);
    ro.observe(wrap);

    if (reduceMotion) return;

    function frame(now) {
      now = now || performance.now();
      var delta = Math.min((now - last) / 1000, 0.032);
      last = now;
      var w = 2 * Math.PI * FREQUENCY;
      velocity += (w * w * (target - x) - 2 * DAMPING * w * velocity) * delta;
      x += velocity * delta;
      paint();
      if (inside || Math.abs(target - x) > 0.15 || Math.abs(velocity) > 0.6) {
        raf = requestAnimationFrame(frame);
      } else {
        raf = null; x = target; velocity = 0; paint();
      }
    }
    function kick() {
      if (raf === null) { last = performance.now(); raf = requestAnimationFrame(frame); }
    }

    wrap.addEventListener('pointermove', function (e) {
      var rect = wrap.getBoundingClientRect();
      inside = true;
      target = Math.max(-bound, Math.min(bound, e.clientX - (rect.left + rect.width / 2)));
      kick();
    });
    wrap.addEventListener('pointerleave', function () {
      inside = false;
      target = 0;
      kick();
    });
  }

  function init() {
    document.querySelectorAll('.btn').forEach(wrapButton);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
