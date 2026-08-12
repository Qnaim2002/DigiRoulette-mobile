// ============================================================
// CSV PARSE WORKER — client helper
// ============================================================
// ✅ Creates one long-lived worker (per caller) and exposes a Promise-based wrapper around it.
// Multiple in-flight requests are safe on a single worker instance: each call gets its own
// requestId, and the shared message listener routes each response back to the right caller —
// so the 7 parallel sheet fetches in loadGameData() can all share one worker without racing.
export function createCsvWorker() {
  return new Worker(new URL('./csvWorker.js', import.meta.url), { type: 'module' });
}

let _requestCounter = 0;

export function parseCsvViaWorker(worker, url, label) {
  return new Promise((resolve, reject) => {
    const requestId = ++_requestCounter;
    const handleMessage = (event) => {
      if (event.data.requestId !== requestId) return; // a response for a different in-flight request
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      if (event.data.ok) resolve(event.data.data);
      else reject(new Error(event.data.error || `Worker failed to parse ${label}`));
    };
    const handleError = (err) => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      reject(err);
    };
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage({ url, label, requestId });
  });
}
