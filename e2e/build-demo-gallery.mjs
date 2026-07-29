// Build a self-contained proof gallery from the Sims Box demo run.
// Reads shots/demo-results.json + shots/ds-*.png (from demo-simsbox.spec.ts),
// compresses each screenshot (macOS sips), embeds as base64 → demo-gallery.html.
//   node build-demo-gallery.mjs   # after: npx playwright test demo-simsbox.spec.ts
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const steps = JSON.parse(readFileSync(join(HERE, 'shots', 'demo-results.json'), 'utf8'));
const tmp = mkdtempSync(join(tmpdir(), 'demo-gallery-'));
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
function embed(png) {
  const out = join(tmp, png.replace('.png', '.jpg'));
  execFileSync('sips', ['-Z', '1100', '-s', 'format', 'jpeg', '-s', 'formatOptions', '64', join(HERE, 'shots', png), '--out', out], { stdio: 'ignore' });
  return `data:image/jpeg;base64,${readFileSync(out).toString('base64')}`;
}
const COLOR = { reception:'--sky', nurse:'--violet', doctor:'--teal', lab:'--amber', pharmacy:'--green', billing:'--rose', patient:'--indigo', admin:'--slate' };

const cards = steps.map(s => `
      <article class="act">
        <div class="rail"><span class="num" style="background:var(${COLOR[s.persona]||'--teal'})">${String(s.n).padStart(2,'0')}</span></div>
        <div class="body">
          <header class="act-head">
            <div class="meta"><span class="persona" style="color:var(${COLOR[s.persona]||'--teal'})">${esc(s.persona)}</span><h2>${esc(s.title)}</h2></div>
            <span class="pill ${s.status==='PASS'?'pass':'fail'}">${s.status}</span>
          </header>
          <p class="detail">${esc(s.detail)}</p>
          <figure class="shot"><div class="chrome"><span></span><span></span><span></span><em>care-sims.vercel.app</em></div><img loading="lazy" src="${embed(s.shot)}" alt="${esc(s.title)}"/></figure>
        </div>
      </article>`).join('\n');

const pass = steps.filter(s => s.status === 'PASS').length;
const html = `<title>Sims Box — Demo Flow Verified</title>
<style>
  :root{--bg:#f4f8f7;--surface:#fff;--ink:#0d1b19;--muted:#5b6f6c;--border:#e2ebe9;--teal:#0f766e;--accent:#14b8a6;--good:#0f9d6b;--good-bg:#e7f6ef;--bad:#dc2626;--bad-bg:#fdeceb;--sky:#0284c7;--violet:#7c3aed;--amber:#b45309;--green:#0f9d6b;--rose:#e11d48;--indigo:#4f46e5;--slate:#475569;--shadow:0 1px 2px rgba(12,40,37,.05),0 12px 30px -12px rgba(12,40,37,.18);}
  @media (prefers-color-scheme:dark){:root{--bg:#0a1211;--surface:#101b19;--ink:#e7f0ef;--muted:#8ba09d;--border:#1e2d2a;--teal:#2dd4bf;--accent:#5eead4;--good:#34d399;--good-bg:#0e2620;--bad:#f87171;--bad-bg:#2a1514;--sky:#38bdf8;--violet:#a78bfa;--amber:#fbbf24;--green:#34d399;--rose:#fb7185;--indigo:#818cf8;--slate:#94a3b8;--shadow:0 1px 2px rgba(0,0,0,.4),0 18px 40px -16px rgba(0,0,0,.6);}}
  :root[data-theme="light"]{--bg:#f4f8f7;--surface:#fff;--ink:#0d1b19;--muted:#5b6f6c;--border:#e2ebe9;--teal:#0f766e;--accent:#14b8a6;--good:#0f9d6b;--good-bg:#e7f6ef;--bad:#dc2626;--bad-bg:#fdeceb;--sky:#0284c7;--violet:#7c3aed;--amber:#b45309;--green:#0f9d6b;--rose:#e11d48;--indigo:#4f46e5;--slate:#475569;}
  :root[data-theme="dark"]{--bg:#0a1211;--surface:#101b19;--ink:#e7f0ef;--muted:#8ba09d;--border:#1e2d2a;--teal:#2dd4bf;--accent:#5eead4;--good:#34d399;--good-bg:#0e2620;--bad:#f87171;--bad-bg:#2a1514;--sky:#38bdf8;--violet:#a78bfa;--amber:#fbbf24;--green:#34d399;--rose:#fb7185;--indigo:#818cf8;--slate:#94a3b8;}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:ui-sans-serif,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.5;-webkit-font-smoothing:antialiased;}
  .wrap{max-width:940px;margin:0 auto;padding:clamp(20px,5vw,56px) clamp(16px,4vw,32px) 80px;}
  header.top{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:20px;padding-bottom:24px;border-bottom:1px solid var(--border);}
  .brand{display:flex;align-items:center;gap:12px;} .logo{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--teal),var(--accent));box-shadow:var(--shadow);font-size:19px;}
  .eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;}
  h1{font-size:clamp(22px,3.6vw,30px);margin:2px 0 0;letter-spacing:-.02em;}
  .score{display:flex;align-items:baseline;gap:10px;} .score b{font-size:34px;letter-spacing:-.03em;color:${pass===steps.length?'var(--good)':'var(--ink)'};font-variant-numeric:tabular-nums;} .score span{font-size:13px;color:var(--muted);}
  .lede{color:var(--muted);font-size:15px;max-width:66ch;margin:18px 0 4px;}
  .legend{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:12.5px;color:var(--muted);margin:14px 0 36px;} .legend b{color:var(--ink);font-weight:600;}
  .acts{display:flex;flex-direction:column;gap:26px;}
  .act{display:grid;grid-template-columns:56px 1fr;gap:6px;position:relative;}
  .rail{display:flex;flex-direction:column;align-items:center;} .num{font-variant-numeric:tabular-nums;font-weight:700;font-size:14px;color:#fff;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;box-shadow:var(--shadow);}
  .act:not(:last-child) .rail::after{content:"";flex:1;width:2px;margin-top:8px;background:linear-gradient(var(--border),transparent);}
  .body{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px 18px 20px;box-shadow:var(--shadow);min-width:0;}
  .act-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
  .persona{font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;} .act-head h2{font-size:18px;margin:3px 0 0;letter-spacing:-.01em;}
  .pill{font-size:11px;font-weight:700;letter-spacing:.06em;padding:4px 10px;border-radius:999px;white-space:nowrap;}
  .pill.pass{color:var(--good);background:var(--good-bg);border:1px solid color-mix(in srgb,var(--good) 30%,transparent);}
  .pill.fail{color:var(--bad);background:var(--bad-bg);border:1px solid color-mix(in srgb,var(--bad) 30%,transparent);}
  .detail{color:var(--muted);font-size:14px;margin:10px 0 16px;}
  .shot{margin:0;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--bg);}
  .chrome{display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:1px solid var(--border);background:color-mix(in srgb,var(--surface) 70%,var(--bg));}
  .chrome span{width:9px;height:9px;border-radius:50%;background:var(--border);} .chrome em{margin-left:10px;font-style:normal;font-size:11.5px;color:var(--muted);}
  .shot img{display:block;width:100%;height:auto;}
  footer{margin-top:52px;padding-top:22px;border-top:1px solid var(--border);color:var(--muted);font-size:12.5px;display:flex;flex-wrap:wrap;gap:6px 16px;} footer b{color:var(--ink);font-weight:600;}
  @media (max-width:560px){.act{grid-template-columns:40px 1fr}.num{width:30px;height:30px}}
</style>
<div class="wrap">
  <header class="top">
    <div class="brand"><div class="logo">✚</div><div><div class="eyebrow">Ayphen HMS · Demo flow — proof run</div><h1>Sims Box demo, verified click-by-click</h1></div></div>
    <div class="score"><b>${pass} / ${steps.length}</b><span>stations passed</span></div>
  </header>
  <p class="lede">Every station in the demo script was driven through the deployed Sims Box UI in a real browser — real logins, real clicks, real forms — and each outcome confirmed against the API/DB. These are the actual screens captured during the run.</p>
  <div class="legend"><span><b>UI-driven</b> — real browser &amp; logins</span><span><b>API-verified</b> — each outcome checked server-side</span><span><b>Org</b> — Sims Box, live on care-sims.vercel.app</span></div>
  <div class="acts">
${cards}
  </div>
  <footer><span><b>Run:</b> ${steps.length}-station demo · ${pass}/${steps.length} PASS</span><span><b>Spec:</b> ayphen-hms/e2e/demo-simsbox.spec.ts</span><span><b>Captured:</b> live against production</span></footer>
</div>`;
writeFileSync(join(HERE, 'demo-gallery.html'), html);
console.log(`demo-gallery.html written — ${(html.length/1024/1024).toFixed(2)} MB · ${pass}/${steps.length} PASS`);
