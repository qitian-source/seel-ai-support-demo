/*!
 * Seel Review Plugin — Interactive Demo Widget v2.0
 *
 * Self-contained drop-in script. Mounts via Shadow DOM — zero CSS conflicts.
 *
 * Simplified flow:
 *   idle → playing → invite → done
 *
 * After last chat message, rollout check (rolloutPct) determines whether
 * the invite card is shown. If not selected, skips silently to done.
 *
 * Usage:
 *   <script src="seel-demo-widget-v2.js" async></script>
 *
 * Optional config (set before script tag):
 *   window.SeelDemoV2Config = { merchantName, orderId, customerName, rolloutPct };
 */
(function (G) {
  'use strict';

  /* ─── Guard ───────────────────────────────────────────────────────────────── */
  var HOST_ID = '__seel_v2_root__';
  if (G.document.getElementById(HOST_ID)) return;

  /* ─── Config ──────────────────────────────────────────────────────────────── */
  var CFG = Object.assign(
    { merchantName: 'AlexSong Store', orderId: '10342', customerName: 'Carlos Rivera', rolloutPct: 100 },
    G.SeelDemoV2Config || G.SeelDemoConfig || {}
  );

  var ROLLOUT_PCT = Number(CFG.rolloutPct);
  if (isNaN(ROLLOUT_PCT) || ROLLOUT_PCT < 0) ROLLOUT_PCT = 0;
  if (ROLLOUT_PCT > 100) ROLLOUT_PCT = 100;

  var PURPLE   = '#6c47ff';
  var TP_GREEN = '#00B67A';

  /* ─── Chat script ─────────────────────────────────────────────────────────── */
  var MSGS = [
    { r: 'a', t: "Hi! I'm Alex from Seel Support 👋 How can I help you today?",            d: 700  },
    { r: 'u', t: 'Hi, my Order #' + CFG.orderId + " hasn't arrived yet.",                   d: 1400 },
    { r: 'a', t: 'Sorry to hear that! Let me check Order #' + CFG.orderId + ' right away…', d: 1200 },
    { r: 'a', t: "Great news — it's at the local distribution center and out for delivery today! 📦", d: 1900 },
    { r: 'u', t: 'Oh perfect, thanks so much!',                                             d: 1100 },
    { r: 'a', t: "You're welcome! Your Seel protection has you covered. Anything else?",    d: 1300 },
    { r: 'u', t: "Nope, all good. Really appreciate it!",                                   d: 1100 },
    { r: 'a', t: "Happy to help! Marking this as resolved. Have a great day! 😊",           d: 950  },
  ];

  /* ─── State ───────────────────────────────────────────────────────────────── */
  var S = {
    open:      false,
    phase:     'idle',   // idle | playing | invite | done
    msgIdx:    0,
    timers:    [],
    shownMsgs: [],
    typing:    false,
  };

  var shadow; // set after boot

  /* ─── Helpers ─────────────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function clearTimers() {
    S.timers.forEach(clearTimeout);
    S.timers = [];
  }

  function later(fn, ms) {
    var id = setTimeout(fn, ms);
    S.timers.push(id);
    return id;
  }

  /* ─── SVG icons ───────────────────────────────────────────────────────────── */
  function chatIcon() {
    return '<svg width="26" height="26" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  }
  function closeIcon(color) {
    color = color || 'white';
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }
  function checkIcon(color) {
    return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  }
  function extLinkIcon() {
    return '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="' + TP_GREEN + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
  }
  function sendIcon() {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
  }
  function replayIcon() {
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/></svg>';
  }

  /* ─── CSS ─────────────────────────────────────────────────────────────────── */
  var CSS = '\
    *{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}\
    .root{position:fixed;bottom:24px;right:24px;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-end;gap:12px}\
    \
    .bubble-btn{width:56px;height:56px;border-radius:50%;background:' + PURPLE + ';border:none;cursor:pointer;\
      display:flex;align-items:center;justify-content:center;\
      box-shadow:0 4px 24px rgba(108,71,255,.45);transition:transform .2s,background .2s}\
    .bubble-btn:hover{transform:scale(1.06)}\
    .bubble-btn.open{background:#1f2937}\
    .bubble-btn svg{pointer-events:none}\
    \
    .panel{width:380px;border-radius:18px;background:#fff;overflow:hidden;display:flex;flex-direction:column;\
      box-shadow:0 8px 40px rgba(0,0,0,.16);animation:panelIn .32s cubic-bezier(.22,.68,0,1.2)}\
    @keyframes panelIn{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}\
    \
    .hdr{background:' + PURPLE + ';padding:14px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0}\
    .av{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;\
      justify-content:center;color:#fff;font-weight:700;font-size:13px;flex-shrink:0}\
    .agent-name{color:#fff;font-weight:600;font-size:13px}\
    .agent-status{display:flex;align-items:center;gap:5px;font-size:10px;color:rgba(255,255,255,.7)}\
    .online-dot{width:6px;height:6px;border-radius:50%;background:#4ade80;animation:plz 2s infinite}\
    @keyframes plz{0%,100%{opacity:1}50%{opacity:.5}}\
    .hdr-close{margin-left:auto;background:none;border:none;cursor:pointer;color:rgba(255,255,255,.6);line-height:0;padding:4px}\
    .hdr-close:hover{color:#fff}\
    \
    .msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;\
      background:#fafafa;min-height:260px;max-height:380px;scroll-behavior:smooth}\
    .mrow{display:flex;align-items:flex-end;gap:8px;animation:msgIn .28s cubic-bezier(.22,.68,0,1.2)}\
    .mrow.u{justify-content:flex-end}\
    @keyframes msgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}\
    .mbub{border-radius:18px;padding:9px 14px;font-size:12px;max-width:80%;line-height:1.5}\
    .mbub.a{background:#fff;border:1px solid #e5e7eb;border-bottom-left-radius:4px;color:#111827;box-shadow:0 1px 3px rgba(0,0,0,.06)}\
    .mbub.u{background:' + PURPLE + ';color:#fff;border-bottom-right-radius:4px}\
    \
    .typing{display:flex;align-items:flex-end;gap:8px;animation:msgIn .28s ease}\
    .typing-bub{background:#fff;border:1px solid #e5e7eb;border-radius:18px;border-bottom-left-radius:4px;\
      padding:11px 14px;display:flex;gap:4px;align-items:center;box-shadow:0 1px 3px rgba(0,0,0,.06)}\
    .td{width:6px;height:6px;border-radius:50%;background:#9ca3af;animation:bce .9s infinite}\
    .td:nth-child(2){animation-delay:.15s}.td:nth-child(3){animation-delay:.3s}\
    @keyframes bce{0%,100%{transform:translateY(0);opacity:.6}50%{transform:translateY(-4px);opacity:1}}\
    \
    .ftr{border-top:1px solid #f3f4f6;padding:10px 14px;background:#fff;flex-shrink:0}\
    .input-row{display:flex;align-items:center;gap:8px}\
    .fake-input{flex:1;font-size:12px;background:#f9fafb;border-radius:8px;padding:8px 12px;\
      color:#9ca3af;border:1px solid #f3f4f6;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
    .send-fk{width:30px;height:30px;border-radius:8px;background:#f3f4f6;border:none;display:flex;\
      align-items:center;justify-content:center;opacity:.4;pointer-events:none;flex-shrink:0}\
    .sess-active{text-align:center;font-size:11px;color:#9ca3af}\
    \
    .replay-row{display:flex;align-items:center;justify-content:center;gap:6px;\
      font-size:11px;color:#9ca3af;background:none;border:none;cursor:pointer;width:100%;padding:5px 0}\
    .replay-row:hover{color:#374151}\
    \
    #phase-card{animation:cardIn .38s cubic-bezier(.22,.68,0,1.2)}\
    @keyframes cardIn{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}\
    \
    /* Invite card */\
    .invite-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:18px 16px}\
    .invite-emoji{text-align:center;font-size:28px;margin-bottom:8px}\
    .invite-title{font-size:13px;font-weight:600;color:#111827;text-align:center;margin-bottom:3px}\
    .invite-sub{font-size:11px;color:#9ca3af;text-align:center;margin-bottom:16px}\
    .tp-full-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;\
      border:none;border-radius:10px;padding:12px 0;font-size:13px;font-weight:700;\
      cursor:pointer;background:' + TP_GREEN + ';color:#fff;font-family:inherit;\
      transition:background .18s,transform .15s;margin-bottom:10px}\
    .tp-full-btn:hover{background:#009e6c}\
    .tp-full-btn:active{transform:scale(.97)}\
    .invite-note{text-align:center;font-size:10px;color:#9ca3af;padding-top:2px}\
    \
    /* Done state */\
    .done{border-radius:16px;padding:22px;text-align:center;animation:doneIn .55s cubic-bezier(.34,1.56,.64,1);\
      background:rgba(0,182,122,.05);border:1px solid rgba(0,182,122,.3)}\
    @keyframes doneIn{from{opacity:0;transform:scale(.88) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}\
    .done-check{animation:popIn .5s .1s cubic-bezier(.34,1.56,.64,1) both}\
    @keyframes popIn{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}\
    .done-t{font-size:13px;font-weight:600;margin-bottom:4px;color:#065f46;margin-top:8px}\
    .done-s{font-size:11px;opacity:.75;color:#065f46}\
  ';

  /* ─── HTML builders ───────────────────────────────────────────────────────── */
  function avHTML() {
    return '<div class="av">S</div>';
  }

  function msgHTML(msg) {
    var isUser = msg.r === 'u';
    return '<div class="mrow' + (isUser ? ' u' : '') + '">'
      + (isUser ? '' : avHTML())
      + '<div class="mbub ' + msg.r + '">' + esc(msg.t) + '</div>'
      + '</div>';
  }

  function typingHTML() {
    return '<div class="typing">' + avHTML()
      + '<div class="typing-bub"><div class="td"></div><div class="td"></div><div class="td"></div></div>'
      + '</div>';
  }

  function inviteHTML() {
    return '<div class="invite-card">'
      + '<p class="invite-emoji">🙏</p>'
      + '<p class="invite-title">感谢您的支持！</p>'
      + '<p class="invite-sub">请在 Trustpilot 分享您的体验</p>'
      + '<button class="tp-full-btn" data-action="go-tp">⭐ 在 Trustpilot 留评</button>'
      + '<p class="invite-note">公开评价 · trustpilot.com</p>'
      + '</div>';
  }

  function doneHTML() {
    return '<div class="done">'
      + '<div class="done-check">' + checkIcon(TP_GREEN) + '</div>'
      + '<p class="done-t">感谢您的评价！</p>'
      + '<p class="done-s">已跳转至 Trustpilot</p>'
      + '</div>';
  }

  function footerHTML() {
    var p = S.phase;
    if (p === 'playing') {
      return '<div class="ftr"><div class="input-row">'
        + '<div class="fake-input">Type a message…</div>'
        + '<div class="send-fk">' + sendIcon() + '</div>'
        + '</div></div>';
    }
    if (p === 'done') {
      return '<div class="ftr"><button class="replay-row" data-action="replay">' + replayIcon() + ' Replay Demo →</button></div>';
    }
    return '<div class="ftr"><div class="sess-active">💬 Session Active · AI Support</div></div>';
  }

  /* ─── Render ──────────────────────────────────────────────────────────────── */
  function renderPanel() {
    var p = S.phase;
    var msgs = S.shownMsgs || [];

    var msgsInner = msgs.map(msgHTML).join('');

    var card = '';
    if (p === 'invite') card = inviteHTML();
    else if (p === 'done') card = doneHTML();

    return '<div class="panel">'
      + '<div class="hdr">' + avHTML()
      + '<div><div class="agent-name">Seel Support</div>'
      + '<div class="agent-status"><div class="online-dot"></div>Online · Replies instantly</div></div>'
      + '<button class="hdr-close" data-action="toggle">' + closeIcon() + '</button>'
      + '</div>'
      + '<div class="msgs" id="msgs-area">' + msgsInner
      + (S.typing ? typingHTML() : '')
      + (card ? '<div id="phase-card">' + card + '</div>' : '')
      + '</div>'
      + footerHTML()
      + '</div>';
  }

  function renderRoot() {
    shadow.getElementById('seel-root').innerHTML =
      (S.open ? renderPanel() : '')
      + '<button class="bubble-btn' + (S.open ? ' open' : '') + '" data-action="open-widget">'
      + (S.open ? closeIcon() : chatIcon()) + '</button>';
    scrollMsgs();
  }

  function scrollMsgs() {
    var el = shadow.getElementById('msgs-area');
    if (el) el.scrollTop = el.scrollHeight;
  }

  /* ─── State transitions ───────────────────────────────────────────────────── */
  function openWidget() {
    S.open = !S.open;
    if (S.open && S.phase === 'idle') startPlay();
    renderRoot();
  }

  function startPlay() {
    S.phase = 'playing';
    S.shownMsgs = [];
    S.typing = false;
    clearTimers();

    var cumulative = 400;
    MSGS.forEach(function(msg, i) {
      var typingAt = cumulative;
      var revealAt = cumulative + msg.d;
      cumulative = revealAt + 100;

      if (msg.r === 'a') {
        later(function(m) { return function() {
          S.typing = true;
          var el = shadow.getElementById('msgs-area');
          if (el) { el.innerHTML += typingHTML(); el.scrollTop = el.scrollHeight; }
        }; }(msg), typingAt);
      }

      later(function(m, idx) { return function() {
        S.typing = false;
        S.shownMsgs.push(m);
        var el = shadow.getElementById('msgs-area');
        if (!el) return;
        var ty = el.querySelector('.typing');
        if (ty) ty.remove();
        var div = document.createElement('div');
        div.innerHTML = msgHTML(m);
        el.appendChild(div.firstChild);
        el.scrollTop = el.scrollHeight;

        if (idx === MSGS.length - 1) {
          later(function() {
            if (Math.random() * 100 < ROLLOUT_PCT) {
              S.phase = 'invite';
            } else {
              S.phase = 'done';
            }
            renderRoot();
          }, 1500);
        }
      }; }(msg, i), revealAt);
    });
  }

  function goTp() {
    G.open('https://www.trustpilot.com', '_blank');
    S.phase = 'done';
    renderRoot();
  }

  function replay() {
    clearTimers();
    S.phase = 'idle';
    S.shownMsgs = [];
    S.typing = false;
    S.open = false;
    renderRoot();
  }

  /* ─── Event delegation ────────────────────────────────────────────────────── */
  function onShadowClick(e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var action = el.getAttribute('data-action');
    switch (action) {
      case 'open-widget': openWidget(); break;
      case 'toggle':      openWidget(); break;
      case 'go-tp':       goTp(); break;
      case 'replay':      replay(); break;
    }
  }

  /* ─── Boot ────────────────────────────────────────────────────────────────── */
  function boot() {
    if (G.document.getElementById(HOST_ID)) return;

    var host = G.document.createElement('div');
    host.id = HOST_ID;
    G.document.body.appendChild(host);

    shadow = host.attachShadow({ mode: 'open' });

    var styleEl = G.document.createElement('style');
    styleEl.textContent = CSS;
    shadow.appendChild(styleEl);

    var root = G.document.createElement('div');
    root.id = 'seel-root';
    root.className = 'root';
    shadow.appendChild(root);

    shadow.addEventListener('click', onShadowClick);

    renderRoot();
  }

  if (G.document.readyState === 'loading') {
    G.document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

}(window));
