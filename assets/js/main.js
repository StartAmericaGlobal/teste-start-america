/* ============================================================
   START AMÉRICA — interações da landing page
   Menu mobile · FAQ accordion · footer accordion · carrosséis
   · seletor de idioma · reveal on scroll · validação de formulário
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Vídeo de fundo: respeita prefers-reduced-motion ---------- */
  if (reduceMotion) {
    document.querySelectorAll('video[autoplay]').forEach(function (v) {
      v.removeAttribute('autoplay');
      v.addEventListener('loadedmetadata', function () { try { v.pause(); } catch (e) {} });
      try { v.pause(); } catch (e) {}
    });
  }

  /* ---------- Fallback de imagens ausentes (somente até anexar os arquivos) ---------- */
  function markBroken(img) {
    if (img.classList.contains('photo-section__bg')) return; // esse se auto-remove
    if (img.getAttribute('src') && img.complete && img.naturalWidth === 0) {
      img.classList.add('img-fallback');
    }
  }
  document.querySelectorAll('img').forEach(function (img) {
    img.addEventListener('error', function () { markBroken(img); });
    markBroken(img);
  });
  window.addEventListener('load', function () {
    document.querySelectorAll('img').forEach(markBroken);
  });

  /* ---------- Ano do rodapé ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Header: transparente sobre o hero, sólido após passar dele ---------- */
  var header = document.querySelector('.site-header');
  var heroEl = document.querySelector('.hero');
  var menuForcesSolid = false;
  function updateHeader() {
    if (!header) return;
    var solid;
    if (menuForcesSolid) {
      solid = true;
    } else if (heroEl && header.classList.contains('site-header--overlay')) {
      solid = heroEl.getBoundingClientRect().bottom <= header.offsetHeight + 1;
    } else {
      solid = window.scrollY > 8;
    }
    header.classList.toggle('is-scrolled', solid);
  }
  if (header) {
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
    window.addEventListener('resize', updateHeader);
  }

  /* ---------- Menu mobile ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('primary-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      toggle.setAttribute('aria-label', open ? 'Abrir menu' : 'Fechar menu');
      nav.classList.toggle('is-open', !open);
      document.body.style.overflow = !open && window.matchMedia('(max-width: 1119px)').matches ? 'hidden' : '';
      menuForcesSolid = !open;
      updateHeader();
    });

    // fecha ao clicar num link ou fora
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1119) closeNav();
    });
  }
  function closeNav() {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menu');
    nav.classList.remove('is-open');
    document.body.style.overflow = '';
    menuForcesSolid = false;
    updateHeader();
  }

  /* ---------- Seletor de idioma: tratado em assets/js/i18n.js ---------- */
  var tr = function (s) { return (typeof window.saT === 'function') ? window.saT(s) : s; };

  /* ---------- Envio de leads para /api/lead (Vercel → PipeRun) ---------- */
  function sendLead(payload) {
    return fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error('request failed');
      return res.json().catch(function () { return {}; });
    });
  }

  /* ---------- FAQ accordion (acessível) ---------- */
  var faq = document.querySelector('[data-faq]');
  if (faq) {
    var triggers = faq.querySelectorAll('.faq__trigger');
    triggers.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        panel.hidden = open;
      });
    });
  }

  /* ---------- Footer accordion (somente mobile) ---------- */
  var footerToggles = document.querySelectorAll('.footer-col__toggle');
  footerToggles.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!window.matchMedia('(max-width: 767px)').matches) return;
      var list = btn.parentElement.querySelector('ul');
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      if (list) list.classList.toggle('is-open', !open);
    });
  });

  /* ---------- Carrosséis mobile: aplica classe .snap-scroller ---------- */
  var snapGroups = document.querySelectorAll('[data-snap-mobile]');
  var mqMobile = window.matchMedia('(max-width: 767px)');
  function applySnap() {
    snapGroups.forEach(function (group) {
      group.classList.toggle('snap-scroller', mqMobile.matches);
    });
  }
  applySnap();
  mqMobile.addEventListener('change', applySnap);

  /* ---------- Carrossel de imagens (setas laterais, loop opcional) ---------- */
  document.querySelectorAll('[data-carousel]').forEach(function (root) {
    var viewport = root.querySelector('[data-carousel-viewport]');
    var track = root.querySelector('[data-carousel-track]');
    var prevBtn = root.querySelector('[data-carousel-prev]');
    var nextBtn = root.querySelector('[data-carousel-next]');
    if (!viewport || !track || !prevBtn || !nextBtn) return;

    var loop = root.hasAttribute('data-carousel-loop');
    var autoplayDelay = parseInt(root.getAttribute('data-carousel-autoplay'), 10);
    var autoplayTimer = null;

    function slideStep() {
      var slide = track.querySelector('.location-carousel__slide');
      if (!slide) return viewport.clientWidth;
      var style = window.getComputedStyle(track);
      var gap = parseFloat(style.columnGap || style.gap || '0') || 0;
      return slide.getBoundingClientRect().width + gap;
    }

    var EDGE_TOLERANCE = 4; // margem p/ evitar travar por arredondamento sub-pixel

    function maxScroll() {
      return viewport.scrollWidth - viewport.clientWidth;
    }

    function goNext() {
      if (viewport.scrollLeft >= maxScroll() - EDGE_TOLERANCE) {
        viewport.scrollTo({ left: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      } else {
        viewport.scrollBy({ left: slideStep(), behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }
    function goPrev() {
      if (viewport.scrollLeft <= EDGE_TOLERANCE) {
        viewport.scrollTo({ left: maxScroll(), behavior: reduceMotion ? 'auto' : 'smooth' });
      } else {
        viewport.scrollBy({ left: -slideStep(), behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }

    function updateArrows() {
      if (loop) return; // setas sempre ativas — o carrossel dá a volta
      var max = maxScroll();
      prevBtn.disabled = viewport.scrollLeft <= 0;
      nextBtn.disabled = viewport.scrollLeft >= max;
    }

    function stopAutoplay() { if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; } }
    function startAutoplay() {
      if (!autoplayDelay || reduceMotion) return;
      stopAutoplay();
      autoplayTimer = setInterval(goNext, autoplayDelay);
    }

    prevBtn.addEventListener('click', function () { goPrev(); startAutoplay(); });
    nextBtn.addEventListener('click', function () { goNext(); startAutoplay(); });

    if (autoplayDelay) {
      root.addEventListener('mouseenter', stopAutoplay);
      root.addEventListener('mouseleave', startAutoplay);
      root.addEventListener('focusin', stopAutoplay);
      root.addEventListener('focusout', startAutoplay);
      startAutoplay();
    }

    viewport.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    updateArrows();
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Linha do tempo: a linha "cresce" conforme a seção passa pela tela ---------- */
  var timelineEl = document.querySelector('[data-timeline]');
  if (timelineEl) {
    var timelineFill = timelineEl.querySelector('[data-timeline-fill]');
    if (reduceMotion) {
      timelineFill.style.height = '100%';
    } else {
      var timelineTicking = false;
      var updateTimelineFill = function () {
        timelineTicking = false;
        var rect = timelineEl.getBoundingClientRect();
        var triggerStart = window.innerHeight * 0.75;
        var pct = (triggerStart - rect.top) / rect.height;
        pct = Math.max(0, Math.min(1, pct));
        timelineFill.style.height = (pct * 100) + '%';
      };
      var requestTimelineUpdate = function () {
        if (!timelineTicking) {
          timelineTicking = true;
          window.requestAnimationFrame(updateTimelineFill);
        }
      };
      updateTimelineFill();
      window.addEventListener('scroll', requestTimelineUpdate, { passive: true });
      window.addEventListener('resize', requestTimelineUpdate);
    }
  }

  /* ---------- Validação do formulário de contato ---------- */
  var form = document.getElementById('contact-form');
  if (form) {
    var statusEl = document.getElementById('form-status');
    var submitBtn = document.getElementById('contact-submit');

    var validators = {
      nome: function (v) { return v.trim().length >= 2 || tr('Informe seu nome completo.'); },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || tr('Informe um e-mail válido.'); },
      telefone: function (v) { return v.replace(/\D/g, '').length >= 10 || tr('Informe um telefone válido com DDD.'); }
    };

    function validateField(input) {
      var name = input.name;
      var fieldWrap = input.closest('.field');
      var errEl = form.querySelector('[data-error-for="' + input.id + '"]');
      var result = true;

      if (input.hasAttribute('required') && !input.value.trim()) {
        result = tr('Campo obrigatório.');
      } else if (validators[name] && input.value.trim()) {
        result = validators[name](input.value);
      }

      if (result === true) {
        fieldWrap.classList.remove('has-error');
        if (errEl) errEl.textContent = '';
        input.removeAttribute('aria-invalid');
        return true;
      }
      fieldWrap.classList.add('has-error');
      if (errEl) errEl.textContent = result;
      input.setAttribute('aria-invalid', 'true');
      return false;
    }

    form.querySelectorAll('input, select').forEach(function (input) {
      input.addEventListener('blur', function () { validateField(input); });
      input.addEventListener('input', function () {
        if (input.closest('.field').classList.contains('has-error')) validateField(input);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      statusEl.className = 'form-status';
      statusEl.textContent = '';

      var fields = Array.prototype.slice.call(form.querySelectorAll('input, select'));
      var firstInvalid = null;
      var allValid = true;
      fields.forEach(function (input) {
        var ok = validateField(input);
        if (!ok && !firstInvalid) firstInvalid = input;
        if (!ok) allValid = false;
      });

      if (!allValid) {
        statusEl.className = 'form-status is-error';
        statusEl.textContent = tr('Revise os campos destacados e tente novamente.');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Estado de carregamento
      submitBtn.setAttribute('data-loading', 'true');
      submitBtn.disabled = true;
      statusEl.textContent = tr('Enviando…');

      sendLead({
        origem: 'contato',
        nome: form.nome.value,
        email: form.email.value,
        telefone: form.telefone.value,
        empresa: form.empresa.value,
        mensagem: 'País: ' + form.pais.value + ' | Idioma: ' + form.idioma.value +
          ' | Prazo: ' + form.prazo.value + ' | Receita anual: ' + form.receita.value
      }).then(function () {
        submitBtn.removeAttribute('data-loading');
        submitBtn.disabled = false;
        form.reset();
        statusEl.className = 'form-status is-success';
        statusEl.textContent = tr('Recebemos seu contato. Um especialista falará com você em breve.');
      }).catch(function () {
        submitBtn.removeAttribute('data-loading');
        submitBtn.disabled = false;
        statusEl.className = 'form-status is-error';
        statusEl.textContent = tr('Não conseguimos enviar agora. Tente novamente em instantes.');
      });
    });
  }

  /* ---------- Modal genérico (usado pela calculadora e outros pop-ups) ---------- */
  function openModal(modal) {
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var firstField = modal.querySelector('input, select, textarea');
    if (firstField) firstField.focus();
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  }
  document.querySelectorAll('.modal').forEach(function (modal) {
    modal.querySelectorAll('[data-modal-close]').forEach(function (el) {
      el.addEventListener('click', function () { closeModal(modal); });
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal:not([hidden])').forEach(function (m) { closeModal(m); });
    }
  });

  /* ---------- Calculadora de impacto tributário ---------- */
  function formatBRNumber(n) { return Math.round(n).toLocaleString('pt-BR'); }
  function formatBRCurrency(n) { return 'R$ ' + formatBRNumber(n); }

  var taxCalc = document.querySelector('[data-tax-calc]');
  if (taxCalc) {
    var regimeBtns = taxCalc.querySelectorAll('[data-regime]');
    var segmentoSel = taxCalc.querySelector('[data-segmento]');
    var faturamentoInput = taxCalc.querySelector('[data-faturamento]');
    var faturamentoOut = taxCalc.querySelector('[data-faturamento-out]');
    var formBox = taxCalc.querySelector('[data-tax-calc-form]');
    var estimarBtn = taxCalc.querySelector('[data-tax-calc-submit]');
    var resultBox = taxCalc.querySelector('[data-tax-calc-result]');
    var resultFaturamento = taxCalc.querySelector('[data-result-faturamento]');
    var gaugeBrValue = taxCalc.querySelector('[data-gauge-br-value]');
    var gaugeBrFill = taxCalc.querySelector('[data-gauge-br-fill]');
    var gaugeBrBreakdown = taxCalc.querySelector('[data-gauge-br-breakdown]');
    var resultSavings = taxCalc.querySelector('[data-result-savings]');
    var taxEmailBtn = taxCalc.querySelector('[data-tax-calc-email]');
    var resetBtn = taxCalc.querySelector('[data-tax-calc-reset]');
    var currentRegime = 'real';

    // Perfis indicativos por segmento — carga tributária brasileira (com o detalhamento
    // de IBS, CBS e créditos da Reforma) e a faixa de projeção otimizada usada para
    // estimar a economia. Apenas para o pré-diagnóstico; não substitui análise técnica.
    var segmentProfiles = {
      industria: {
        cargaBR: 28, ibs: 7.2, cbs: 1.8, creditos: -2.5, splitDays: 'retém de 2 a 5 dias de caixa',
        otimMin: 4, otimMax: 6
      },
      comercio: {
        cargaBR: 30, ibs: 8.0, cbs: 2.0, creditos: -2.0, splitDays: 'retém de 3 a 6 dias de caixa',
        otimMin: 4, otimMax: 6.5
      },
      servicos: {
        cargaBR: 34, ibs: 9.5, cbs: 2.6, creditos: -1.0, splitDays: 'retém de 5 a 8 dias de caixa',
        otimMin: 3, otimMax: 5
      },
      tecnologia: {
        cargaBR: 32, ibs: 8.8, cbs: 2.4, creditos: -1.6, splitDays: 'retém de 4 a 7 dias de caixa',
        otimMin: 3.5, otimMax: 5.5
      }
    };
    var GAUGE_SCALE_MAX = 40; // referência de topo das barras (%) — a carga BR é a maior faixa
    var FX_RATE = 5.4; // câmbio aproximado BRL/USD, só para a estimativa de economia

    function fmtPct(n) {
      var r = Math.round(n * 10) / 10;
      return (r % 1 === 0 ? r.toFixed(0) : r.toFixed(1).replace('.', ',')) + '%';
    }
    function gaugeWidth(n) {
      return Math.max(4, Math.min(100, (n / GAUGE_SCALE_MAX) * 100)) + '%';
    }

    function showForm() {
      if (formBox) formBox.hidden = false;
      if (resultBox) resultBox.hidden = true;
    }
    function showResult() {
      if (formBox) formBox.hidden = true;
      if (resultBox) resultBox.hidden = false;
    }

    function updateRangeProgress() {
      if (!faturamentoInput) return;
      var min = parseFloat(faturamentoInput.min) || 0;
      var max = parseFloat(faturamentoInput.max) || 100;
      var val = parseFloat(faturamentoInput.value) || 0;
      var pct = ((val - min) / (max - min)) * 100;
      faturamentoInput.style.setProperty('--range-progress', pct + '%');
    }
    function updateFaturamentoOut() {
      if (!faturamentoInput || !faturamentoOut) return;
      faturamentoOut.textContent = formatBRNumber(faturamentoInput.value);
      updateRangeProgress();
    }

    regimeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        regimeBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        currentRegime = btn.getAttribute('data-regime');
      });
    });

    if (faturamentoInput) {
      faturamentoInput.addEventListener('input', updateFaturamentoOut);
      updateFaturamentoOut();
    }

    if (estimarBtn) {
      estimarBtn.addEventListener('click', function () {
        var faturamento = parseFloat(faturamentoInput.value) || 0;
        var segmento = segmentoSel.value;
        var profile = segmentProfiles[segmento] || segmentProfiles.industria;

        // Simples Nacional tem menos margem para aproveitar créditos não cumulativos
        // de IBS/CBS do que o Lucro Real, então a carga sobe e o crédito encolhe.
        var isSimples = currentRegime === 'simples';
        var cargaBR = profile.cargaBR + (isSimples ? 3 : 0);
        var creditos = profile.creditos * (isSimples ? 0.4 : 1);
        var otimMed = (profile.otimMin + profile.otimMax) / 2;

        if (resultFaturamento) resultFaturamento.textContent = formatBRCurrency(faturamento) + ',00';

        if (gaugeBrValue) gaugeBrValue.textContent = fmtPct(cargaBR);
        if (gaugeBrFill) gaugeBrFill.style.width = gaugeWidth(cargaBR);
        if (gaugeBrBreakdown) {
          gaugeBrBreakdown.textContent = 'IBS ' + fmtPct(profile.ibs) + ' · CBS ' + fmtPct(profile.cbs) +
            ' · Créditos ' + fmtPct(creditos) + ' · Split payment ' + profile.splitDays;
        }

        if (resultSavings) {
          var savingsUSD = Math.max(0, faturamento * (cargaBR - otimMed) / 100 / FX_RATE);
          resultSavings.textContent = '+ US$ ' + Math.round(savingsUSD).toLocaleString('pt-BR');
        }

        showResult();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', showForm);
    }

    if (taxEmailBtn) {
      taxEmailBtn.addEventListener('click', function () {
        openModal(document.getElementById('tax-calc-modal'));
      });
    }
  }

  /* ---------- Pop-up: receber resultado da calculadora por e-mail ---------- */
  var taxEmailForm = document.getElementById('tax-calc-email-form');
  if (taxEmailForm) {
    var taxEmailStatus = document.getElementById('tc-email-status');
    var taxEmailSubmitBtn = document.getElementById('tax-calc-email-submit');
    var taxEmailValidators = {
      nome: function (v) { return v.trim().length >= 2 || tr('Informe seu nome completo.'); },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || tr('Informe um e-mail válido.'); }
    };
    function validateTaxEmailField(input) {
      var fieldWrap = input.closest('.field');
      var errEl = taxEmailForm.querySelector('[data-error-for="' + input.id + '"]');
      var result = true;
      if (input.hasAttribute('required') && !input.value.trim()) {
        result = tr('Campo obrigatório.');
      } else if (taxEmailValidators[input.name] && input.value.trim()) {
        result = taxEmailValidators[input.name](input.value);
      }
      if (result === true) {
        fieldWrap.classList.remove('has-error');
        if (errEl) errEl.textContent = '';
        return true;
      }
      fieldWrap.classList.add('has-error');
      if (errEl) errEl.textContent = result;
      return false;
    }
    taxEmailForm.querySelectorAll('input').forEach(function (input) {
      input.addEventListener('blur', function () { validateTaxEmailField(input); });
      input.addEventListener('input', function () {
        if (input.closest('.field').classList.contains('has-error')) validateTaxEmailField(input);
      });
    });
    taxEmailForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var fields = Array.prototype.slice.call(taxEmailForm.querySelectorAll('input'));
      var allValid = true, firstInvalid = null;
      fields.forEach(function (input) {
        var ok = validateTaxEmailField(input);
        if (!ok && !firstInvalid) firstInvalid = input;
        if (!ok) allValid = false;
      });
      if (!allValid) {
        taxEmailStatus.className = 'form-status is-error';
        taxEmailStatus.textContent = tr('Revise os campos destacados e tente novamente.');
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      taxEmailSubmitBtn.setAttribute('data-loading', 'true');
      taxEmailSubmitBtn.disabled = true;
      taxEmailStatus.className = 'form-status';
      taxEmailStatus.textContent = tr('Enviando…');

      var resultFaturamentoEl = document.querySelector('[data-result-faturamento]');
      var resultCargaEl = document.querySelector('[data-gauge-br-value]');
      var resultSavingsEl = document.querySelector('[data-result-savings]');

      sendLead({
        origem: 'calculadora',
        nome: taxEmailForm.nome.value,
        email: taxEmailForm.email.value,
        mensagem: 'Resultado da calculadora — Faturamento: ' + (resultFaturamentoEl ? resultFaturamentoEl.textContent : '') +
          ' | Carga tributária BR: ' + (resultCargaEl ? resultCargaEl.textContent : '') +
          ' | Economia anual estimada: ' + (resultSavingsEl ? resultSavingsEl.textContent : '')
      }).then(function () {
        taxEmailSubmitBtn.removeAttribute('data-loading');
        taxEmailSubmitBtn.disabled = false;
        taxEmailForm.reset();
        taxEmailStatus.className = 'form-status is-success';
        taxEmailStatus.textContent = tr('Pronto! Enviamos o resultado para o seu e-mail.');
        setTimeout(function () { closeModal(document.getElementById('tax-calc-modal')); }, 1600);
      }).catch(function () {
        taxEmailSubmitBtn.removeAttribute('data-loading');
        taxEmailSubmitBtn.disabled = false;
        taxEmailStatus.className = 'form-status is-error';
        taxEmailStatus.textContent = tr('Não conseguimos enviar agora. Tente novamente em instantes.');
      });
    });
  }

  /* ---------- Formulário Seja Parceiro / Indique ---------- */
  var partnerFormRoot = document.querySelector('[data-partner-form]');
  if (partnerFormRoot) {
    var partnerModeBtns = partnerFormRoot.querySelectorAll('[data-partner-mode]');
    var partnerFields = document.querySelectorAll('[data-partner-field]');
    var partnerSubmitLabel = partnerFormRoot.querySelector('[data-partner-submit-label]');
    var indicadoNomeInput = document.getElementById('pf-ind-nome');

    var partnerLabels = {
      parceiro: 'Quero me tornar um Parceiro Oficial',
      indicar: 'Quero enviar minha indicação'
    };

    function setPartnerMode(mode) {
      partnerModeBtns.forEach(function (b) {
        b.classList.toggle('is-active', b.getAttribute('data-partner-mode') === mode);
      });
      partnerFields.forEach(function (field) {
        var isMatch = field.getAttribute('data-partner-field') === mode;
        field.hidden = !isMatch;
      });
      if (indicadoNomeInput) {
        if (mode === 'indicar') indicadoNomeInput.setAttribute('required', 'required');
        else indicadoNomeInput.removeAttribute('required');
      }
      if (partnerSubmitLabel) partnerSubmitLabel.textContent = partnerLabels[mode] || partnerLabels.parceiro;
    }

    partnerModeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () { setPartnerMode(btn.getAttribute('data-partner-mode')); });
    });

    // Botões espalhados pela página que já chegam com um modo pré-selecionado
    // (ex.: "Indicação Bronze" abre no modo indicar; "Seja um Parceiro Oficial" no modo parceiro)
    document.querySelectorAll('[data-partner-preset]').forEach(function (link) {
      link.addEventListener('click', function () { setPartnerMode(link.getAttribute('data-partner-preset')); });
    });

    setPartnerMode('parceiro');

    var partnerForm = document.getElementById('partner-form-fields');
    if (partnerForm) {
      var partnerStatus = document.getElementById('partner-form-status');
      var partnerSubmitBtn = document.getElementById('partner-form-submit');
      var partnerValidators = {
        nome: function (v) { return v.trim().length >= 2 || tr('Informe seu nome completo.'); },
        email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || tr('Informe um e-mail válido.'); },
        telefone: function (v) { return v.replace(/\D/g, '').length >= 10 || tr('Informe um telefone válido com DDD.'); },
        indicado_nome: function (v) { return v.trim().length >= 2 || tr('Informe o nome do indicado.'); }
      };
      function validatePartnerField(input) {
        var fieldWrap = input.closest('.field');
        if (fieldWrap.hidden) return true;
        var errEl = partnerForm.querySelector('[data-error-for="' + input.id + '"]');
        var result = true;
        if (input.hasAttribute('required') && !input.value.trim()) {
          result = tr('Campo obrigatório.');
        } else if (partnerValidators[input.name] && input.value.trim()) {
          result = partnerValidators[input.name](input.value);
        }
        if (result === true) {
          fieldWrap.classList.remove('has-error');
          if (errEl) errEl.textContent = '';
          return true;
        }
        fieldWrap.classList.add('has-error');
        if (errEl) errEl.textContent = result;
        return false;
      }
      partnerForm.querySelectorAll('input, select').forEach(function (input) {
        input.addEventListener('blur', function () { validatePartnerField(input); });
        input.addEventListener('input', function () {
          if (input.closest('.field').classList.contains('has-error')) validatePartnerField(input);
        });
      });
      partnerForm.addEventListener('submit', function (e) {
        e.preventDefault();
        partnerStatus.className = 'form-status';
        partnerStatus.textContent = '';
        var fields = Array.prototype.slice.call(partnerForm.querySelectorAll('input, select')).filter(function (input) {
          return !input.closest('.field').hidden;
        });
        var allValid = true, firstInvalid = null;
        fields.forEach(function (input) {
          var ok = validatePartnerField(input);
          if (!ok && !firstInvalid) firstInvalid = input;
          if (!ok) allValid = false;
        });
        if (!allValid) {
          partnerStatus.className = 'form-status is-error';
          partnerStatus.textContent = tr('Revise os campos destacados e tente novamente.');
          if (firstInvalid) firstInvalid.focus();
          return;
        }
        partnerSubmitBtn.setAttribute('data-loading', 'true');
        partnerSubmitBtn.disabled = true;
        partnerStatus.textContent = tr('Enviando…');

        var currentMode = partnerFormRoot.querySelector('.tax-calc__toggle-btn.is-active').getAttribute('data-partner-mode');
        var mensagemPartes = [];
        if (currentMode === 'indicar') {
          mensagemPartes.push('Indicado: ' + partnerForm.indicado_nome.value);
          if (partnerForm.indicado_email.value) mensagemPartes.push('E-mail do indicado: ' + partnerForm.indicado_email.value);
          if (partnerForm.indicado_telefone.value) mensagemPartes.push('Telefone do indicado: ' + partnerForm.indicado_telefone.value);
        } else {
          if (partnerForm.empresa.value) mensagemPartes.push('Escritório/Empresa: ' + partnerForm.empresa.value);
          if (partnerForm.tipo.value) mensagemPartes.push('Tipo de parceria: ' + partnerForm.tipo.value);
        }
        if (partnerForm.mensagem.value) mensagemPartes.push(partnerForm.mensagem.value);

        sendLead({
          origem: currentMode === 'indicar' ? 'indicacao' : 'parceiro',
          nome: partnerForm.nome.value,
          email: partnerForm.email.value,
          telefone: partnerForm.telefone.value,
          empresa: partnerForm.empresa.value,
          mensagem: mensagemPartes.join(' | ')
        }).then(function () {
          partnerSubmitBtn.removeAttribute('data-loading');
          partnerSubmitBtn.disabled = false;
          partnerForm.reset();
          setPartnerMode(currentMode);
          partnerStatus.className = 'form-status is-success';
          partnerStatus.textContent = tr('Recebemos sua solicitação. Nosso time falará com você em breve.');
        }).catch(function () {
          partnerSubmitBtn.removeAttribute('data-loading');
          partnerSubmitBtn.disabled = false;
          partnerStatus.className = 'form-status is-error';
          partnerStatus.textContent = tr('Não conseguimos enviar agora. Tente novamente em instantes.');
        });
      });
    }
  }
})();
