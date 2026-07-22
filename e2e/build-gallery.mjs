// Build a self-contained visual gallery from a journey run.
// Reads results.json (written by journey.spec.ts) + the shots/*.png captured during the run,
// compresses each screenshot (macOS `sips`), and emits journey-gallery.html with the images
// embedded as base64 data URIs. Open the HTML in a browser, or publish it as an artifact.
//
//   node build-gallery.mjs      # after: npx playwright test journey.spec.ts
import { readFileSync, writeFileSync, readdirSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath (not .pathname) so paths containing spaces don't arrive %20-encoded
const HERE = fileURLToPath(new URL('.', import.meta.url));
const results = JSON.parse(readFileSync(join(HERE, 'results.json'), 'utf8'));
const shots = readdirSync(join(HERE, 'shots')).filter(f => f.endsWith('.png'));
const tmp = mkdtempSync(join(tmpdir(), 'gallery-'));

// stable clinical step titles (the journey is a fixed 12-act sequence)
const TITLES = {
  '1': 'Register the patient', '2': 'Book an appointment', '3': 'Triage & vitals',
  '4': 'Consultation', '5': 'Prescription', '6': 'Dispense medication', '7': 'Lab workflow',
  '8': 'Admit to a bed', '9': 'Operation theatre', '10': 'Invoice & payment',
  '11': 'Patient portal', '12': 'Discharge',
};
// prefer a specific screenshot for acts that capture several
const PREFERRED = { '9': '09-ot-scheduled.png' };

const pad = (n) => String(n).padStart(2, '0');
function shotFor(act) {
  if (PREFERRED[act] && shots.includes(PREFERRED[act])) return PREFERRED[act];
  const pass = shots.find(f => f.startsWith(pad(act) + '-') && !/-FAIL|-modal/.test(f));
  return pass || shots.find(f => f.startsWith(pad(act) + '-'));
}
function embed(png) {
  const out = join(tmp, png.replace('.png', '.jpg'));
  execFileSync('sips', ['-Z', '1100', '-s', 'format', 'jpeg', '-s', 'formatOptions', '62', join(HERE, 'shots', png), '--out', out], { stdio: 'ignore' });
  return `data:image/jpeg;base64,${readFileSync(out).toString('base64')}`;
}

const cards = results.map(r => {
  const png = shotFor(r.act);
  const src = png ? embed(png) : '';
  const ok = r.status === 'PASS';
  return `
      <article class="act">
        <div class="rail"><span class="num">${pad(r.act)}</span></div>
        <div class="body">
          <header class="act-head">
            <div class="meta"><span class="persona">${r.persona}</span><h2>${TITLES[r.act] || ('Act ' + r.act)}</h2></div>
            <span class="pill ${ok ? 'pass' : 'fail'}">${r.status}</span>
          </header>
          <p class="detail">${(r.detail || '').replace(/</g, '&lt;')}</p>
          ${src ? `<figure class="shot"><div class="chrome"><span></span><span></span><span></span><em>care-sims.vercel.app</em></div><img loading="lazy" src="${src}" alt="Act ${r.act}"/></figure>` : ''}
        </div>
      </article>`;
}).join('\n');

const pass = results.filter(r => r.status === 'PASS').length;
const html = `<title>Ayphen HMS — Patient Journey Verified Live</title>
<style>
  :root{--bg:#f5f8f7;--surface:#fff;--ink:#0e1a19;--muted:#5c6f6d;--border:#e3ebe9;--teal:#0f766e;--accent:#14b8a6;--good:#0f9d6b;--good-bg:#e7f6ef;--bad:#dc2626;--bad-bg:#fdeceb;--rail:#0f766e;--shadow:0 1px 2px rgba(12,40,37,.05),0 12px 30px -12px rgba(12,40,37,.18);}
  @media (prefers-color-scheme:dark){:root{--bg:#080f0e;--surface:#0f1918;--ink:#e7f0ef;--muted:#8ba09d;--border:#1d2b29;--teal:#2dd4bf;--accent:#5eead4;--good:#34d399;--good-bg:#0e2620;--bad:#f87171;--bad-bg:#2a1514;--rail:#134e48;--shadow:0 1px 2px rgba(0,0,0,.4),0 18px 40px -16px rgba(0,0,0,.6);}}
  :root[data-theme="light"]{--bg:#f5f8f7;--surface:#fff;--ink:#0e1a19;--muted:#5c6f6d;--border:#e3ebe9;--teal:#0f766e;--accent:#14b8a6;--good:#0f9d6b;--good-bg:#e7f6ef;--bad:#dc2626;--bad-bg:#fdeceb;--rail:#0f766e;--shadow:0 1px 2px rgba(12,40,37,.05),0 12px 30px -12px rgba(12,40,37,.18);}
  :root[data-theme="dark"]{--bg:#080f0e;--surface:#0f1918;--ink:#e7f0ef;--muted:#8ba09d;--border:#1d2b29;--teal:#2dd4bf;--accent:#5eead4;--good:#34d399;--good-bg:#0e2620;--bad:#f87171;--bad-bg:#2a1514;--rail:#134e48;--shadow:0 1px 2px rgba(0,0,0,.4),0 18px 40px -16px rgba(0,0,0,.6);}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:ui-sans-serif,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.5;-webkit-font-smoothing:antialiased;}
  .wrap{max-width:940px;margin:0 auto;padding:clamp(20px,5vw,56px) clamp(16px,4vw,32px) 80px;}
  header.top{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:20px;padding-bottom:24px;border-bottom:1px solid var(--border);}
  .brand{display:flex;align-items:center;gap:12px;}
  .logo{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--teal),var(--accent));box-shadow:var(--shadow);font-size:19px;}
  .eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;}
  h1{font-size:clamp(22px,3.6vw,30px);margin:2px 0 0;letter-spacing:-.02em;text-wrap:balance;}
  .score{display:flex;align-items:baseline;gap:10px;} .score b{font-size:34px;letter-spacing:-.03em;color:${pass === results.length ? 'var(--good)' : 'var(--ink)'};font-variant-numeric:tabular-nums;} .score span{font-size:13px;color:var(--muted);}
  .lede{color:var(--muted);font-size:15px;max-width:64ch;margin:18px 0 4px;}
  .legend{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:12.5px;color:var(--muted);margin:14px 0 36px;} .legend b{color:var(--ink);font-weight:600;}
  .acts{display:flex;flex-direction:column;gap:26px;}
  .act{display:grid;grid-template-columns:56px 1fr;gap:6px;position:relative;}
  .rail{display:flex;flex-direction:column;align-items:center;}
  .num{font-variant-numeric:tabular-nums;font-weight:700;font-size:14px;color:#fff;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--rail);box-shadow:var(--shadow);}
  .act:not(:last-child) .rail::after{content:"";flex:1;width:2px;margin-top:8px;background:linear-gradient(var(--border),transparent);}
  .body{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px 18px 20px;box-shadow:var(--shadow);min-width:0;}
  .act-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
  .persona{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--teal);font-weight:700;}
  .act-head h2{font-size:18px;margin:3px 0 0;letter-spacing:-.01em;}
  .pill{font-size:11px;font-weight:700;letter-spacing:.06em;padding:4px 10px;border-radius:999px;white-space:nowrap;}
  .pill.pass{color:var(--good);background:var(--good-bg);border:1px solid color-mix(in srgb,var(--good) 30%,transparent);}
  .pill.fail{color:var(--bad);background:var(--bad-bg);border:1px solid color-mix(in srgb,var(--bad) 30%,transparent);}
  .detail{color:var(--muted);font-size:14px;margin:10px 0 16px;max-width:66ch;}
  .shot{margin:0;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--bg);}
  .chrome{display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:1px solid var(--border);background:color-mix(in srgb,var(--surface) 70%,var(--bg));}
  .chrome span{width:9px;height:9px;border-radius:50%;background:var(--border);} .chrome em{margin-left:10px;font-style:normal;font-size:11.5px;color:var(--muted);}
  .shot img{display:block;width:100%;height:auto;}
  footer{margin-top:52px;padding-top:22px;border-top:1px solid var(--border);color:var(--muted);font-size:12.5px;display:flex;flex-wrap:wrap;gap:6px 16px;} footer b{color:var(--ink);font-weight:600;}
  @media (max-width:560px){.act{grid-template-columns:40px 1fr}.num{width:30px;height:30px;font-size:13px}}
</style>
<div class="wrap">
  <header class="top">
    <div class="brand"><div class="logo">✚</div><div><div class="eyebrow">Ayphen HMS · End-to-end verification</div><h1>Patient journey, verified in the live UI</h1></div></div>
    <div class="score"><b>${pass} / ${results.length}</b><span>acts passed</span></div>
  </header>
  <p class="lede">Every step below was driven through the deployed application in a real browser — real logins, real clicks, real forms — then each result was confirmed against the database. These are the actual screens captured during the run.</p>
  <div class="legend"><span><b>UI-driven</b> — real browser &amp; logins</span><span><b>DB-verified</b> — every outcome checked via the API</span><span><b>Environment</b> — care-sims.vercel.app</span></div>
  <div class="acts">
${cards}
  </div>
  <footer><span><b>Run:</b> ${results.length}-act journey · ${pass}/${results.length} PASS</span><span><b>Spec:</b> ayphen-hms/e2e/journey.spec.ts</span><span><b>Captured:</b> live against production</span></footer>
</div>`;

writeFileSync(join(HERE, 'journey-gallery.html'), html);
console.log(`journey-gallery.html written — ${(html.length / 1024 / 1024).toFixed(2)} MB · ${pass}/${results.length} PASS`);
