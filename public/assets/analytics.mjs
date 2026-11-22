// Cookie-free page views; the server derives a private visitor identifier.
function trackView() {
  if (navigator.doNotTrack === "1" || document.visibilityState === "prerender") return;
  fetch("/api/visit", {
    method: "POST", credentials: "omit", keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventId: crypto.randomUUID(), path: location.pathname + location.hash, referrer: document.referrer })
  }).catch(() => {});
}
trackView();
window.addEventListener("hashchange", trackView);
