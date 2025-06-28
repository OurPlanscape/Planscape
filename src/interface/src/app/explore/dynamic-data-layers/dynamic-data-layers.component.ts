import {
  Component,
  ComponentRef,
  inject,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { DataLayersComponent } from '../../data-layers/data-layers/data-layers.component';
import { DataLayersRegistryService } from '../data-layers-registry';
import { DataLayersStateService } from '../../data-layers/data-layers.state.service';
import { NgIf } from '@angular/common';
import { MultiMapsStorageService } from '@services/local-storage.service';

@Component({
  selector: 'app-dynamic-data-layers',
  standalone: true,
  imports: [NgIf],
  template: ` <ng-template #outlet></ng-template>`,
})
export class DynamicDataLayersComponent implements OnInit, OnDestroy {
  @Input({ required: true }) mapId!: number;

  @ViewChild('outlet', { read: ViewContainerRef, static: true })
  outlet!: ViewContainerRef;

  private componentRef?: ComponentRef<DataLayersComponent>;

  private readonly registry = inject(DataLayersRegistryService);
  private multimapStorageService = inject(MultiMapsStorageService);
  private readonly parentInjector = inject(Injector);

  ngOnInit(): void {
    const service = this.registry.get(this.mapId);
    if (!service)
      throw new Error(`No DataLayersStateService for map ${this.mapId}`);

    const customInjector = Injector.create({
      providers: [{ provide: DataLayersStateService, useValue: service }],
      parent: this.parentInjector,
    });

    this.componentRef = this.outlet.createComponent(DataLayersComponent, {
      injector: customInjector,
    });

    // Load initial values from storage
    const storageValues = this.multimapStorageService.getItem();
    debugger;
    if (storageValues?.dataLayers?.[this.mapId] && service) {
      service.selectDataLayer(storageValues.dataLayers[this.mapId]);
    }
  }

  ngOnDestroy(): void {
    this.componentRef?.destroy();
  }
}
