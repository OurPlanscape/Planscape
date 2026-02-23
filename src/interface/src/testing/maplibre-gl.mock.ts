import { Map as MapLibreMap } from 'maplibre-gl';

/**
 * Minimal stub class used to replace maplibre-gl.Map globally in test.ts.
 * Prevents WebGL context creation errors when MapService.createMap() is called.
 */
export class MapLibreMapStub {
  private _listeners: Record<string, Function[]> = {};
  on(event: string, fn: Function) {
    (this._listeners[event] ||= []).push(fn);
    return this;
  }
  off() {
    return this;
  }
  once() {
    return this;
  }
  fire() {
    return this;
  }
  remove() {}
  getContainer() {
    return document.createElement('div');
  }
  getCanvas() {
    return document.createElement('canvas');
  }
  loaded() {
    return true;
  }
  isStyleLoaded() {
    return true;
  }
  resize() {}
  addControl() {
    return this;
  }
  removeControl() {
    return this;
  }
  hasControl() {
    return false;
  }
}

/**
 * Factory that creates a Jasmine spy object for maplibre-gl's Map class.
 * Only stubs the methods that components actually call in tests.
 */
export function createMapLibreMock(): jasmine.SpyObj<MapLibreMap> {
  const mock = jasmine.createSpyObj<MapLibreMap>('Map', [
    'on',
    'off',
    'once',
    'fire',
    'getCenter',
    'getZoom',
    'getBearing',
    'getPitch',
    'getMaxZoom',
    'getMinZoom',
    'getLayer',
    'getSource',
    'addLayer',
    'removeLayer',
    'addSource',
    'removeSource',
    'setPaintProperty',
    'loaded',
    'jumpTo',
  ]);
  mock.getZoom.and.returnValue(10);
  mock.getMaxZoom.and.returnValue(22);
  mock.getMinZoom.and.returnValue(0);
  mock.getCenter.and.returnValue({ lng: 0, lat: 0 } as any);
  mock.getBearing.and.returnValue(0);
  mock.getPitch.and.returnValue(0);
  mock.loaded.and.returnValue(true);
  mock.on.and.returnValue(mock as any);
  mock.off.and.returnValue(mock as any);
  mock.once.and.returnValue(mock as any);
  return mock;
}
