/* 二次会ページ。出欠は結婚式とは別シート（event=after-party）へ送る。 */
var RSVP = {
  endpoint: 'https://script.google.com/macros/s/AKfycbx_YxygCwgYYABcjBNASW0SJN--I_KKQfQOc0jC92Mcn46CvKP732opws3DVPfWUlDB/exec',
  mode: 'no-cors'
};

(function(){
  'use strict';

  (function(){
    if(!window.particlesJS) return;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if(!document.getElementById('particles-js')) return;
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

    var pjs = window.pJSDom && window.pJSDom[0] && window.pJSDom[0].pJS;
    if(!pjs) return;
    var host = document.getElementById('particles-js');
    var cv   = pjs.canvas.el;
    function syncCanvas(){
      if(!host || !cv) return;
      var r = host.getBoundingClientRect();
      var w = Math.max(1, Math.round(r.width));
      var h = Math.max(1, Math.round(r.height));
      cv.style.width  = w + 'px';
      cv.style.height = h + 'px';
      var ratio = pjs.canvas.pxratio || 1;
      var bw = Math.round(w * ratio), bh = Math.round(h * ratio);
      if(cv.width === bw && cv.height === bh) return;
      cv.width  = bw;
      cv.height = bh;
      pjs.canvas.w = bw;
      pjs.canvas.h = bh;
      pjs.particles.array.forEach(function(pt){
        if(pt.x > bw) pt.x = Math.random() * bw;
        if(pt.y > bh) pt.y = Math.random() * bh;
      });
    }
    syncCanvas();
    if('ResizeObserver' in window){
      new ResizeObserver(function(){ requestAnimationFrame(syncCanvas); }).observe(host);
    }
    window.addEventListener('resize', function(){ requestAnimationFrame(syncCanvas); });
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
    if(heroEl && 'IntersectionObserver' in window){
      new IntersectionObserver(function(es){
        es.forEach(function(e){ e.isIntersecting ? resume() : halt(); });
      },{threshold:0}).observe(heroEl);
    }
    document.addEventListener('visibilitychange', function(){
      document.hidden ? halt() : resume();
    });
  })();

  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('on'); io.unobserve(e.target); }
    });
  },{threshold:.14, rootMargin:'0px 0px -6% 0px'});
  document.querySelectorAll('.rv').forEach(function(n){ io.observe(n); });

  var burger = document.getElementById('burger'), nav = document.getElementById('nav');
  if(burger && nav){
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
  }

  var toast = document.getElementById('toast'), tt;
  function say(msg){
    if(!toast) return;
    toast.textContent = msg;
    toast.classList.add('on');
    clearTimeout(tt);
    tt = setTimeout(function(){ toast.classList.remove('on'); }, 3200);
  }

  var form = document.getElementById('rsvp');
  if(!form) return;
  var btn = form.querySelector('.submit');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var f = e.target;
    if(!f.attend.value){
      say('ご出欠をお選びください');
      f.querySelector('.att').scrollIntoView({block:'center'});
      return;
    }
    if(!f.sei.value.trim() || !f.mei.value.trim()){
      say('お名前をご入力ください');
      f.sei.focus();
      return;
    }
    if(!f.seik.value.trim() || !f.meik.value.trim()){
      say('ふりがなをご入力ください');
      f.seik.focus();
      return;
    }
    if(!RSVP.endpoint){
      say('ただいま受付の準備中です。お手数ですがお電話でご連絡ください');
      return;
    }

    var body = new URLSearchParams();
    new FormData(f).forEach(function(value, key){
      body.append(key, value);
    });

    var attend = f.attend.value;
    var note = attend === '参加'
      ? '二次会でお会いできますのを楽しみにしております'
      : attend === '保留'
        ? 'お決まりになりましたら、お知らせください'
        : 'またお会いできる日を楽しみにしております';

    btn.disabled = true;
    var label = btn.innerHTML;
    btn.innerHTML = '送信中<em>SENDING…</em>';

    fetch(RSVP.endpoint, {
      method: 'POST',
      body: body,
      mode: RSVP.mode || 'no-cors'
    }).then(function(){
      form.innerHTML =
        '<div style="text-align:center;padding:40px 10px">' +
        '<p class="en" style="font-size:26px;letter-spacing:.14em;' +
        'color:#a98a57;margin-bottom:16px">Thank you</p>' +
        '<p style="font-size:14px;line-height:2.2">ご返信ありがとうございました<br>' +
        note + '</p></div>';
      form.scrollIntoView({block:'center', behavior:'smooth'});
    }).catch(function(){
      btn.disabled = false;
      btn.innerHTML = label;
      say('送信に失敗しました。通信環境をご確認のうえ再度お試しください');
    });
  });
})();
