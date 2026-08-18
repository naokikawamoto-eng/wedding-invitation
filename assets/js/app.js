/* ============================================================
 *  出欠フォームの送信先設定
 *  ------------------------------------------------------------
 *  Google スプレッドシートへ集計する（google-apps-script/Code.gs）。
 *  ウェブアプリの URL を endpoint に入れる。
 * ============================================================ */
var RSVP = {
  endpoint: 'https://script.google.com/macros/s/AKfycbyuyHTrmf8W_qHkMasXjNm5tQ9ioxugRgypj8a5bvfZ-wP7ztoxNOQg9Q_1EW4RRb-A/exec',
  mode: 'no-cors'
};

(function(){
  'use strict';

  /* ---- particles.js（本家 action23 と同じ演出：金の光の粒） ---- */
  (function(){
    if(!window.particlesJS) return;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    particlesJS('particles-js', {
      particles: {
        number:  { value: 85, density: { enable: false, value_area: 900 } },
        color:   { value: ['#ffffff', '#F1E5D6', '#E4BC7B', '#E6CB87'] },
        shape:   { type: 'circle' },
        opacity: { value: .85, random: true,
                   anim: { enable: true, speed: .8, opacity_min: .12, sync: false } },
        size:    { value: 3.4, random: true,
                   anim: { enable: true, speed: 1.2, size_min: .5, sync: false } },
        line_linked: { enable: false },
        move:    { enable: true, speed: .6, direction: 'none', random: true,
                   straight: false, out_mode: 'out', bounce: false,
                   attract: { enable: false } }
      },
      interactivity: {
        detect_on: 'canvas',
        events: { onhover: { enable: false }, onclick: { enable: false }, resize: true }
      },
      retina_detect: true
    });

    /* ヒーローが画面外・タブが裏のときは描画を止める（スマホの電池対策） */
    var pjs = window.pJSDom && window.pJSDom[0] && window.pJSDom[0].pJS;
    if(!pjs) return;

    /* --- 粒が楕円に潰れるのを防ぐ ---
       canvas は「描画バッファ（width/height 属性）」と「表示サイズ（CSS）」を
       別々に持つ。この 2 つの縦横比がずれると、円が引き伸ばされて楕円になる。
       画面の回転やアドレスバーの出入りでレイアウトが動いた直後、particles.js が
       確定前の寸法を拾ってしまうことがあるため、こちらで必ず一致させ直す。 */
    var host = document.getElementById('particles-js');
    var cv   = pjs.canvas.el;
    function syncCanvas(){
      if(!host || !cv) return;
      var r = host.getBoundingClientRect();
      var w = Math.max(1, Math.round(r.width));
      var h = Math.max(1, Math.round(r.height));
      cv.style.width  = w + 'px';          /* 表示サイズを実寸で固定 */
      cv.style.height = h + 'px';
      var ratio = pjs.canvas.pxratio || 1;
      var bw = Math.round(w * ratio), bh = Math.round(h * ratio);
      if(cv.width === bw && cv.height === bh) return;
      cv.width  = bw;                      /* 描画バッファを同じ比率に揃える */
      cv.height = bh;
      pjs.canvas.w = bw;
      pjs.canvas.h = bh;
      pjs.particles.array.forEach(function(pt){   /* 画面外に取り残さない */
        if(pt.x > bw) pt.x = Math.random() * bw;
        if(pt.y > bh) pt.y = Math.random() * bh;
      });
    }
    syncCanvas();
    if('ResizeObserver' in window){
      new ResizeObserver(function(){
        requestAnimationFrame(syncCanvas);   /* レイアウト確定後に測る */
      }).observe(host);
    }
    window.addEventListener('resize', function(){ requestAnimationFrame(syncCanvas); });
    window.addEventListener('orientationchange', function(){ setTimeout(syncCanvas, 300); });
    var running = true;
    function halt(){
      if(!running) return;
      running = false;
      cancelAnimationFrame(pjs.fn.drawAnimFrame);
    }
    function resume(){
      if(running) return;
      running = true;
      syncCanvas();
      pjs.fn.vendors.draw();
    }
    var heroEl = document.querySelector('.hero');
    if(heroEl){
      new IntersectionObserver(function(es){
        es.forEach(function(e){ e.isIntersecting ? resume() : halt(); });
      },{threshold:0}).observe(heroEl);
    }
    document.addEventListener('visibilitychange', function(){
      document.hidden ? halt() : resume();
    });
  })();

  /* ---- hero calligraphy: 書かれていく演出 ----
     本家 action23 と同じ仕組み。金のカリグラフィ画像を、書き順の細いペン軌跡で
     マスクして現す。タイミングは vivus の scenario-sync + EASE
     （各 stroke の始点・終点をゆるめ、点は短く、単語の頭は一拍置く）。 */
  (function(){
    var FPS = 60;
    /* フェードインと重なるよう、書き始めを少し遅らせる（秒） */
    var START = 0.35;

    var svg = document.querySelector('.hero .calli');
    if(!svg) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* vivus の EASE：余弦の ease-in-out。手の加速・減速に近い */
    function ease(x){
      return -Math.cos(x * Math.PI) / 2 + 0.5;
    }

    function collect(group){
      var fallback = parseInt(group.getAttribute('data-duration'), 10) || 80;
      var paths = Array.prototype.slice.call(group.querySelectorAll('path'));
      var items = [];
      var t = 0;
      paths.forEach(function(pt){
        var delay = parseInt(pt.getAttribute('data-delay'), 10) || 0;
        var dur = parseInt(pt.getAttribute('data-duration'), 10) || fallback;
        var L = Math.ceil(pt.getTotalLength());
        items.push({ pt: pt, L: L, start: t + delay, dur: dur });
        t = t + delay + dur;
      });
      return items;
    }

    function revealAll(items){
      items.forEach(function(o){ o.pt.style.strokeDashoffset = '0'; });
    }

    function run(){
      var groups = svg.querySelectorAll('.pen');
      var items = [];
      Array.prototype.forEach.call(groups, function(g){
        items = items.concat(collect(g));
      });
      if(!items.length){ svg.classList.add('ready'); return; }

      items.forEach(function(o){
        o.pt.style.strokeDasharray = o.L + ' ' + (o.L + 2);
        o.pt.style.strokeDashoffset = String(o.L);
      });
      svg.classList.add('ready');

      if(reduce){ revealAll(items); return; }

      var maxFrame = 0;
      items.forEach(function(o){
        maxFrame = Math.max(maxFrame, o.start + o.dur);
      });

      var origin = performance.now() + START * 1000;

      function frame(now){
        var f = (now - origin) / (1000 / FPS);
        items.forEach(function(o){
          var p = (f - o.start) / o.dur;
          if(p <= 0) o.pt.style.strokeDashoffset = String(o.L);
          else if(p >= 1) o.pt.style.strokeDashoffset = '0';
          else o.pt.style.strokeDashoffset = String(o.L * (1 - ease(p)));
        });
        if(f < maxFrame) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    var src = (svg.querySelector('image') || {}).href;
    src = src && (src.baseVal || src);
    if(src){
      var preload = new Image();
      preload.onload = preload.onerror = run;
      preload.src = src;
    }else{
      run();
    }
  })();


  /* ---- 画像の遅延読み込み ----
     ヒーローの 2〜4 枚目と CountDown の背景は、初回表示には不要なので
     読み込みを後ろへ回して、最初の表示を軽くする */
  (function(){
    var hero = document.querySelector('.hero');
    if(hero){
      var on = function(){ hero.classList.add('bg-on'); };
      if(document.readyState === 'complete') setTimeout(on, 200);
      else window.addEventListener('load', function(){ setTimeout(on, 200); });
    }
    var cd = document.querySelector('.cd');
    if(cd && 'IntersectionObserver' in window){
      var io = new IntersectionObserver(function(es){
        es.forEach(function(e){
          if(e.isIntersecting){ cd.classList.add('bg-on'); io.disconnect(); }
        });
      }, { rootMargin: '600px 0px' });
      io.observe(cd);
    } else if(cd){
      cd.classList.add('bg-on');
    }
  })();

  /* ---- countdown ---- */
  var TARGET = new Date('2026-11-22T11:30:00+09:00').getTime();
  var ids = {d:'cd-d',h:'cd-h',m:'cd-m',s:'cd-s'};
  function p2(n){ return n < 10 ? '0'+n : ''+n; }
  function tick(){
    var t = Math.max(0, TARGET - Date.now());
    document.getElementById(ids.d).textContent = Math.floor(t/864e5);
    document.getElementById(ids.h).textContent = p2(Math.floor(t/36e5)%24);
    document.getElementById(ids.m).textContent = p2(Math.floor(t/6e4)%60);
    document.getElementById(ids.s).textContent = p2(Math.floor(t/1e3)%60);
  }
  tick(); setInterval(tick,1000);

  /* ---- reveal ---- */
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('on'); io.unobserve(e.target); }
    });
  },{threshold:.14, rootMargin:'0px 0px -6% 0px'});
  document.querySelectorAll('.rv').forEach(function(n){ io.observe(n); });

  /* ---- nav ---- */
  var burger = document.getElementById('burger'), nav = document.getElementById('nav');
  function toggle(force){
    var open = force !== undefined ? force : !document.body.classList.contains('nav-open');
    document.body.classList.toggle('nav-open', open);
    burger.setAttribute('aria-expanded', open);
    nav.setAttribute('aria-hidden', !open);
  }
  burger.addEventListener('click', function(){ toggle(); });
  burger.addEventListener('keydown', function(e){
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggle(); }
  });
  nav.addEventListener('click', function(e){ if(e.target.tagName === 'A') toggle(false); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') toggle(false); });

  /* ---- gallery rail ---- */
  var rail = document.getElementById('rail'), dots = document.getElementById('dots');
  var figs = Array.prototype.slice.call(rail.children);
  function centerOn(i, smooth){
    var f = figs[i];
    var left = f.offsetLeft - (rail.clientWidth - f.offsetWidth) / 2;
    rail.scrollTo({left: left, behavior: smooth ? 'smooth' : 'auto'});
  }
  figs.forEach(function(_, i){
    var b = document.createElement('b');
    b.addEventListener('click', function(){ centerOn(i, true); });
    dots.appendChild(b);
  });
  var dotEls = Array.prototype.slice.call(dots.children);
  function sync(){
    var c = rail.scrollLeft + rail.clientWidth/2, best = 0, bd = Infinity;
    figs.forEach(function(f,i){
      var fc = f.offsetLeft + f.offsetWidth/2, dd = Math.abs(fc - c);
      if(dd < bd){ bd = dd; best = i; }
    });
    figs.forEach(function(f,i){ f.classList.toggle('act', i === best); });
    dotEls.forEach(function(b,i){ b.classList.toggle('act', i === best); });
  }
  rail.addEventListener('scroll', function(){
    window.requestAnimationFrame(sync);
  }, {passive:true});
  window.addEventListener('resize', sync);
  window.addEventListener('load', function(){ centerOn(0, false); sync(); });
  centerOn(0, false);
  sync();

  /* ---- gallery autoplay（往復・4.2秒ごと） ---- */
  (function(){
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce || figs.length < 2) return;
    var STEP = 4200, RESUME = 9000;
    var dir = 1, timer = null, resumeTimer = null, visible = false;

    function current(){
      var c = rail.scrollLeft + rail.clientWidth/2, best = 0, bd = Infinity;
      figs.forEach(function(f,i){
        var dd = Math.abs(f.offsetLeft + f.offsetWidth/2 - c);
        if(dd < bd){ bd = dd; best = i; }
      });
      return best;
    }
    function step(){
      var i = current();
      if(i + dir > figs.length - 1) dir = -1;
      else if(i + dir < 0) dir = 1;
      centerOn(i + dir, true);
    }
    function play(){ if(!timer && visible) timer = setInterval(step, STEP); }
    function stop(){ if(timer){ clearInterval(timer); timer = null; } }
    function pause(){
      stop(); clearTimeout(resumeTimer);
      resumeTimer = setTimeout(play, RESUME);
    }
    ['pointerdown','touchstart','wheel','keydown'].forEach(function(ev){
      rail.addEventListener(ev, pause, {passive:true});
    });
    dots.addEventListener('click', pause);

    /* 画面外では動かさない */
    new IntersectionObserver(function(es){
      es.forEach(function(e){
        visible = e.isIntersecting;
        if(visible) play(); else stop();
      });
    },{threshold:.35}).observe(rail);

    document.addEventListener('visibilitychange', function(){
      if(document.hidden) stop(); else play();
    });
  })();

  /* ---- ご縁（選んだ側に合わせて一言） ---- */
  var relationNote = document.getElementById('relationNote');
  var relationCopy = {
    '新郎側': '直樹とのご縁を、一言でお聞かせください',
    '新婦側': '有梨花とのご縁を、一言でお聞かせください'
  };
  document.querySelectorAll('input[name="side"]').forEach(function(r){
    r.addEventListener('change', function(){
      relationNote.textContent = relationCopy[r.value] || relationNote.textContent;
    });
  });

  /* ---- allergy detail ---- */
  var alDetail = document.getElementById('aldetail');
  document.querySelectorAll('input[name="al"]').forEach(function(r){
    r.addEventListener('change', function(){
      alDetail.hidden = (r.value !== 'あり');
    });
  });

  /* ---- add companion ---- */
  var guests = document.getElementById('guests');
  document.getElementById('addGuest').addEventListener('click', function(){
    var d = document.createElement('div');
    d.className = 'guest';
    d.innerHTML =
      '<div class="row2">' +
        '<input class="inp" type="text" placeholder="お連れ様のお名前">' +
        '<select class="inp"><option>大人</option><option>子供</option></select>' +
      '</div>' +
      '<input class="inp" type="text" placeholder="お連れ様のアレルギー詳細">';
    guests.appendChild(d);
    d.querySelector('input').focus();
  });

  /* ---- toast + submit ---- */
  var toast = document.getElementById('toast'), tt;
  function say(msg){
    toast.textContent = msg; toast.classList.add('on');
    clearTimeout(tt); tt = setTimeout(function(){ toast.classList.remove('on'); }, 3200);
  }
  var form = document.getElementById('rsvp');
  var btn  = form.querySelector('.submit');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var f = e.target;
    if(!f.attend.value){ say('ご出欠をお選びください'); f.querySelector('.att').scrollIntoView({block:'center'}); return; }
    if(!f.sei.value.trim() || !f.mei.value.trim()){ say('お名前をご入力ください'); f.sei.focus(); return; }
    if(!f.seik.value.trim() || !f.meik.value.trim()){ say('ふりがなをご入力ください'); f.seik.focus(); return; }

    if(!RSVP.endpoint){
      say('ただいま受付の準備中です。お手数ですがお電話でご連絡ください');
      return;
    }

    var data = new URLSearchParams();
    new FormData(f).forEach(function(value, key){
      data.append(key, value);
    });
    /* お連れ様は動的に増えるので、まとめて 1 項目に整形して送る */
    var guests = [];
    document.querySelectorAll('#guests .guest').forEach(function(g){
      var v = [].map.call(g.querySelectorAll('input,select'), function(el){ return el.value.trim(); });
      if(v[0]) guests.push(v.filter(Boolean).join(' / '));
    });
    data.append('companions', guests.join(' ｜ '));
    data.append('submitted_at', new Date().toISOString());

    btn.disabled = true;
    var label = btn.innerHTML;
    btn.innerHTML = '送信中<em>SENDING…</em>';

    fetch(RSVP.endpoint, {
      method: 'POST',
      body: data,
      mode: RSVP.mode || 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).then(function(){
      form.innerHTML =
        '<div style="text-align:center;padding:40px 10px">' +
        '<p class="en" style="font-size:26px;letter-spacing:.14em;' +
        'color:#a98a57;margin-bottom:16px">Thank you</p>' +
        '<p style="font-size:14px;line-height:2.2">ご返信ありがとうございました<br>' +
        '当日お会いできますのを楽しみにしております</p></div>';
      form.scrollIntoView({block:'center', behavior:'smooth'});
    }).catch(function(){
      btn.disabled = false; btn.innerHTML = label;
      say('送信に失敗しました。通信環境をご確認のうえ再度お試しください');
    });
  });
})();
