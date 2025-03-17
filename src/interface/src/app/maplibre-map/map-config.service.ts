import { Injectable } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { cogProtocol } from '@geomatico/maplibre-cog-protocol';

@Injectable()
export class MapConfigService {
  private initialized = false;

  initialize() {
    if (!this.initialized) {
      this.addProtocols();
      this.initialized = true;
    }
  }

  private addProtocols() {
    maplibregl.addProtocol('cog', cogProtocol);
  }
}
