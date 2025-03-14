import { Injectable } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { cogProtocol } from '@geomatico/maplibre-cog-protocol';

@Injectable()
export class MapConfigService {
  private initialized = false;

  initialize() {
    if (!this.initialized) {
      maplibregl.addProtocol('cog', cogProtocol);
      this.initialized = true;
    }
  }
}
