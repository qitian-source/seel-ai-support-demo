/*!
 * Seel Review Plugin — Interactive Demo Widget v2.0
 *
 * Self-contained drop-in script. Mounts via Shadow DOM — zero CSS conflicts.
 *
 * Compliance-first flow: NO CSAT pre-screening.
 * All users see both Trustpilot invite AND private feedback in parallel.
 *
 * Phase state machine:
 *   idle → playing → invite → tp → tp-done
 *                           → feedback → sending-feedback → feedback-done
 *
 * Usage:
 *   <script src="seel-demo-widget-v2.js" async></script>
 *
 * Optional config (set before script tag):
 *   window.SeelDemoV2Config = { merchantName, orderId, customerName };
 */
(function (G) {
  'use strict';

  /* ─── Guard ───────────────────────────────────────────────────────────────── */
  var HOST_ID = '__seel_v2_root__';
  if (G.document.getElementById(HOST_ID)) return;

  /* ─── Config ──────────────────────────────────────────────────────────────── */
  var CFG = Object.assign(
    { merchantName: 'AlexSong Store', orderId: '10342', customerName: 'Carlos Rivera' },
    G.SeelDemoV2Config || G.SeelDemoConfig || {}
  );

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
    open:        false,
    phase:       'idle',   // idle | playing | invite | tp | feedback | sending-feedback | tp-done | feedback-done
    msgIdx:      0,
    hoverStar:   0,
    selStar:     0,
    feedbackText:'',
    timers:      [],
    shownMsgs:   [],
    typing:      false,
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
  function extLinkIcon() {
    return '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="' + TP_GREEN + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
  }
  function sendIcon() {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
  }
  function replayIcon() {
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/></svg>';
  }
  function noteIcon(color) {
    color = color || PURPLE;
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';
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
    .invite-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:16px 14px}\
    .invite-title{font-size:13px;font-weight:600;color:#111827;text-align:center;margin-bottom:3px}\
    .invite-sub{font-size:11px;color:#9ca3af;text-align:center;margin-bottom:14px}\
    .invite-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}\
    .inv-btn{display:flex;flex-direction:column;align-items:center;gap:5px;border:2px solid transparent;\
      border-radius:12px;padding:13px 8px;cursor:pointer;background:none;\
      transition:border-color .18s,background .18s,transform .18s;font-family:inherit}\
    .inv-btn:active{transform:scale(.96)}\
    .inv-btn.tp-opt{border-color:rgba(0,182,122,.35)}\
    .inv-btn.tp-opt:hover{border-color:' + TP_GREEN + ';background:rgba(0,182,122,.05)}\
    .inv-btn.fb-opt{border-color:rgba(108,71,255,.3)}\
    .inv-btn.fb-opt:hover{border-color:' + PURPLE + ';background:rgba(108,71,255,.05)}\
    .inv-icon{font-size:28px;line-height:1}\
    .inv-label{font-size:13px;font-weight:600;color:#111827}\
    .inv-desc{font-size:11px;color:#6b7280;text-align:center}\
    .inv-tag{font-size:10px;color:#9ca3af;font-style:italic}\
    .invite-note{text-align:center;font-size:10px;color:#9ca3af;padding-top:2px}\
    \
    /* Back button */\
    .back-btn{background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:4px;\
      font-size:11px;font-weight:500;padding:2px 0;opacity:.7;transition:opacity .15s;line-height:0}\
    .back-btn:hover{opacity:1}\
    .back-btn-tp{color:rgba(255,255,255,.85)}\
    .back-btn-tp:hover{color:#fff}\
    .back-btn-fb{color:rgba(108,71,255,.75)}\
    .back-btn-fb:hover{color:' + PURPLE + '}\
    \
    /* Trustpilot card */\
    .tp-card{border:1px solid rgba(0,182,122,.3);border-radius:16px;overflow:hidden;background:#fff;\
      box-shadow:0 2px 8px rgba(0,0,0,.08)}\
    .tp-hdr{background:' + TP_GREEN + ';padding:12px 16px;display:flex;align-items:center;gap:8px}\
    .tp-brand{color:#fff;font-weight:700;font-size:15px}\
    .tp-dom{color:rgba(255,255,255,.7);font-size:10px}\
    .tp-sm-stars{display:flex;gap:3px;margin-left:auto}\
    .tp-sms{width:24px;height:24px;background:#fff;border-radius:3px;display:flex;align-items:center;justify-content:center}\
    .tp-body{padding:14px 16px 0}\
    .tp-q{font-size:12px;font-weight:600;color:#111827;margin-bottom:3px}\
    .tp-qs{font-size:11px;color:#9ca3af;margin-bottom:14px}\
    .tp-stars{display:flex;justify-content:center;gap:6px;margin-bottom:10px}\
    .tp-st{background:none;border:none;cursor:pointer;transition:transform .15s;line-height:0;padding:0}\
    .tp-st:hover{transform:scale(1.12)}\
    .tp-hint{text-align:center;font-size:10px;color:#9ca3af;margin-bottom:12px}\
    .tp-success{display:flex;flex-direction:column;align-items:center;gap:8px;padding:6px 0 10px;\
      animation:popIn .5s cubic-bezier(.34,1.56,.64,1)}\
    @keyframes popIn{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}\
    .tp-suc-stars{display:flex;gap:4px}\
    .tp-suc-msg{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:' + TP_GREEN + '}\
    .tp-ext{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:' + TP_GREEN + ';font-weight:500;text-decoration:none}\
    .tp-ftr{border-top:1px solid #f3f4f6;padding:9px 16px;display:flex;align-items:center;gap:5px;font-size:10px;color:#9ca3af}\
    \
    /* Feedback card */\
    .fb-card{border:1px solid rgba(108,71,255,.25);border-radius:16px;overflow:hidden;background:#fff;\
      box-shadow:0 2px 8px rgba(0,0,0,.08)}\
    .fb-hdr{background:' + PURPLE + ';padding:12px 16px;display:flex;align-items:center;gap:8px}\
    .fb-brand{color:#fff;font-weight:700;font-size:14px}\
    .fb-sub{color:rgba(255,255,255,.7);font-size:10px}\
    .fb-body{padding:14px 16px}\
    .fb-q{font-size:12px;font-weight:600;color:#111827;margin-bottom:3px}\
    .fb-qs{font-size:11px;color:#9ca3af;margin-bottom:12px}\
    .f-ta{width:100%;border:1px solid #e0d9ff;border-radius:8px;padding:10px 12px;\
      font-size:12px;resize:none;font-family:inherit;color:#111827;background:#faf9ff;outline:none;transition:box-shadow .2s}\
    .f-ta:focus{box-shadow:0 0 0 3px rgba(108,71,255,.18);border-color:' + PURPLE + '}\
    .sub-btn{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;margin-top:10px;\
      border:none;border-radius:8px;padding:9px 0;font-size:12px;font-weight:600;cursor:pointer;\
      transition:background .2s,opacity .2s;font-family:inherit;background:' + PURPLE + ';color:#fff}\
    .sub-btn:hover{background:#5535e0}\
    .sub-btn:disabled{opacity:.4;cursor:default;pointer-events:none}\
    .fb-priv{display:flex;align-items:center;justify-content:center;gap:4px;font-size:10px;\
      color:rgba(108,71,255,.55);margin-top:8px}\
    \
    /* Sending state */\
    .sending-card{border-radius:16px;padding:22px 16px;text-align:center;display:flex;\
      flex-direction:column;align-items:center;gap:10px;\
      background:rgba(108,71,255,.04);border:1px solid rgba(108,71,255,.2)}\
    .sending-dots{display:flex;gap:6px;justify-content:center}\
    .sd{width:8px;height:8px;border-radius:50%;background:' + PURPLE + ';animation:bce .9s infinite}\
    .sd:nth-child(2){animation-delay:.15s}.sd:nth-child(3){animation-delay:.3s}\
    .sending-label{font-size:12px;font-weight:500;color:#4c2fbd}\
    \
    /* Done states */\
    .done{border-radius:16px;padding:22px;text-align:center;animation:doneIn .55s cubic-bezier(.34,1.56,.64,1)}\
    @keyframes doneIn{from{opacity:0;transform:scale(.88) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}\
    .done.tp-done{background:rgba(0,182,122,.05);border:1px solid rgba(0,182,122,.3)}\
    .done.fb-done{background:rgba(108,71,255,.04);border:1px solid rgba(108,71,255,.2)}\
    .done-ic{font-size:28px;margin-bottom:8px}\
    .done-t{font-size:13px;font-weight:600;margin-bottom:4px}\
    .done-s{font-size:11px;opacity:.75}\
    .done.tp-done .done-t,.done.tp-done .done-s{color:#065f46}\
    .done.fb-done .done-t,.done.fb-done .done-s{color:#4c2fbd}\
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

  function inviteHTML() {
    return '<div class="invite-card">'
      + '<p class="invite-title">感谢您的支持！</p>'
      + '<p class="invite-sub">请选择您希望如何分享您的体验</p>'
      + '<div class="invite-grid">'
      + '<button class="inv-btn tp-opt" data-action="go-tp">'
      + '<span class="inv-icon">🌟</span>'
      + '<span class="inv-label">Trustpilot 评价</span>'
      + '<span class="inv-desc">公开分享您的体验</span>'
      + '</button>'
      + '<button class="inv-btn fb-opt" data-action="go-feedback">'
      + '<span class="inv-icon">📝</span>'
      + '<span class="inv-label">私密反馈</span>'
      + '<span class="inv-desc">仅我们内部可见</span>'
      + '<span class="inv-tag">（可选）</span>'
      + '</button>'
      + '</div>'
      + '<p class="invite-note">两个选项相互独立，可都选择</p>'
      + '</div>';
  }

  function starsRowHTML() {
    var html = '<div class="tp-stars" id="star-row">';
    for (var i = 1; i <= 5; i++) {
      var filled = i <= (S.hoverStar || S.selStar);
      html += '<button class="tp-st" data-action="rate-star" data-star="' + i + '">' + starSVG(filled) + '</button>';
    }
    return html + '</div>';
  }

  function tpCardHTML() {
    var sel = S.selStar;
    var hov = S.hoverStar;
    return '<div class="tp-card">'
      + '<div class="tp-hdr">'
      + '<button class="back-btn back-btn-tp" data-action="back">' + backIcon('rgba(255,255,255,.85)') + '</button>'
      + '<div><div class="tp-brand">Trustpilot</div><div class="tp-dom">trustpilot.com</div></div>'
      + '<div class="tp-sm-stars">'
      + [1,2,3,4,5].map(function(){ return '<div class="tp-sms">' + starSVG(true, 13) + '</div>'; }).join('')
      + '</div></div>'
      + '<div class="tp-body">'
      + '<p class="tp-q">How was your experience with ' + esc(CFG.merchantName) + '?</p>'
      + '<p class="tp-qs">Takes less than 30 seconds.</p>'
      + (!sel
          ? starsRowHTML() + '<p class="tp-hint">Click a star to rate</p>'
          : '<div class="tp-success">'
            + '<div class="tp-suc-stars">' + [1,2,3,4,5].map(function(n){ return starSVG(n <= sel, 30); }).join('') + '</div>'
            + '<div class="tp-suc-msg">' + checkIcon(TP_GREEN) + ' Redirecting to Trustpilot…</div>'
            + '<a href="https://www.trustpilot.com" target="_blank" class="tp-ext">Open Trustpilot ' + extLinkIcon() + '</a>'
            + '</div>'
        )
      + '</div>'
      + '<div class="tp-ftr">' + lockIcon() + ' Publicly visible on Trustpilot</div>'
      + '</div>';
  }

  function feedbackCardHTML() {
    return '<div class="fb-card">'
      + '<div class="fb-hdr">'
      + '<button class="back-btn back-btn-fb" data-action="back">' + backIcon('rgba(255,255,255,.85)') + '</button>'
      + '<div>' + noteIcon('#fff') + '</div>'
      + '<div><div class="fb-brand">私密反馈</div><div class="fb-sub">仅我们内部可见</div></div>'
      + '</div>'
      + '<div class="fb-body">'
      + '<p class="fb-q">您对这次服务有什么想法？</p>'
      + '<p class="fb-qs">您的反馈帮助我们持续改进。</p>'
      + '<textarea class="f-ta" rows="3" placeholder="请告诉我们您的想法…" id="feedback-ta"></textarea>'
      + '<button class="sub-btn" data-action="submit-feedback" disabled>提交反馈</button>'
      + '<p class="fb-priv">' + lockIcon() + ' 仅与我们的团队共享</p>'
      + '</div></div>';
  }

  function sendingFeedbackHTML() {
    return '<div class="sending-card">'
      + '<div class="sending-dots"><div class="sd"></div><div class="sd"></div><div class="sd"></div></div>'
      + '<p class="sending-label">正在发送您的反馈…</p>'
      + '</div>';
  }

  function doneHTML(type, stars) {
    if (type === 'tp') {
      return '<div class="done tp-done">'
        + '<div class="done-stars">' + [1,2,3,4,5].map(function(n){ return starSVG(n <= stars, 22); }).join('') + '</div>'
        + '<div class="done-check">' + checkIcon(TP_GREEN) + '</div>'
        + '<p class="done-t" style="margin-top:6px">Thank you for your review!</p>'
        + '<p class="done-s">Your ' + stars + '-star review means the world to us.</p>'
        + '</div>';
    }
    return '<div class="done fb-done">'
      + '<div class="done-ic">📩</div>'
      + '<p class="done-t">反馈已收到，感谢您！</p>'
      + '<p class="done-s">我们会认真阅读您的每一条反馈。</p>'
      + '</div>';
  }

  function footerHTML() {
    var p = S.phase;
    var isDone = p === 'tp-done' || p === 'feedback-done';
    if (p === 'playing') {
      return '<div class="ftr"><div class="input-row">'
        + '<div class="fake-input">Type a message…</div>'
        + '<div class="send-fk">' + sendIcon() + '</div>'
        + '</div></div>';
    }
    if (isDone) {
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
    if (p === 'invite')           card = inviteHTML();
    else if (p === 'tp')          card = tpCardHTML();
    else if (p === 'feedback')    card = feedbackCardHTML();
    else if (p === 'sending-feedback') card = sendingFeedbackHTML();
    else if (p === 'tp-done')     card = doneHTML('tp', S.selStar);
    else if (p === 'feedback-done') card = doneHTML('feedback', 0);

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
    wireTextarea();
  }

  function scrollMsgs() {
    var el = shadow.getElementById('msgs-area');
    if (el) el.scrollTop = el.scrollHeight;
  }

  function wireTextarea() {
    var ta = shadow.getElementById('feedback-ta');
    if (ta) {
      ta.addEventListener('input', function() {
        var btn = shadow.querySelector('[data-action="submit-feedback"]');
        if (btn) btn.disabled = !ta.value.trim();
        S.feedbackText = ta.value;
      });
    }
  }

  /* ─── Partial star re-render ──────────────────────────────────────────────── */
  function reRenderStars() {
    var row = shadow.getElementById('star-row');
    if (!row) return;
    row.innerHTML = '';
    for (var i = 1; i <= 5; i++) {
      var btn = document.createElement('button');
      btn.className = 'tp-st';
      btn.setAttribute('data-action', 'rate-star');
      btn.setAttribute('data-star', i);
      btn.innerHTML = starSVG(i <= (S.hoverStar || S.selStar));
      row.appendChild(btn);
    }
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
    S.selStar = 0;
    S.hoverStar = 0;
    S.feedbackText = '';
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
          later(function() { S.phase = 'invite'; renderRoot(); }, 1500);
        }
      }; }(msg, i), revealAt);
    });
  }

  function goBack() {
    S.phase = 'invite';
    S.hoverStar = 0;
    S.selStar = 0;
    renderRoot();
  }

  function goTp() {
    S.phase = 'tp';
    renderRoot();
  }

  function goFeedback() {
    S.phase = 'feedback';
    renderRoot();
  }

  function rateStar(n) {
    if (S.selStar) return;
    S.selStar = n;
    renderRoot();
    later(function() {
      G.open('https://www.trustpilot.com', '_blank');
      S.phase = 'tp-done';
      renderRoot();
    }, 800);
  }

  function submitFeedback() {
    S.phase = 'sending-feedback';
    renderRoot();
    later(function() { S.phase = 'feedback-done'; renderRoot(); }, 900);
  }

  function replay() {
    clearTimers();
    S.phase = 'idle';
    S.shownMsgs = [];
    S.typing = false;
    S.selStar = 0;
    S.hoverStar = 0;
    S.feedbackText = '';
    S.open = false;
    renderRoot();
  }

  /* ─── Event delegation ────────────────────────────────────────────────────── */
  function onShadowClick(e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var action = el.getAttribute('data-action');
    switch (action) {
      case 'open-widget':  openWidget(); break;
      case 'toggle':       openWidget(); break;
      case 'go-tp':        goTp(); break;
      case 'go-feedback':  goFeedback(); break;
      case 'back':         goBack(); break;
      case 'rate-star':
        var n = parseInt(el.getAttribute('data-star'), 10);
        if (n) rateStar(n);
        break;
      case 'submit-feedback': submitFeedback(); break;
      case 'replay':       replay(); break;
    }
  }

  function onShadowMouseover(e) {
    if (S.selStar) return;
    var star = e.target.closest('[data-action="rate-star"]');
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

    shadow.addEventListener('click',     onShadowClick);
    shadow.addEventListener('mouseover', onShadowMouseover);
    shadow.addEventListener('mouseout',  onShadowMouseout);

    renderRoot();
  }

  if (G.document.readyState === 'loading') {
    G.document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

}(window));
