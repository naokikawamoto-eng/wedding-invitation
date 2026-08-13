/* ============================================================
 *  出欠フォームの送信先設定
 *  ------------------------------------------------------------
 *  endpoint を空のままにしておくと、フォームは送信されず
 *  「受付準備中」の案内が出ます（現在の状態）。
 *
 *  ▼ Google フォームに送る場合
 *     endpoint: 'https://docs.google.com/forms/d/e/【フォームID】/formResponse'
 *     mode:     'no-cors'
 *     ※ HTML 側の name="..." を Google フォームの entry.123456789 に
 *        書き換える必要があります（README 参照）
 *
 *  ▼ Formspree / Google Apps Script などに送る場合
 *     endpoint: 'https://formspree.io/f/【ID】'
 *     mode:     'cors'
 * ============================================================ */
var RSVP = {
  endpoint: '',
  mode: 'cors'
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
     文字は Pinyon Script の実フォントで描いている（index.html の clipPath 内の <text>）。
     その文字を「ペンの軌跡」を太い線にしたマスクで覆い、線を書き順どおりに伸ばして
     少しずつ現していく。ワイプ（カーテン）ではなく筆の動きに沿って現れるので、
     W の折り返しなども再現される。
     軌跡は元サイト（action23）の vivus 用データそのもの。
     フォントを変えても崩れないよう、実際に描画された文字の大きさを測って
     軌跡を自動で合わせている。 */
  (function(){
    /* 元サイトの実測タイミング（動画を解析）
       ・写真だけの間          … 0 〜 1.2s
       ・Wedding / Invitation … 1.2s から “同時に” 書き始め、約 8.8 秒で書き上がる */
    var START = 1.2, SPAN = 8.8;

    var svg = document.querySelector('.hero .calli');
    if(!svg) return;
    var LINES = [
      { pen: '#penWed .pen', clip: '#clipWed text', group: '.g-wed' },
      { pen: '#penInv .pen', clip: '#clipInv text', group: '.g-inv' }
    ];
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function fitAndCollect(){
      var items = [];
      LINES.forEach(function(L){
        var pen  = svg.querySelector(L.pen);
        var text = svg.querySelector(L.clip);
        if(!pen || !text) return;

        /* 軌跡を、実際に描かれた文字の位置と大きさへ合わせる */
        pen.removeAttribute('transform');
        var tb = text.getBBox();      /* 文字の実寸 */
        var pb = pen.getBBox();       /* 軌跡の実寸 */
        if(pb.width > 0 && tb.width > 0){
          var sc = tb.width / pb.width;
          var dx = (tb.x + tb.width  / 2) - (pb.x + pb.width  / 2) * sc;
          var dy = (tb.y + tb.height / 2) - (pb.y + pb.height / 2) * sc;
          pen.setAttribute('transform',
            'translate(' + dx.toFixed(2) + ',' + dy.toFixed(2) + ') scale(' + sc.toFixed(4) + ')');
          /* 線の太さは文字の高さより気持ち太く。取りこぼしを防ぐ */
          pen.setAttribute('stroke-width', (tb.height * 1.25 / sc).toFixed(1));
        }

        var ps = Array.prototype.slice.call(pen.querySelectorAll('path'));
        var lens = ps.map(function(pt){ return pt.getTotalLength(); });
        var total = lens.reduce(function(x, y){ return x + y; }, 0) || 1;
        var t = 0;
        ps.forEach(function(pt, i){
          var dur = lens[i] / total * SPAN;
          items.push({ pt: pt, L: lens[i], dur: dur, at: t });
          t += dur;
        });
      });
      return items;
    }

    function unmask(){
      /* 書き終わったらマスクを外す。フォントの字形が軌跡から少しはみ出していても、
         最後は必ず全文字が出るようにするための保険 */
      LINES.forEach(function(L){
        var g = svg.querySelector(L.group);
        if(g) g.removeAttribute('mask');
      });
    }

    function run(){
      var items = fitAndCollect();
      if(!items.length){ svg.classList.add('ready'); return; }

      if(reduce){ unmask(); svg.classList.add('ready'); return; }

      /* 1) まず「隠した状態」を inline で確定させる。
            CSS 変数のフォールバック値から遷移が始まると dashoffset が破線周期を
            またぎ、文字が虫食い状にちらついてしまうため。 */
      items.forEach(function(o){
        o.pt.style.transition = 'none';
        o.pt.style.strokeDasharray = o.L;
        o.pt.style.strokeDashoffset = o.L;
      });

      /* 2) スタイルを確実に反映させてから */
      void svg.getBoundingClientRect();

      /* 3) 走らせる。フォント読み込みで出遅れても、名前・日付の
            CSS animation-delay と揃うようページ表示からの絶対時刻に合わせる */
      var base = Math.max(0, START - performance.now() / 1000);
      requestAnimationFrame(function(){
        items.forEach(function(o){
          o.pt.style.transition = 'stroke-dashoffset ' + o.dur.toFixed(3) +
                                  's linear ' + (base + o.at).toFixed(3) + 's';
          o.pt.style.strokeDashoffset = '0';
        });
        svg.classList.add('ready');
        setTimeout(unmask, (base + SPAN) * 1000 + 400);
      });
    }

    /* Pinyon Script が届く前に測ると別のフォントの大きさで合わせてしまうので待つ */
    if(document.fonts && document.fonts.load){
      document.fonts.load('118px "Pinyon Script"')
        .then(function(){ return document.fonts.ready; })
        .then(run).catch(run);
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

    var data = new FormData(f);
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
      mode: RSVP.mode || 'cors'
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
