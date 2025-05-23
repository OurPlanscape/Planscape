export class DummyMaplibreMap {
  listeners: Record<string, Function[]> = {};

  getCenter() {
    return { lng: 0, lat: 1 };
  }

  getZoom() {
    return 2;
  }

  getBearing() {
    return 3;
  }

  getPitch() {
    return 4;
  }

  jumpTo() {}

  on(event: string, fn: Function) {
    (this.listeners[event] ||= []).push(fn);
  }

  off(event: string, fn: Function) {
    this.listeners[event] = (this.listeners[event] || []).filter(
      (f) => f !== fn
    );
  }
}
