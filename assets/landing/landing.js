/* Al-Lammah landing v2 — vanilla JS, no dependencies.
   Everything here is progressive: the page reads fine without it. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = mqReduce.matches;
  var hasIO = 'IntersectionObserver' in window;
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function later(fn, ms) { return setTimeout(fn, ms); }

  /* ── header shadow (sentinel instead of a scroll listener) ── */
  var head = $('#nav');
  if (hasIO && head) {
    var sentinel = doc.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:0;height:8px;width:1px;pointer-events:none';
    doc.body.prepend(sentinel);
    new IntersectionObserver(function (e) { head.classList.toggle('scrolled', !e[0].isIntersecting); }).observe(sentinel);
  }
  // close the mobile menu after choosing a link
  $$('.menu-panel a').forEach(function (a) { a.addEventListener('click', function () { $('.menu').removeAttribute('open'); }); });

  /* ── reveal on scroll ── */
  var revealEls = $$('[data-reveal], [data-reveal-line]');
  if (!hasIO || reduce) { revealEls.forEach(function (el) { el.classList.add('in'); }); }
  else {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { rio.observe(el); });
  }

  /* ── number tween ── */
  function tween(el, to, dur, prefix) {
    prefix = prefix || '';
    if (reduce) { el.textContent = prefix + to; return; }
    var from = parseInt(el.textContent.replace(/\D/g, ''), 10) || 0, t0 = performance.now();
    if (el._raf) cancelAnimationFrame(el._raf);
    (function step(now) {
      var p = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = prefix + Math.round(from + (to - from) * e);
      if (p < 1) el._raf = requestAnimationFrame(step);
    })(t0);
  }

  /* stats counters */
  var stats = $('#stats');
  if (stats && hasIO && !reduce) {
    var counters = $$('[data-count]', stats);
    counters.forEach(function (el) { el.textContent = (el.dataset.prefix || '') + '0'; });
    new IntersectionObserver(function (es, o) {
      if (!es[0].isIntersecting) return;
      counters.forEach(function (el) { tween(el, +el.dataset.count, 1600, el.dataset.prefix); });
      o.disconnect();
    }, { threshold: 0.5 }).observe(stats);
  }

  /* ── falcon clips: transparent video (HEVC-alpha for Safari, VP9-alpha elsewhere), poster first ── */
  var ua = navigator.userAgent;
  var isSafari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(ua) || (/iP(hone|ad|od)/.test(ua) && !/CriOS|FxiOS/.test(ua));
  var saveData = navigator.connection && navigator.connection.saveData;
  function makeVideo(name, poster) {
    var v = doc.createElement('video');
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    v.preload = 'auto'; v.className = 'fv';
    if (poster) v.poster = poster;
    v.src = 'assets/landing/falcon/' + name + (isSafari ? '.mov' : '.webm');
    return v;
  }
  function attachFalcon(box, name, swapImg) {
    if (reduce || saveData || box._v) return null;
    var img = $('img', box);
    var v = makeVideo(name, img && img.getAttribute('src'));
    if (img) { v.width = img.width || img.getAttribute('width'); v.height = img.height || img.getAttribute('height'); }
    v.style.opacity = '0';
    v.addEventListener('playing', function () { v.style.opacity = '1'; if (img && swapImg !== false) img.style.opacity = '0'; }, { once: true });
    v.addEventListener('error', function () { v.remove(); box._v = null; }, { once: true });
    box.appendChild(v);
    box._v = v;
    return v;
  }
  function playWhenVisible(box, v) {
    if (!v || !hasIO) return;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); });
    }, { threshold: 0.05 }).observe(box);
  }
  // section falcons load only when they come near the viewport
  var falconBoxes = $$('[data-falcon]');
  if (hasIO && !reduce) {
    var fio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        fio.unobserve(e.target);
        var box = e.target, v = attachFalcon(box, box.dataset.falcon);
        if (v) {
          if (box.classList.contains('art')) { v.style.cssText = ''; v.className = 'fv'; v.addEventListener('playing', function () { v.classList.add('on'); var s = $('.still', box); if (s) s.classList.add('hide'); }, { once: true }); }
          playWhenVisible(box, v);
        }
      });
    }, { rootMargin: '300px 0px' });
    falconBoxes.forEach(function (b) { fio.observe(b); });
  }

  /* ── HERO: one round of the real game, on loop ── */
  var scr = $('#game');
  if (scr) heroLoop(scr);

  function heroLoop(scr) {
    var sc = [null, $('#sc1'), $('#sc2')], score = [0, 0, 0];
    var heroF = $('#heroFalcon');
    var q = { cat: $('#qCat'), pts: $('#qPts'), img: $('#qImg'), alt: $('#qAlt'), q: $('#qQ'), a: $('#qA'), a2: $('#qA2'), who: $('#qWho'), n: $('#qN') };
    var fly = $('#fly'), say = $('#sayT'), turnT = $('#turnT'), conf = $('#conf');
    var rounds = [
      { team: 1, cell: 'cA', cat: 'حيوانات', pts: 200, img: 'hippo-zoom', alt: 'hippo-full', q: 'ما هذا الحيوان؟', a: 'فرس النهر', say: 'فرس النهر!' },
      { team: 2, cell: 'cB', cat: 'معالم', pts: 300, img: 'clock-zoom', alt: 'bigben-full', q: 'ما هذا المعلم؟', a: 'ساعة بيغ بن', say: 'بيغ بن!' },
      { team: 1, cell: 'cC', cat: 'أفلام', pts: 100, img: 'hippo-zoom', alt: 'hippo-full', q: 'ما هذا الحيوان؟', a: 'فرس النهر', say: 'فرس النهر!', quick: true },
      { team: 2, cell: 'cD', cat: 'أعلام', pts: 100, img: 'clock-zoom', alt: 'bigben-full', q: 'ما هذا المعلم؟', a: 'ساعة بيغ بن', say: 'بيغ بن!', quick: true }
    ];
    var timers = [], idx = 0, running = false, visible = true;
    function T(fn, ms) { timers.push(later(fn, ms)); }
    function clearAll() { timers.forEach(clearTimeout); timers = []; }
    function cls(add, c) { scr.classList[add ? 'add' : 'remove'](c); }

    // confetti pieces (team colours + gold)
    var colours = ['#7A1A2C', '#C9973A', '#F3D9A4', '#1F3A5F', '#ffffff'];
    for (var i = 0; i < 26; i++) {
      var p = doc.createElement('i');
      p.style.left = (8 + Math.random() * 84) + '%';
      p.style.background = colours[i % colours.length];
      p.style.setProperty('--cx', (Math.random() * 120 - 60) + 'px');
      p.style.setProperty('--cr', (Math.random() * 720 - 360) + 'deg');
      p.style.setProperty('--cd', (Math.random() * 0.35) + 's');
      conf.appendChild(p);
    }

    // preload question images once the page has loaded
    later(function () {
      ['clock-zoom', 'bigben-full'].forEach(function (n) { var im = new Image(); im.src = 'assets/landing/ui/' + n + '.webp'; });
    }, 5000);

    // hero falcon: point (idle) + cheer, as transparent video after load
    var fPoint = null, fCheer = null;
    function falconVideos() {
      if (reduce || saveData || !heroF) return;
      var imgs = $$('img', heroF);
      fPoint = makeVideo('point', imgs[0].getAttribute('src')); fPoint.classList.add('point');
      fPoint.addEventListener('playing', function () {
        imgs[0].style.visibility = 'hidden';
        // the cheering clip is only needed a few seconds later, so fetch it after the first one plays
        later(function () {
          fCheer = makeVideo('cheer', imgs[1].getAttribute('src')); fCheer.classList.add('cheer');
          fCheer.addEventListener('canplay', function () { imgs[1].style.visibility = 'hidden'; }, { once: true });
          heroF.appendChild(fCheer);
        }, 1500);
      }, { once: true });
      heroF.appendChild(fPoint);
      var pp = fPoint.play(); if (pp && pp.catch) pp.catch(function () {});
    }
    function cheer(on) {
      if (!heroF) return;
      heroF.classList.toggle('is-cheer', on);
      if (fCheer) { if (on) { fCheer.currentTime = 0; var pp = fCheer.play(); if (pp && pp.catch) pp.catch(function () {}); } else later(function () { fCheer.pause(); }, 400); }
    }

    function setTrack() {
      var goal = 1600;
      scr.style.setProperty('--pm', Math.max(0.04, Math.min(1, score[1] / goal)));
      scr.style.setProperty('--pn', Math.max(0.04, Math.min(1, score[2] / goal)));
    }

    function aimFly(team) {
      var s = scr.getBoundingClientRect(), c = sc[team].getBoundingClientRect(), f = fly.getBoundingClientRect();
      // fly starts centred on left:50%; measure from that start point (without transform)
      var startX = s.left + s.width / 2, startY = s.top + parseFloat(getComputedStyle(fly).top);
      scr.style.setProperty('--fx', (c.left + c.width / 2 - startX - f.width / 2) + 'px');
      scr.style.setProperty('--fy', (c.top + c.height / 2 - startY - f.height / 2) + 'px');
    }

    function round() {
      var r = rounds[idx % rounds.length], other = r.team === 1 ? 2 : 1, k = r.quick ? 0.75 : 1;
      if (idx > 0 && idx % rounds.length === 0) { // new game: reset board and scores
        $$('.cell.used', scr).forEach(function (c) { if (!c.dataset.keep) c.classList.remove('used'); });
        score = [0, 0, 0]; tween(sc[1], 0, 600); tween(sc[2], 0, 600); setTrack();
      }
      scr.dataset.team = r.team;
      q.cat.textContent = r.cat; q.pts.textContent = r.pts; q.q.textContent = r.q; q.a.textContent = r.a; q.a2.textContent = r.a;
      q.who.textContent = 'سؤال ' + (r.team === 1 ? 'الصقور' : 'النمور');
      q.img.src = 'assets/landing/ui/' + r.img + '.webp'; q.alt.src = 'assets/landing/ui/' + r.alt + '.webp';
      q.n.textContent = '30'; say.textContent = r.say; fly.textContent = '+' + r.pts;
      var cell = $('#' + r.cell);
      T(function () { cell.classList.add('hot'); }, 600 * k);
      T(function () { cell.classList.remove('hot'); cell.classList.add('press'); }, 1500 * k);
      T(function () {
        scr.style.setProperty('--ringoff', '0'); void scr.offsetWidth; scr.style.setProperty('--ringoff', '60');
        cls(true, 's-q');
      }, 1800 * k);
      [1, 2, 3].forEach(function (s) { T(function () { q.n.textContent = String(30 - s); }, 1800 * k + s * 1000 * k); });
      T(function () { cls(true, 'say'); }, 3300 * k);
      T(function () { cls(false, 'say'); cls(true, 's-r'); }, 4900 * k);
      T(function () { $(r.team === 1 ? '#sbM' : '#sbN').classList.add('press'); }, 6000 * k);
      T(function () {
        cls(false, 's-r'); cls(false, 's-q');
        cell.classList.remove('press'); cell.classList.add('used');
        $$('.sbtn', scr).forEach(function (b) { b.classList.remove('press'); });
        aimFly(r.team); cls(true, 'flying'); cls(true, 'burst'); cheer(true);
      }, 6500 * k);
      T(function () {
        score[r.team] += r.pts; tween(sc[r.team], score[r.team], 700);
        sc[r.team].classList.remove('bump'); void sc[r.team].offsetWidth; sc[r.team].classList.add('bump');
        setTrack();
      }, 7300 * k);
      T(function () { cls(false, 'flying'); cls(false, 'burst'); }, 7900 * k);
      T(function () { cheer(false); scr.dataset.next = other; turnT.textContent = 'دور ' + (other === 1 ? 'الصقور' : 'النمور'); cls(true, 's-turn'); }, 8300 * k);
      T(function () { scr.dataset.team = other; }, 8700 * k);
      T(function () { cls(false, 's-turn'); idx++; if (running) round(); }, 9500 * k);
    }

    function start() { if (running || reduce) return; running = true; round(); }
    function stop() { running = false; clearAll(); ['s-q', 's-r', 'say', 'flying', 'burst', 's-turn'].forEach(function (c) { cls(false, c); }); $$('.hot,.press', scr).forEach(function (c) { c.classList.remove('hot', 'press'); }); cheer(false); }
    $$('.cell.used', scr).forEach(function (c) { c.dataset.keep = '1'; });

    if (reduce) return;
    // start just after first paint so the page feels alive within the first second
    later(start, 650);
    if (doc.readyState === 'complete') later(falconVideos, 200); else window.addEventListener('load', function () { later(falconVideos, 200); });
    if (hasIO) new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && !doc.hidden) { start(); if (fPoint) fPoint.play().catch(function () {}); }
      else { stop(); if (fPoint) fPoint.pause(); }
    }, { threshold: 0.2 }).observe(scr);
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) stop(); else if (visible) start(); });
  }

  /* ── story boxes: play when on screen, reset when fully off screen ── */
  var plays = $$('[data-play]');
  if (hasIO && !reduce) {
    var pio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var b = e.target;
        if (e.isIntersecting && e.intersectionRatio >= 0.45 && !b.classList.contains('play')) { b.classList.add('play'); if (b.classList.contains('ask')) runAsk(b); if (b.classList.contains('win')) runWin(b); }
        else if (!e.isIntersecting && b.classList.contains('play')) { b.classList.remove('play', 'say1', 'say2', 'revealed'); (b._t || []).forEach(clearTimeout); b._t = []; resetWin(b); }
      });
    }, { threshold: [0, 0.45] });
    plays.forEach(function (b) { pio.observe(b); });
  } else {
    plays.forEach(function (b) { b.classList.add('play', 'revealed', 'say2'); $$('.win [data-to]').forEach(function (n) { n.textContent = n.dataset.to; }); });
  }
  function runAsk(b) {
    var n = $('[data-timer]', b), t = b._t = [];
    n.textContent = '30';
    for (var s = 1; s <= 5; s++) (function (s) { t.push(later(function () { n.textContent = String(30 - s); }, s * 1000)); })(s);
    t.push(later(function () { b.classList.add('say1'); }, 1100));
    t.push(later(function () { b.classList.add('say2'); $('.b1', b).classList.add('wrong'); }, 2600));
    t.push(later(function () { b.classList.add('revealed'); b.classList.remove('say1'); }, 4600));
  }
  function runWin(b) {
    $$('[data-to]', b).forEach(function (n) { tween(n, +n.dataset.to, 2200); });
  }
  function resetWin(b) { $$('[data-to]', b).forEach(function (n) { if (n._raf) cancelAnimationFrame(n._raf); n.textContent = '0'; }); var w = $('.b1.wrong', b); if (w) w.classList.remove('wrong'); }

  /* ── category wall: pause while off screen (saves battery) ── */
  var wall = $('#wall');
  if (wall && hasIO) new IntersectionObserver(function (es) { wall.classList.toggle('paused', !es[0].isIntersecting); }).observe(wall);

  /* ── helpers: pick 3 of 5 ── */
  var hcards = $$('.hcard'), dots = $$('.pickbar .dots i'), pickTxt = $('#pickTxt');
  function picked() { return hcards.filter(function (h) { return h.getAttribute('aria-pressed') === 'true'; }); }
  hcards.forEach(function (h) {
    h.addEventListener('click', function () {
      var on = h.getAttribute('aria-pressed') === 'true';
      if (!on && picked().length >= 3) { h.classList.remove('shake'); void h.offsetWidth; h.classList.add('shake'); pickTxt.textContent = 'ثلاث بس! شيل وحدة وبدّل'; return; }
      h.setAttribute('aria-pressed', on ? 'false' : 'true');
      var c = picked().length;
      dots.forEach(function (d, i) { d.classList.toggle('on', i < c); });
      pickTxt.textContent = c === 3 ? 'تمام! فريقكم جاهز' : 'اخترتوا ' + c + ' من 3';
    });
  });

  /* ── screenshots carousel buttons ── */
  var st = $('#strack');
  if (st) {
    var stepBy = function (dir) { var s = $('.shot', st); var w = s ? s.getBoundingClientRect().width + 20 : 300; st.scrollBy({ left: dir * w, behavior: reduce ? 'auto' : 'smooth' }); };
    // RTL: "next" moves toward the end (left)
    var nx = $('#sNext'), pv = $('#sPrev');
    if (nx) nx.addEventListener('click', function () { stepBy(-1); });
    if (pv) pv.addEventListener('click', function () { stepBy(1); });
  }

  mqReduce.addEventListener && mqReduce.addEventListener('change', function () { location.reload(); });
})();
