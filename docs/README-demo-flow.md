# Demo flow document

`CARE-SIMS-DEMO-FLOW.pdf` in the repo root is generated from `docs/demo-flow.html`
through Chromium's own print engine, so the PDF always matches the source.

Regenerate after editing the HTML:

```bash
cd e2e
node ./topdf.mjs ../docs/demo-flow.html ../CARE-SIMS-DEMO-FLOW.pdf
```

The page is A4 with print styles (`@page`, `page-break-inside: avoid` on each
station) so stations never split across a page boundary.

No credentials are embedded — the platform admin login is referenced as
`backend/.env` rather than written out, because this document is meant to be
handed around.
