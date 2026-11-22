// Smooth (continuous, eased) wheel / trackpad zoom for Leaflet.
// Based on the approach of Leaflet.SmoothWheelZoom: accumulate a goal zoom from wheel deltas and
// ease towards it every animation frame, keeping the point under the cursor fixed.
/* eslint-disable @typescript-eslint/no-explicit-any */
import L from "leaflet";

export function enableSmoothWheelZoom(map: L.Map, sensitivity = 1) {
  map.scrollWheelZoom.disable();
  const m = map as any;
  const container = map.getContainer();

  let goalZoom = 0;
  let wheelPos = L.point(0, 0);
  let centerPoint = L.point(0, 0);
  let wheelStartLatLng: L.LatLng | null = null;
  let prevCenter: L.LatLng | null = null;
  let prevZoom = 0;
  let moved = false;
  let wheeling = false;
  let running = false;
  let raf = 0;
  let endTimer: ReturnType<typeof setTimeout> | undefined;

  const clampZoom = (z: number) => Math.min(map.getMaxZoom(), Math.max(map.getMinZoom(), z));

  const finish = () => {
    running = false;
    if (moved) m._moveEnd(true);
    moved = false;
  };

  const frame = () => {
    // the user dragged/zoomed some other way in between — stop fighting them
    if (prevCenter && (!map.getCenter().equals(prevCenter) || map.getZoom() !== prevZoom)) {
      finish();
      return;
    }
    let zoom = map.getZoom() + (goalZoom - map.getZoom()) * 0.3;
    zoom = Math.round(zoom * 1000) / 1000;
    if (Math.abs(goalZoom - zoom) < 0.002) zoom = goalZoom;
    const delta = wheelPos.subtract(centerPoint);
    const center =
      delta.x === 0 && delta.y === 0
        ? map.getCenter()
        : map.unproject(map.project(wheelStartLatLng!, zoom).subtract(delta), zoom);
    if (!moved) {
      m._moveStart(true, false);
      moved = true;
    }
    m._move(center, zoom);
    prevCenter = map.getCenter();
    prevZoom = map.getZoom();
    if (zoom !== goalZoom || wheeling) raf = requestAnimationFrame(frame);
    else finish(); // eased all the way to the goal: fire moveend once (tiles/markers refresh)
  };

  const end = () => {
    wheeling = false;
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!wheeling) {
      wheeling = true;
      if (!running) {
        m._stop?.();
        if (m._panAnim) m._panAnim.stop();
        running = true;
        moved = false;
        goalZoom = map.getZoom();
        prevCenter = map.getCenter();
        prevZoom = map.getZoom();
        centerPoint = map.getSize().divideBy(2);
        raf = requestAnimationFrame(frame);
      }
    }
    wheelPos = map.mouseEventToContainerPoint(e as unknown as MouseEvent);
    wheelStartLatLng = map.containerPointToLatLng(wheelPos);
    // pixel deltas from trackpads are small and frequent; line deltas from mice are big
    let dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
    dy = Math.max(-300, Math.min(300, dy));
    const k = e.ctrlKey ? 0.012 : 0.005; // ctrlKey = trackpad pinch; ~0.5 zoom level per mouse notch
    goalZoom = clampZoom(goalZoom - dy * k * sensitivity);
    clearTimeout(endTimer);
    endTimer = setTimeout(end, 180);
  };

  container.addEventListener("wheel", onWheel, { passive: false });
  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(endTimer);
    container.removeEventListener("wheel", onWheel);
  };
}
