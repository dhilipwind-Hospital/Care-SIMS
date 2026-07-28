// Build a self-contained visual gallery from a walkthrough run.
// Reads shots/walkthrough-results.json + shots/wt-*.png (written by walkthrough.spec.ts),
// compresses each screenshot (macOS `sips`), and emits walkthrough-gallery.html with
// images embedded as base64. Open in a browser or publish as an artifact.
//
//   node build-walkthrough-gallery.mjs    # after: npx playwright test walkthrough.spec.ts
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const steps = JSON.parse(readFileSync(join(HERE, 'shots', 'walkthrough-results.json'), 'utf8'));
const tmp = mkdtempSync(join(tmpdir(), 'wt-gallery-'));

function embed(png) {
  const out = join(tmp, png.replace('.png', '.jpg'));
  execFileSync('sips', ['-Z', '1100', '-s', 'format', 'jpeg', '-s', 'formatOptions', '62', join(HERE, 'shots', png), '--out', out], { stdio: 'ignore' });
  return `data:image/jpeg;base64,${readFileSync(out).toString('base64')}`;
}
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');

const FLOWS = {
  portal: {
    label: 'Flow A · Patient portal',
    persona: 'PATIENT',
    blurb: 'A patient books their own appointment end-to-end — then moves it, then cancels it — with no staff involved.',
  },
  staff: {
    label: 'Flow B · Staff wizard',
    persona: 'RECEPTION / ADMIN',
    blurb: 'Front-desk staff book on a patient’s behalf through the Self Booking wizard at Appointments → Self Booking.',
  },
  race: {
    label: 'Flow C · Guard rails',
    persona: 'TWO TABS · ONE SLOT',
    blurb: 'What stops a double booking: two tabs grab the same slot, only one wins, the loser gets a clear answer — enforced by a unique index in the database, not just UI checks. Plus doctor search filtering at the source.',
  },
};

const card = (s, i) => `
      <article class="act">
        <div class="rail"><span class="num">${String(i).padStart(2, '0')}</span></div>
        <div class="body">
          <header class="act-head">
            <h3>${esc(s.title)}</h3>
            <span class="pill ${s.status === 'PASS' ? 'pass' : 'fail'}">${s.status}</span>
          </header>
          <p class="detail">${esc(s.desc)}${s.detail ? ` <b class="verify">${esc(s.detail)}</b>` : ''}</p>
          <figure class="shot"><div class="chrome"><span></span><span></span><span></span><em>care-sims.vercel.app</em></div><img loading="lazy" src="${embed(s.shot)}" alt="${esc(s.title)}"/></figure>
        </div>
      </article>`;

const sections = Object.entries(FLOWS).map(([key, f]) => {
  const flowSteps = steps.filter(s => s.flow === key);
  let i = 0;
  return `
  <section class="flow">
    <header class="flow-head">
      <div><span class="persona">${f.persona}</span><h2>${esc(f.label)}</h2></div>
      <p class="blurb">${esc(f.blurb)}</p>
    </header>
    <div class="acts">
${flowSteps.map(s => card(s, ++i)).join('\n')}
    </div>
  </section>`;
}).join('\n');

const pass = steps.filter(s => s.status === 'PASS').length;
const glance = Object.fromEntries(Object.keys(FLOWS).map(k => [k, steps.filter(s => s.flow === k).map(s => s.title)]));

const html = `<title>Self-Booking — Live UI Walkthrough</title>
<style>
  :root{--bg:#f4f8f7;--surface:#fff;--ink:#0d1b19;--muted:#5b6f6c;--border:#e2ebe9;--teal:#0f766e;--accent:#14b8a6;--good:#0f9d6b;--good-bg:#e7f6ef;--bad:#dc2626;--bad-bg:#fdeceb;--shadow:0 1px 2px rgba(12,40,37,.05),0 12px 30px -12px rgba(12,40,37,.18);}
  @media (prefers-color-scheme:dark){:root{--bg:#0a1211;--surface:#101b19;--ink:#e7f0ef;--muted:#8ba09d;--border:#1e2d2a;--teal:#2dd4bf;--accent:#5eead4;--good:#34d399;--good-bg:#0e2620;--bad:#f87171;--bad-bg:#2a1514;--shadow:0 1px 2px rgba(0,0,0,.4),0 18px 40px -16px rgba(0,0,0,.6);}}
  :root[data-theme="light"]{--bg:#f4f8f7;--surface:#fff;--ink:#0d1b19;--muted:#5b6f6c;--border:#e2ebe9;--teal:#0f766e;--accent:#14b8a6;--good:#0f9d6b;--good-bg:#e7f6ef;--bad:#dc2626;--bad-bg:#fdeceb;--shadow:0 1px 2px rgba(12,40,37,.05),0 12px 30px -12px rgba(12,40,37,.18);}
  :root[data-theme="dark"]{--bg:#0a1211;--surface:#101b19;--ink:#e7f0ef;--muted:#8ba09d;--border:#1e2d2a;--teal:#2dd4bf;--accent:#5eead4;--good:#34d399;--good-bg:#0e2620;--bad:#f87171;--bad-bg:#2a1514;--shadow:0 1px 2px rgba(0,0,0,.4),0 18px 40px -16px rgba(0,0,0,.6);}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:ui-sans-serif,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.5;-webkit-font-smoothing:antialiased;}
  .wrap{max-width:940px;margin:0 auto;padding:clamp(20px,5vw,56px) clamp(16px,4vw,32px) 80px;}
  header.top{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:20px;padding-bottom:24px;border-bottom:1px solid var(--border);}
  .brand{display:flex;align-items:center;gap:12px;}
  .logo{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--teal),var(--accent));box-shadow:var(--shadow);font-size:19px;}
  .eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;}
  h1{font-size:clamp(22px,3.6vw,30px);margin:2px 0 0;letter-spacing:-.02em;text-wrap:balance;}
  .score{display:flex;align-items:baseline;gap:10px;} .score b{font-size:34px;letter-spacing:-.03em;color:${pass === steps.length ? 'var(--good)' : 'var(--ink)'};font-variant-numeric:tabular-nums;} .score span{font-size:13px;color:var(--muted);}
  .lede{color:var(--muted);font-size:15px;max-width:64ch;margin:18px 0 4px;}
  .legend{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:12.5px;color:var(--muted);margin:14px 0 30px;} .legend b{color:var(--ink);font-weight:600;}
  .glance{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin:0 0 40px;}
  .glance-col{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 18px;box-shadow:var(--shadow);}
  .glance-col h4{margin:0 0 8px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--teal);}
  .glance-col ol{margin:0;padding-left:20px;font-size:13.5px;color:var(--muted);} .glance-col li{margin:3px 0;} .glance-col li::marker{color:var(--teal);font-variant-numeric:tabular-nums;font-weight:600;}
  .flow{margin-top:44px;}
  .flow-head{margin-bottom:22px;} .flow-head h2{font-size:21px;margin:3px 0 0;letter-spacing:-.01em;}
  .persona{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--teal);font-weight:700;}
  .blurb{color:var(--muted);font-size:14px;margin:8px 0 0;max-width:64ch;}
  .acts{display:flex;flex-direction:column;gap:26px;}
  .act{display:grid;grid-template-columns:56px 1fr;gap:6px;position:relative;}
  .rail{display:flex;flex-direction:column;align-items:center;}
  .num{font-variant-numeric:tabular-nums;font-weight:700;font-size:14px;color:#fff;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--teal);box-shadow:var(--shadow);}
  .act:not(:last-child) .rail::after{content:"";flex:1;width:2px;margin-top:8px;background:linear-gradient(var(--border),transparent);}
  .body{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px 18px 20px;box-shadow:var(--shadow);min-width:0;}
  .act-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
  .act-head h3{font-size:17px;margin:0;letter-spacing:-.01em;}
  .pill{font-size:11px;font-weight:700;letter-spacing:.06em;padding:4px 10px;border-radius:999px;white-space:nowrap;}
  .pill.pass{color:var(--good);background:var(--good-bg);border:1px solid color-mix(in srgb,var(--good) 30%,transparent);}
  .pill.fail{color:var(--bad);background:var(--bad-bg);border:1px solid color-mix(in srgb,var(--bad) 30%,transparent);}
  .detail{color:var(--muted);font-size:14px;margin:10px 0 16px;max-width:70ch;} .verify{color:var(--good);font-weight:600;}
  .shot{margin:0;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--bg);}
  .chrome{display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:1px solid var(--border);background:color-mix(in srgb,var(--surface) 70%,var(--bg));}
  .chrome span{width:9px;height:9px;border-radius:50%;background:var(--border);} .chrome em{margin-left:10px;font-style:normal;font-size:11.5px;color:var(--muted);}
  .shot img{display:block;width:100%;height:auto;}
  footer{margin-top:52px;padding-top:22px;border-top:1px solid var(--border);color:var(--muted);font-size:12.5px;display:flex;flex-wrap:wrap;gap:6px 16px;} footer b{color:var(--ink);font-weight:600;}
  @media (max-width:640px){.glance{grid-template-columns:1fr}.act{grid-template-columns:40px 1fr}.num{width:30px;height:30px;font-size:13px}}
</style>
<div class="wrap">
  <header class="top">
    <div class="brand"><div class="logo">✚</div><div><div class="eyebrow">Ayphen HMS · Live UI walkthrough</div><h1>Self-booking, step by step in production</h1></div></div>
    <div class="score"><b>${pass} / ${steps.length}</b><span>steps passed</span></div>
  </header>
  <p class="lede">Both self-booking flows were driven through the deployed application in a real browser — real logins, real clicks, real slots — and each outcome was confirmed against the API. Every screen below was captured during the run. All test bookings were cancelled afterwards, so production data is untouched.</p>
  <div class="legend"><span><b>UI-driven</b> — real browser &amp; logins</span><span><b>API-verified</b> — outcomes checked server-side</span><span><b>Self-cleaning</b> — bookings cancelled after</span><span><b>Environment</b> — care-sims.vercel.app · live</span></div>
  <div class="glance">
${Object.entries(FLOWS).map(([k, f]) => `    <div class="glance-col"><h4>${esc(f.label)}</h4><ol>${(glance[k] || []).map(t => `<li>${esc(t)}</li>`).join('')}</ol></div>`).join('\n')}
  </div>
${sections}
  <footer><span><b>Run:</b> ${steps.length} steps · ${pass}/${steps.length} PASS</span><span><b>Spec:</b> ayphen-hms/e2e/walkthrough.spec.ts</span><span><b>Re-run:</b> npx playwright test walkthrough.spec.ts &amp;&amp; node build-walkthrough-gallery.mjs</span></footer>
</div>`;

writeFileSync(join(HERE, 'walkthrough-gallery.html'), html);
console.log(`walkthrough-gallery.html written — ${(html.length / 1024 / 1024).toFixed(2)} MB · ${pass}/${steps.length} PASS`);
