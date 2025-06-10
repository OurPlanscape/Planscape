import { Injectable } from '@angular/core';
import { DataLayersStateService } from '../data-layers/data-layers.state.service';

@Injectable({ providedIn: 'root' })
export class DataLayersRegistryService {
  private readonly instances = new Map<number, DataLayersStateService>();

  set(mapId: number, instance: DataLayersStateService) {
    console.log('set', mapId);
    this.instances.set(mapId, instance);
  }

  get(mapId: number): DataLayersStateService | undefined {
    console.log('get', mapId);
    return this.instances.get(mapId);
  }

  clear(mapId: number) {
    this.instances.delete(mapId);
  }
}
