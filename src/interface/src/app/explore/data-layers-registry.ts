import { Injectable } from '@angular/core';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DataLayersRegistryService {
  private readonly instances = new Map<number, DataLayersStateService>();
  private _size$ = new BehaviorSubject(0);
  public size$ = this._size$.asObservable();

  constructor() {}

  set(mapId: number, instance: DataLayersStateService) {
    this.instances.set(mapId, instance);
    this._size$.next(this.instances.size);
  }

  get(mapId: number): DataLayersStateService | undefined {
    return this.instances.get(mapId);
  }

  clear(mapId: number) {
    this.instances.delete(mapId);
    this._size$.next(this.instances.size);
  }
}
