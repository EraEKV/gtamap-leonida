"use client";

import dynamic from "next/dynamic";

// The whole app is browser-only (Leaflet, localStorage, Firebase Auth), so skip prerendering it.
const MapApp = dynamic(() => import("./MapApp"), {
  ssr: false,
  loading: () => (
    <div className="grid h-dvh place-items-center bg-[#0d0f1a] text-sm text-slate-400">Загружаю Леониду…</div>
  ),
});

export default function ClientApp() {
  return <MapApp />;
}
