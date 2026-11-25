const LEAD_ENDPOINT = 'https://lead-relay.leestygpt.workers.dev/lead/27UD4AXXF6';

(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const fmt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
  const root = document.documentElement;
  root.classList.add('js');

  const start = () => {
    const hasGsap = !!(window.gsap && window.ScrollTrigger);
    const animate = hasGsap && !reduce;
    let lenis = null;

    /* ---------- шапка, меню, якоря ---------- */
    const bar = $('#bar'), nav = $('#nav'), burger = $('#burger');
    const onScroll = () => bar.classList.toggle('scrolled', scrollY > 8);
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
    const closeMenu = () => { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); };
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open);
    });
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const t = $(id); if (!t) return;
      e.preventDefault(); closeMenu();
      const y = t.getBoundingClientRect().top + scrollY - (id === '#statement' ? 0 : 68);
      if (lenis) lenis.scrollTo(y, { duration: 1.3 }); else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    }));

    /* ---------- форматы: вкладки ---------- */
    const panels = $$('.panel'), tabs = $$('#tabs [data-pill-item]');
    const showPanel = i => {
      panels.forEach((p, k) => { p.hidden = k !== i; });
      const p = panels[i];
      if (animate) gsap.fromTo(p, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .6, ease: 'power3.out', clearProps: 'all' });
    };
    panels.forEach((p, k) => { p.hidden = k !== 0; });
    tabs.forEach((t, i) => t.addEventListener('click', () => showPanel(i)));

    /* ---------- калькулятор ---------- */
    const budget = $('#budget'), budgetOut = $('#budgetOut'), rev = $('#rev');
    const resBig = $('#resBig'), resSmall = $('#resSmall'), formBudget = $('#formBudget');
    const chips = $$('#chips [data-pill-item]');
    let touched = false, shown = { a: 0, b: 0 }, raf = 0;
    const numFmt = n => fmt(n);
    const calc = () => {
      const b = +budget.value;
      budget.parentElement.style.setProperty('--p', ((b - budget.min) / (budget.max - budget.min)).toFixed(4));
      budgetOut.textContent = numFmt(b);
      const r = parseInt(rev.value.replace(/\D/g, ''), 10) || 0;
      if (touched) formBudget.value = numFmt(b);
      if (r > 0) {
        const month = r * 0.3, ratio = r / b;
        resBig.innerHTML = '+' + numFmt(month).replace(' ₽', '') + ' ₽ выручки в месяц';
        resSmall.textContent = 'Сейчас каждый рубль бюджета возвращает ' + ratio.toFixed(1).replace('.', ',') + ' ₽ выручки. Плюс 30% при том же бюджете — это ' + numFmt(month * 12) + ' в год.';
      } else {
        resBig.textContent = numFmt(b * 12) + ' в год';
        resSmall.textContent = 'Столько вы вкладываете в маркетинг. Если вы не знаете, что возвращается с этих денег, диагностика начинается с этого вопроса. Впишите выручку выше, и я покажу, как выглядит «+30%».';
      }
    };
    budget.addEventListener('input', () => {
      touched = true;
      calc();
    });
    chips.forEach(c => c.addEventListener('click', () => { budget.value = c.dataset.v; touched = true; calc(); }));
    rev.addEventListener('input', () => {
      const d = rev.value.replace(/\D/g, '');
      rev.value = d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '';
      touched = true; calc();
    });
    calc();

    /* ---------- счётчики «обо мне» ---------- */
    $$('[data-count]').forEach(el => {
      const target = +el.dataset.count, tail = el.textContent.replace(/[\d\s]/g, '');
      const run = () => {
        if (reduce) return;
        const t0 = performance.now();
        const tick = now => {
          const k = clamp((now - t0) / 1200);
          el.textContent = Math.round(target * (1 - Math.pow(1 - k, 4))) + (k < 1 ? '' : tail);
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      };
      if (!('IntersectionObserver' in window) || reduce) return;
      el.textContent = '0';
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { run(); io.disconnect(); } }), { threshold: .6 });
      io.observe(el);
    });

    /* ---------- выписка: детерминированная отрисовка по прогрессу p ---------- */
    const scene = $('#statement'), sheet = $('#sheet');
    const nb = '\u00a0';
    const money = n => n >= 1e6 ? (n / 1e6).toFixed(2).replace('.', ',') + nb + 'млн' + nb + '₽' : Math.round(n / 1000) + nb + 'тыс.' + nb + '₽';
    const rows = $$('.row', sheet).map(el => ({
      el, bar: $('.row__bar i', el), s: $('.row__s', el), r: $('.row__r', el),
      spend: +el.dataset.spend, ret: +el.dataset.ret, kind: el.dataset.ok, txt: el.dataset.txt || ''
    }));
    const freed = rows.filter(r => r.kind === '0').reduce((a, r) => a + r.spend, 0);
    const okSum = rows.filter(r => r.kind === '1').reduce((a, r) => a + r.spend, 0);
    rows.forEach(r => { if (r.kind === '1') r.final = r.spend + freed * r.spend / okSum; });
    const MAXB = 370000, caps = $$('.cap'), sumNow = $('#sumNow'), sumSt = $('#sumSt'), gain = $('#gain');
    let lastStage = -1, lastSt = '';
    const paint = p => {
      let sum = 0;
      rows.forEach((r, i) => {
        const k = clamp((p - (.2 + i * .045)) / .04);
        const c = clamp((p - .54) / .18), d = clamp((p - .76) / .2);
        const spend = r.kind === '1' ? r.spend + (r.final - r.spend) * d : r.kind === '0' ? r.spend * (1 - c) : r.spend;
        sum += spend;
        r.s.textContent = money(spend);
        r.bar.style.setProperty('--w', (spend / MAXB).toFixed(3));
        r.r.textContent = k <= 0 ? '?' : (r.txt ? (k > .6 ? r.txt : '…') : money(r.ret * k));
        r.el.classList.toggle('is-q', k <= 0);
        r.el.classList.toggle('is-ok', k >= 1 && r.kind === '1');
        r.el.classList.toggle('is-bad', k >= 1 && r.kind === '0');
        r.el.classList.toggle('is-cut', r.kind === '0' && c > .35);
      });
      sumNow.textContent = money(sum);
      const st = p < .2 ? 'Что принесли эти деньги, неизвестно.'
        : p < .5 ? 'Считаем, что вернулось с каждого рубля…'
        : p < .54 ? '62% бюджета, около 440 тыс. ₽, не окупается.'
        : p < .74 ? 'Отключаем около 440 тыс. ₽, выручка теряет 134 тыс. ₽ (2%).'
        : 'Те же 712 тыс. ₽ работают там, где окупаются.';
      if (st !== lastSt) { sumSt.textContent = st; lastSt = st; }
      const stage = p < .2 ? 0 : p < .52 ? 1 : p < .76 ? 2 : 3;
      if (stage !== lastStage) { caps.forEach((c, i) => c.classList.toggle('is-on', i === stage)); lastStage = stage; }
      gain.classList.toggle('is-on', p > .9);
    };

    /* ---------- без анимации: итоговое состояние ---------- */
    if (!animate) { paint(1); caps.forEach(c => c.classList.add('is-on')); gain.classList.add('is-on'); }
    else {
      gsap.registerPlugin(ScrollTrigger);
      lenis = new Lenis({ lerp: .09 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);

      /* hero */
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.from('.hero h1', { y: 50, opacity: 0, duration: 1.3 })
        .from('.hero .lead, .hero__act, .hero__who', { y: 26, opacity: 0, duration: 1, stagger: .09 }, .25)
        .from('.hero__pic > img', { y: 40, opacity: 0, duration: 1.4 }, .15)
        .from('.slip', { y: 36, opacity: 0, rotate: -2, duration: 1.2 }, .6);

      /* заголовки в масках */
      $$('h2.mask').forEach(h => {
        const t = h.textContent; h.setAttribute('aria-label', t);
        h.innerHTML = `<span class="ln" aria-hidden="true"><i>${t}</i></span>`;
        gsap.from(h.querySelector('i'), { yPercent: 112, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%' } });
      });

      /* манифест по словам */
      const m = $('#manifest'), words = m.textContent.trim().split(/\s+/);
      m.setAttribute('aria-label', m.textContent.trim());
      m.innerHTML = words.map(w => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
      gsap.to('#manifest .w', { opacity: 1, ease: 'none', stagger: .12, scrollTrigger: { trigger: m, start: 'top 82%', end: 'bottom 48%', scrub: true } });

      /* сцена «Выписка»: прогресс скролла ведёт цифры */
      scene.classList.add('scene--on');
      const S = { p: 0 };
      paint(0);
      gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: scene, start: 'top top', end: '+=430%', pin: '.scene__pin', scrub: .6, anticipatePin: 1 } })
        .to(S, { p: 1, duration: 1, onUpdate: () => paint(S.p) });

      /* бегущая строка, скорость связана со скроллом */
      const mq = $('#marq'); let x = 0;
      gsap.ticker.add(() => {
        x -= .7 + Math.abs(lenis.velocity) * .4;
        const half = mq.scrollWidth / 2; if (-x >= half) x += half;
        mq.style.transform = `translate3d(${x}px,0,0)`;
      });

      /* 8 недель: линия заполняется по скроллу */
      gsap.to('#trackFill', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '#track', start: 'top 75%', end: 'bottom 55%', scrub: true } });
      gsap.from('.track__list li', { y: 30, opacity: 0, duration: 1, stagger: .12, ease: 'power3.out', scrollTrigger: { trigger: '#track', start: 'top 78%' } });

      addEventListener('load', () => ScrollTrigger.refresh());
      document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
    }

    /* ---------- маска телефона / Telegram ---------- */
    $$('input[type="tel"]').forEach(input => input.addEventListener('input', e => {
      const raw = e.target.value;
      if (/[a-zA-Zа-яА-Я@_]/.test(raw)) return;
      let v = raw.replace(/\D/g, '');
      if (!v) { e.target.value = ''; return; }
      if (v[0] === '8') v = '7' + v.slice(1);
      if (v[0] !== '7') v = '7' + v;
      v = v.slice(0, 11);
      let out = '+7';
      if (v.length > 1) out += ' (' + v.slice(1, 4);
      if (v.length >= 4) out += ') ' + v.slice(4, 7);
      if (v.length >= 7) out += '-' + v.slice(7, 9);
      if (v.length >= 9) out += '-' + v.slice(9, 11);
      e.target.value = out;
    }));

    /* ---------- форма → Worker → Telegram ---------- */
    const form = $('#leadForm'), msg = $('#formMsg');
    form && form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]'), orig = btn.textContent;
      const payload = {}; new FormData(form).forEach((v, k) => { payload[k] = v; });
      if (payload._gotcha) return;
      if (!payload.consent) { msg.textContent = 'Отметьте согласие на обработку персональных данных.'; return; }
      delete payload.consent;
      if (!payload.name || !payload.phone) { msg.textContent = 'Заполните имя и контакт.'; return; }
      payload.comment = 'Что беспокоит: ' + payload.topic + (payload.budget ? '. Бюджет на маркетинг в месяц: ' + payload.budget : '');
      btn.disabled = true; btn.textContent = 'Отправляем...'; msg.textContent = '';
      try {
        const r = await fetch(LEAD_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        msg.textContent = 'Заявка отправлена. Свяжусь с вами, чтобы согласовать время.'; form.reset();
      } catch (err) { console.error(err); msg.textContent = 'Не отправилось. Попробуйте ещё раз или напишите в MAX.'; }
      finally { btn.disabled = false; btn.textContent = orig; }
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
