import { chromium } from '@playwright/test';
const src = process.argv[2], out = process.argv[3];
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('file://' + src, { waitUntil: 'networkidle' });
await p.pdf({
  path: out, format: 'A4', printBackground: true,
  margin: { top: '16mm', bottom: '14mm', left: '14mm', right: '14mm' },
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: '<div style="width:100%;font-size:7pt;color:#7a8a87;font-family:Helvetica,Arial;padding:0 14mm;display:flex;justify-content:space-between;"><span>Care-SIMS — End-to-End Demo Flow</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
});
await b.close();
console.log('written:', out);
