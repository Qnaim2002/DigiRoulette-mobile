// ============================================================
// CSV PARSE WORKER
// ============================================================
// ✅ Runs entirely off the main thread. Papa Parse's own built-in `worker: true` option was
// deliberately NOT used here — it resolves its worker script via `document.currentScript`,
// which breaks once the library is bundled into a single chunk by Vite (there's no standalone
// papaparse.js file on disk for it to point the worker at). Writing a real module worker and
// importing papaparse INSIDE it sidesteps that entirely: Vite's `new Worker(new URL(...),
// { type: "module" })` syntax (see csvParseWorker.js) bundles this file as its own worker
// chunk, so the download + parse of all 7 Digimon sheets happens off the UI thread without
// any bundler-compatibility gotchas.
import Papa from 'papaparse';

self.onmessage = (event) => {
  const { url, label, requestId } = event.data;
  Papa.parse(url, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      self.postMessage({ requestId, label, ok: true, data: results.data });
    },
    error: (err) => {
      self.postMessage({ requestId, label, ok: false, error: (err && err.message) || String(err) });
    },
  });
};
