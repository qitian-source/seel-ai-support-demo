/*!
 * Seel Review Plugin — Interactive Demo Widget v1.1
 *
 * Self-contained drop-in script. Mounts via Shadow DOM — zero CSS conflicts.
 *
 * 3-tier CSAT flow:
 *   😊 Satisfied     → Trustpilot 5-star invite
 *   😐 Neutral       → Private improvement form
 *   ☹️ Dissatisfied  → Manager escalation (NO public link)
 *
 * Usage:
 *   <script src="seel-demo-widget.js" async></script>
 *
 * Optional config (set before script tag):
 *   window.SeelDemoConfig = { merchantName, orderId, customerName };
 */
(function (G) {
  'use strict';

  /* ─── Config ──────────────────────────────────────────────────────────────── */
  var CFG = Object.assign(
    { merchantName: 'AlexSong Store', orderId: '10342', customerName: 'Carlos Rivera' },
    G.SeelDemoConfig || {}
  );

  var PURPLE   = '#6c47ff';
  var TP_GREEN = '#00B67A';
  var HOST_ID  = '__seel_demo_root__';

  /* ─── Chat script ─────────────────────────────────────────────────────────── */
  var MSGS = [
    { r: 'a', t: "Hi! I'm Alex from Seel Support 👋 How can I help you today?",        d: 700  },
    { r: 'u', t: 'Hi, my Order #' + CFG.orderId + " hasn't arrived yet.",               d: 1400 },
    { r: 'a', t: 'Sorry to hear that! Let me check Order #' + CFG.orderId + ' right away…', d: 1200 },
    { r: 'a', t: "Great news — it's at the local distribution center and out for delivery today! 📦", d: 1900 },
    { r: 'u', t: 'Oh perfect, thanks so much!',                                         d: 1100 },
    { r: 'a', t: "You're welcome! Your Seel protection has you covered. Anything else?", d: 1300 },
    { r: 'u', t: "Nope, all good. Really appreciate it!",                               d: 1100 },
    { r: 'a', t: "Happy to help! Marking this as resolved. Have a great day! 😊",       d: 950  },
  ];

  /* ─── State ───────────────────────────────────────────────────────────────── */
  var S = {
    open:        false,
    phase:       'idle',   // idle | playing | csat | tp | neutral | dissatisfied | sending-neutral | sending-dissatisfied | tp-done | neutral-done | dissatisfied-done
    // Note: no 'awaiting' phase — CSAT auto-appears after conversation resolves
    msgIdx:      0,
    hoverStar:   0,
    selStar:     0,
    timers:      [],
    shownMsgs:   [],
    typing:      false,
  };

  var shadow;  // set after boot

  /* ─── SVG icons ───────────────────────────────────────────────────────────── */
  function chatIcon() {
    return '<svg width="26" height="26" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  }
  function closeIcon(color) {
    color = color || 'white';
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }
  function backIcon(color) {
    color = color || 'currentColor';
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
  }
  function starSVG(filled, size) {
    size = size || 34;
    var fill = filled ? TP_GREEN : '#e5e7eb';
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="' + fill + '" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
  }
  function checkIcon(color) {
    return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  }
  function lockIcon() {
    return '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  }
  function shieldIcon(color) {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
  }
  function sendIcon() {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
  }
  function replayIcon() {
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/></svg>';
  }
  function extLinkIcon() {
    return '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="' + TP_GREEN + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
  }
  function warnIcon(color) {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  }
  function thumbsUpIcon() {
    return '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>';
  }
  function spinnerIcon(color) {
    color = color || '#fff';
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur=".7s" repeatCount="indefinite"/></path></svg>';
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
    .panel{width:340px;border-radius:18px;background:#fff;overflow:hidden;display:flex;flex-direction:column;\
      box-shadow:0 8px 40px rgba(0,0,0,.16);animation:panelIn .32s cubic-bezier(.22,.68,0,1.2)}\
    @keyframes panelIn{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}\
    \
    .hdr{background:' + PURPLE + ';padding:14px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0}\
    .av{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;\
      justify-content:center;color:#fff;font-weight:700;font-size:13px;flex-shrink:0}\
    .agent-info{}\
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
    .sess-closed{text-align:center;font-size:11px;color:#9ca3af}\
    \
    .replay-row{display:flex;align-items:center;justify-content:center;gap:6px;\
      font-size:11px;color:#9ca3af;background:none;border:none;cursor:pointer;width:100%;padding:5px 0}\
    .replay-row:hover{color:#374151}\
    \
    /* phase card wrapper */\
    #phase-card{animation:cardIn .38s cubic-bezier(.22,.68,0,1.2)}\
    @keyframes cardIn{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}\
    \
    /* CSAT */\
    .csat{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:16px}\
    .csat-t{font-size:13px;font-weight:600;text-align:center;color:#111827;margin-bottom:4px}\
    .csat-s{font-size:11px;color:#9ca3af;text-align:center;margin-bottom:14px}\
    .csat-row{display:flex;gap:8px}\
    .co{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;border:2px solid transparent;\
      border-radius:12px;padding:12px 6px;cursor:pointer;background:none;transition:border-color .18s,background .18s,transform .18s}\
    .co:active{transform:scale(.96)}\
    .co.s:hover{border-color:' + TP_GREEN + ';background:rgba(0,182,122,.05)}\
    .co.n:hover{border-color:#f59e0b;background:#fffbeb}\
    .co.d:hover{border-color:#ef4444;background:#fef2f2}\
    .co-em{font-size:26px}\
    .co-lb{font-size:11px;font-weight:600;color:#111827}\
    \
    /* back button */\
    .back-btn{background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:4px;\
      font-size:11px;font-weight:500;padding:2px 0;opacity:.7;transition:opacity .15s;line-height:0}\
    .back-btn:hover{opacity:1}\
    .back-btn-tp{color:rgba(255,255,255,.85)}\
    .back-btn-tp:hover{color:#fff}\
    .back-btn-nf{color:#92400e}\
    .back-btn-df{color:#991b1b}\
    \
    /* Trustpilot */\
    .tp-card{border:1px solid rgba(0,182,122,.3);border-radius:16px;overflow:hidden;background:#fff;\
      box-shadow:0 2px 8px rgba(0,0,0,.08)}\
    .tp-hdr{background:' + TP_GREEN + ';padding:12px 16px;display:flex;align-items:center;gap:8px}\
    .tp-brand{color:#fff;font-weight:700;font-size:15px}\
    .tp-dom{color:rgba(255,255,255,.7);font-size:10px}\
    .tp-sm-stars{display:flex;gap:3px}\
    .tp-sms{width:24px;height:24px;background:#fff;border-radius:3px;display:flex;align-items:center;justify-content:center}\
    .tp-body{padding:14px 16px 0}\
    .tp-q{font-size:12px;font-weight:600;color:#111827;margin-bottom:3px}\
    .tp-qs{font-size:11px;color:#9ca3af;margin-bottom:14px}\
    .tp-stars{display:flex;justify-content:center;gap:6px;margin-bottom:10px}\
    .tp-st{background:none;border:none;cursor:pointer;transition:transform .15s;line-height:0;padding:0}\
    .tp-st:hover{transform:scale(1.12)}\
    .tp-hint{text-align:center;font-size:10px;color:#9ca3af;margin-bottom:12px}\
    .tp-success{display:flex;flex-direction:column;align-items:center;gap:8px;padding:6px 0 10px;animation:popIn .5s cubic-bezier(.34,1.56,.64,1)}\
    @keyframes popIn{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}\
    .tp-suc-stars{display:flex;gap:4px}\
    .tp-suc-msg{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:' + TP_GREEN + '}\
    .tp-ext{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:' + TP_GREEN + ';font-weight:500;text-decoration:none}\
    .tp-ftr{border-top:1px solid #f3f4f6;padding:9px 16px;display:flex;align-items:center;gap:5px;font-size:10px;color:#9ca3af}\
    \
    /* Neutral form */\
    .nf-card{border:1px solid #fde68a;border-radius:16px;overflow:hidden;background:#fffbeb}\
    .nf-hdr{background:#fef3c7;border-bottom:1px solid #fde68a;padding:10px 14px;display:flex;align-items:center;gap:10px}\
    .nf-t{font-size:12px;font-weight:600;color:#78350f}\
    .nf-s{font-size:10px;color:#92400e}\
    .nf-body{padding:12px 16px}\
    .nf-q{font-size:12px;font-weight:500;color:#78350f;margin-bottom:10px}\
    .f-ta{width:100%;border:1px solid #fcd34d;border-radius:8px;padding:10px 12px;\
      font-size:12px;resize:none;font-family:inherit;color:#111827;background:#fff;outline:none;transition:box-shadow .2s}\
    .f-ta:focus{box-shadow:0 0 0 3px rgba(245,158,11,.2)}\
    .f-ta.red{border-color:#fca5a5}\
    .f-ta.red:focus{box-shadow:0 0 0 3px rgba(239,68,68,.2)}\
    .sub-btn{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;margin-top:10px;border:none;border-radius:8px;\
      padding:9px 0;font-size:12px;font-weight:600;cursor:pointer;transition:background .2s,opacity .2s;font-family:inherit}\
    .sub-btn.nb{background:#f59e0b;color:#fff}.sub-btn.nb:hover{background:#d97706}\
    .sub-btn.rb{background:#dc2626;color:#fff}.sub-btn.rb:hover{background:#b91c1c}\
    .sub-btn:disabled{opacity:.4;cursor:default;pointer-events:none}\
    .sub-btn.sending{opacity:.75;pointer-events:none}\
    .priv-note{display:flex;align-items:center;justify-content:center;gap:4px;font-size:10px;\
      color:rgba(120,53,15,.55);margin-top:8px}\
    \
    /* Dissatisfied form */\
    .df-card{border:1px solid #fecaca;border-radius:16px;overflow:hidden;background:#fef2f2}\
    .df-hdr{background:#fee2e2;border-bottom:1px solid #fecaca;padding:10px 14px;display:flex;align-items:center;gap:10px}\
    .df-t{font-size:12px;font-weight:600;color:#7f1d1d}\
    .df-s{font-size:10px;color:#991b1b}\
    .df-body{padding:12px 16px}\
    .df-q1{font-size:12px;font-weight:500;color:#7f1d1d;margin-bottom:2px}\
    .df-q2{font-size:11px;color:#991b1b;opacity:.8;margin-bottom:10px}\
    .priv-note-red{display:flex;align-items:center;justify-content:center;gap:4px;font-size:10px;\
      color:rgba(153,27,27,.55);margin-top:8px}\
    \
    /* Sending/loading intermediate */\
    .sending-card{border-radius:16px;padding:22px 16px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px}\
    .sending-card.nb{background:#fffbeb;border:1px solid #fde68a}\
    .sending-card.rb{background:#fef2f2;border:1px solid #fecaca}\
    .sending-dots{display:flex;gap:6px;justify-content:center}\
    .sd{width:8px;height:8px;border-radius:50%;animation:bce .9s infinite}\
    .sd:nth-child(2){animation-delay:.15s}.sd:nth-child(3){animation-delay:.3s}\
    .sending-card.nb .sd{background:#f59e0b}\
    .sending-card.rb .sd{background:#dc2626}\
    .sending-label{font-size:12px;font-weight:500}\
    .sending-card.nb .sending-label{color:#78350f}\
    .sending-card.rb .sending-label{color:#7f1d1d}\
    \
    /* Done states */\
    .done{border-radius:16px;padding:22px;text-align:center;animation:doneIn .55s cubic-bezier(.34,1.56,.64,1)}\
    @keyframes doneIn{from{opacity:0;transform:scale(.88) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}\
    .done.tp{background:rgba(0,182,122,.05);border:1px solid rgba(0,182,122,.3)}\
    .done.ne{background:#fffbeb;border:1px solid #fde68a}\
    .done.di{background:#fef2f2;border:1px solid #fecaca}\
    .done-ic{font-size:28px;margin-bottom:8px}\
    .done-t{font-size:13px;font-weight:600;margin-bottom:4px}\
    .done-s{font-size:11px;opacity:.75}\
    .done.tp .done-t,.done.tp .done-s{color:#065f46}\
    .done.ne .done-t,.done.ne .done-s{color:#78350f}\
    .done.di .done-t,.done.di .done-s{color:#7f1d1d}\
    .done-stars{display:flex;justify-content:center;gap:4px;margin-bottom:10px;animation:popIn .6s cubic-bezier(.34,1.56,.64,1)}\
    .done-check{animation:popIn .5s .1s cubic-bezier(.34,1.56,.64,1) both}\
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

  function csatHTML() {
    return '<div class="csat">'
      + '<p class="csat-t">How did we do today?</p>'
      + '<p class="csat-s">Rate your support experience</p>'
      + '<div class="csat-row">'
      + '<button class="co s" data-action="satisfied"><span class="co-em">😊</span><span class="co-lb">Satisfied</span></button>'
      + '<button class="co n" data-action="neutral"><span class="co-em">😐</span><span class="co-lb">Neutral</span></button>'
      + '<button class="co d" data-action="dissatisfied"><span class="co-em">☹️</span><span class="co-lb">Unhappy</span></button>'
      + '</div></div>';
  }

  function starsRowHTML(hov, sel) {
    var html = '<div class="tp-stars" id="star-row">';
    for (var i = 1; i <= 5; i++) {
      var filled = i <= (hov || sel);
      html += '<button class="tp-st" data-action="star" data-star="' + i + '">' + starSVG(filled) + '</button>';
    }
    return html + '</div>';
  }

  function tpInviteHTML() {
    var selStar = S.selStar;
    var hov = S.hoverStar;
    return '<div class="tp-card">'
      + '<div class="tp-hdr">'
      + '<button class="back-btn back-btn-tp" data-action="back">' + backIcon('rgba(255,255,255,.85)') + '</button>'
      + '<div><div class="tp-brand">Trustpilot</div><div class="tp-dom">trustpilot.com</div></div>'
      + '<div class="tp-sm-stars" style="margin-left:auto">'
      + [1,2,3,4,5].map(function(){ return '<div class="tp-sms">' + starSVG(true, 13) + '</div>'; }).join('')
      + '</div></div>'
      + '<div class="tp-body"><p class="tp-q">How was your experience with ' + esc(CFG.merchantName) + '?</p>'
      + '<p class="tp-qs">Takes less than 30 seconds.</p>'
      + (!selStar
          ? starsRowHTML(hov, 0) + '<p class="tp-hint">Click a star to rate</p>'
          : '<div class="tp-success"><div class="tp-suc-stars">' + [1,2,3,4,5].map(function(n){ return starSVG(n <= selStar, 30); }).join('') + '</div>'
            + '<div class="tp-suc-msg">' + checkIcon(TP_GREEN) + ' Redirecting to Trustpilot…</div>'
            + '<a href="https://www.trustpilot.com" target="_blank" class="tp-ext">Open Trustpilot ' + extLinkIcon() + '</a>'
            + '</div>'
        )
      + '</div>'
      + '<div class="tp-ftr">' + lockIcon() + ' Publicly visible on Trustpilot</div>'
      + '</div>';
  }

  function neutralFormHTML() {
    return '<div class="nf-card">'
      + '<div class="nf-hdr">'
      + '<button class="back-btn back-btn-nf" data-action="back">' + backIcon('#92400e') + '</button>'
      + '<div style="font-size:18px">😐</div>'
      + '<div><p class="nf-t">Thanks for your honesty!</p><p class="nf-s">Private — only our team will see this</p></div>'
      + '<div style="margin-left:auto">' + shieldIcon('#d97706') + '</div></div>'
      + '<div class="nf-body"><p class="nf-q">What could we do to earn a ⭐⭐⭐⭐⭐ experience next time?</p>'
      + '<textarea class="f-ta" rows="3" placeholder="Tell us what we could improve…" id="neutral-ta"></textarea>'
      + '<button class="sub-btn nb" data-action="submit-neutral" disabled>Send Private Feedback</button>'
      + '<p class="priv-note">' + lockIcon() + ' Only shared with our team</p>'
      + '</div></div>';
  }

  function dissatisfiedFormHTML() {
    return '<div class="df-card">'
      + '<div class="df-hdr">'
      + '<button class="back-btn back-btn-df" data-action="back">' + backIcon('#991b1b') + '</button>'
      + '<div style="font-size:18px">☹️</div>'
      + '<div><p class="df-t">We sincerely apologise.</p><p class="df-s">Escalated to a manager</p></div>'
      + '<div style="margin-left:auto">' + warnIcon('#ef4444') + '</div></div>'
      + '<div class="df-body"><p class="df-q1">Our manager will personally review your case within 24 hours.</p>'
      + '<p class="df-q2">Please describe what went wrong.</p>'
      + '<textarea class="f-ta red" rows="3" placeholder="Please describe your experience…" id="dissatisfied-ta"></textarea>'
      + '<button class="sub-btn rb" data-action="submit-dissatisfied" disabled>Escalate to Manager</button>'
      + '<p class="priv-note-red">' + lockIcon() + ' Completely private — never posted publicly</p>'
      + '</div></div>';
  }

  function sendingCardHTML(type) {
    // Intermediate "sending…" state shown briefly before done card appears
    var cls = type === 'neutral' ? 'nb' : 'rb';
    var label = type === 'neutral' ? 'Sending your feedback…' : 'Escalating to manager…';
    return '<div class="sending-card ' + cls + '">'
      + '<div class="sending-dots"><div class="sd"></div><div class="sd"></div><div class="sd"></div></div>'
      + '<p class="sending-label">' + label + '</p>'
      + '</div>';
  }

  function doneHTML(type, stars) {
    if (type === 'tp') return '<div class="done tp">'
      + '<div class="done-stars">' + [1,2,3,4,5].map(function(n){ return starSVG(n <= stars, 22); }).join('') + '</div>'
      + '<div class="done-check">' + checkIcon(TP_GREEN) + '</div>'
      + '<p class="done-t" style="margin-top:6px">Thank you for your review!</p>'
      + '<p class="done-s">Your ' + stars + '-star review means the world to us.</p>'
      + '</div>';
    if (type === 'neutral') return '<div class="done ne">'
      + '<div style="margin-bottom:8px">' + thumbsUpIcon() + '</div>'
      + '<p class="done-t">Feedback received — thank you!</p>'
      + '<p class="done-s">Our team will work to earn that 5-star next time.</p>'
      + '</div>';
    return '<div class="done di">'
      + '<div style="margin-bottom:8px">' + shieldIcon('#ef4444') + '</div>'
      + '<p class="done-t">Case escalated to our manager.</p>'
      + '<p class="done-s">You\'ll receive a follow-up within 24 hours.</p>'
      + '</div>';
  }

  function footerHTML() {
    var p = S.phase;
    var isDone = p === 'tp-done' || p === 'neutral-done' || p === 'dissatisfied-done';

    return '<div class="ftr">'
      + (p === 'playing'
          ? '<div class="input-row"><div class="fake-input">Chat in progress…</div><div class="send-fk">' + sendIcon() + '</div></div>'
          : isDone
            ? '<button class="replay-row" data-action="replay">' + replayIcon() + ' Replay Demo</button>'
            : '<div class="sess-closed">Session closed</div>'
        )
      + '</div>';
  }

  /* ─── Render ──────────────────────────────────────────────────────────────── */
  function renderPanel() {
    var p = S.phase;
    var msgs = S.shownMsgs || [];

    var msgsInner = msgs.map(msgHTML).join('');

    // Phase-specific card at end of messages
    var card = '';
    if (p === 'csat')                  card = csatHTML();
    else if (p === 'tp')               card = tpInviteHTML();
    else if (p === 'neutral')          card = neutralFormHTML();
    else if (p === 'dissatisfied')     card = dissatisfiedFormHTML();
    else if (p === 'sending-neutral')  card = sendingCardHTML('neutral');
    else if (p === 'sending-dissatisfied') card = sendingCardHTML('dissatisfied');
    else if (p === 'tp-done')          card = doneHTML('tp', S.selStar);
    else if (p === 'neutral-done')     card = doneHTML('neutral', 0);
    else if (p === 'dissatisfied-done') card = doneHTML('dissatisfied', 0);

    return '<div class="panel">'
      + '<div class="hdr">' + avHTML()
      + '<div class="agent-info"><div class="agent-name">Seel Support</div>'
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
      + '<button class="bubble-btn' + (S.open ? ' open' : '') + '" data-action="toggle">'
      + (S.open ? closeIcon() : chatIcon()) + '</button>';
    scrollMsgs();
    wireTextareas();
  }

  function scrollMsgs() {
    var el = shadow.getElementById('msgs-area');
    if (el) el.scrollTop = el.scrollHeight;
  }

  function wireTextareas() {
    var nta = shadow.getElementById('neutral-ta');
    var dta = shadow.getElementById('dissatisfied-ta');
    if (nta) {
      nta.addEventListener('input', function() {
        var btn = shadow.querySelector('[data-action="submit-neutral"]');
        if (btn) btn.disabled = !nta.value.trim();
      });
    }
    if (dta) {
      dta.addEventListener('input', function() {
        var btn = shadow.querySelector('[data-action="submit-dissatisfied"]');
        if (btn) btn.disabled = !dta.value.trim();
      });
    }
  }

  /* ─── Partial star re-render (no full repaint) ────────────────────────────── */
  function reRenderStars() {
    var row = shadow.getElementById('star-row');
    if (!row) return;
    row.innerHTML = '';
    for (var i = 1; i <= 5; i++) {
      var btn = document.createElement('button');
      btn.className = 'tp-st';
      btn.setAttribute('data-action', 'star');
      btn.setAttribute('data-star', i);
      btn.innerHTML = starSVG(i <= (S.hoverStar || S.selStar));
      row.appendChild(btn);
    }
  }

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

  /* ─── State transitions ───────────────────────────────────────────────────── */
  function toggle() {
    S.open = !S.open;
    if (S.open && S.phase === 'idle') startPlay();
    renderRoot();
  }

  function startPlay() {
    S.phase = 'playing';
    S.shownMsgs = [];
    S.typing = false;
    S.selStar = 0;
    S.hoverStar = 0;
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
          // Auto-detect resolution: last agent message signals issue resolved → show CSAT
          later(function() { S.phase = 'csat'; renderRoot(); }, 1500);
        }
      }; }(msg, i), revealAt);
    });
  }

  function goBack() {
    // Return to CSAT selection from any tier card
    S.hoverStar = 0;
    S.selStar   = 0;
    S.phase = 'csat';
    renderRoot();
  }

  function satisfied() {
    S.phase = 'tp';
    renderRoot();
    console.log('[Seel] Intent logged — Satisfied · Order #' + CFG.orderId + ' · ' + CFG.customerName);
  }

  function neutral()      { S.phase = 'neutral';      renderRoot(); }
  function dissatisfied() { S.phase = 'dissatisfied'; renderRoot(); }

  function rateStar(n) {
    if (S.selStar) return;
    S.selStar = n;
    renderRoot(); // shows stars filled + "Opening Trustpilot…"
    later(function() {
      // Open Trustpilot in a new tab then show done confirmation
      G.open('https://www.trustpilot.com', '_blank');
      S.phase = 'tp-done';
      renderRoot();
    }, 800);
  }

  function submitNeutral() {
    // Show sending → then done
    S.phase = 'sending-neutral';
    renderRoot();
    later(function() { S.phase = 'neutral-done'; renderRoot(); }, 900);
  }

  function submitDissatisfied() {
    S.phase = 'sending-dissatisfied';
    renderRoot();
    later(function() { S.phase = 'dissatisfied-done'; renderRoot(); }, 900);
  }

  function replay() {
    clearTimers();
    S.phase = 'idle';
    S.shownMsgs = [];
    S.typing = false;
    S.selStar = 0;
    S.hoverStar = 0;
    S.open = false;
    renderRoot();
  }

  /* ─── Event delegation ────────────────────────────────────────────────────── */
  function onShadowClick(e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    switch (el.getAttribute('data-action')) {
      case 'toggle':               toggle(); break;
      case 'back':                 goBack(); break;
      case 'satisfied':            satisfied(); break;
      case 'neutral':              neutral(); break;
      case 'dissatisfied':         dissatisfied(); break;
      case 'star':
        var n = parseInt(el.getAttribute('data-star'), 10);
        if (n) rateStar(n);
        break;
      case 'submit-neutral':       submitNeutral(); break;
      case 'submit-dissatisfied':  submitDissatisfied(); break;
      case 'replay':               replay(); break;
    }
  }

  function onShadowMouseover(e) {
    if (S.selStar) return;
    var star = e.target.closest('[data-star]');
    if (star) {
      S.hoverStar = parseInt(star.getAttribute('data-star'), 10);
      reRenderStars();
    }
  }

  function onShadowMouseout(e) {
    if (S.selStar) return;
    var starsRow = e.target.closest('#star-row');
    if (starsRow && !starsRow.contains(e.relatedTarget)) {
      S.hoverStar = 0;
      reRenderStars();
    }
  }

  /* ─── Boot ────────────────────────────────────────────────────────────────── */
  function boot() {
    if (document.getElementById(HOST_ID)) return;

    var host = document.createElement('div');
    host.id = HOST_ID;
    document.body.appendChild(host);

    shadow = host.attachShadow({ mode: 'open' });

    var styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    shadow.appendChild(styleEl);

    var root = document.createElement('div');
    root.id = 'seel-root';
    root.className = 'root';
    shadow.appendChild(root);

    shadow.addEventListener('click',     onShadowClick);
    shadow.addEventListener('mouseover', onShadowMouseover);
    shadow.addEventListener('mouseout',  onShadowMouseout);

    renderRoot();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

}(window));
