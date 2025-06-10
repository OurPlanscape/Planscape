import {
  Component,
  ComponentFactoryResolver,
  ComponentRef,
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
import { NgIf, NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-dynamic-data-layers',
  standalone: true,
  imports: [NgIf, NgTemplateOutlet],
  template: `
    <ng-container *ngIf="componentRef">
      <ng-container [ngTemplateOutlet]="outlet"></ng-container>
    </ng-container>

    <ng-template #outlet></ng-template>
  `,
})
export class DynamicDataLayersComponent implements OnInit, OnDestroy {
  @Input({ required: true }) mapId!: number;

  componentRef?: ComponentRef<DataLayersComponent>;

  @ViewChild('outlet', { read: ViewContainerRef, static: true })
  outlet!: ViewContainerRef;

  constructor(
    private registry: DataLayersRegistryService,
    private parentInjector: Injector,
    private cfr: ComponentFactoryResolver
  ) {}

  ngOnInit() {
    const instance = this.registry.get(this.mapId);
    if (!instance) throw new Error(`No service for map ${this.mapId}`);

    const injector = Injector.create({
      providers: [{ provide: DataLayersStateService, useValue: instance }],
      parent: this.parentInjector,
    });

    const factory = this.cfr.resolveComponentFactory(DataLayersComponent);
    this.componentRef = this.outlet.createComponent(factory, 0, injector);
  }

  ngOnDestroy() {
    this.componentRef?.destroy();
  }
}
