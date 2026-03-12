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
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { NgIf } from '@angular/common';
import { DataLayersRegistryService } from '@app/explore/data-layers-registry';
import { ClimateLayersComponent } from '../climate-layers/climate-layers.component';
import { ResultsLayer } from '../analysis/analysis.component';

@Component({
  selector: 'app-dynamic-climate-layers',
  standalone: true,
  imports: [NgIf],
  template: ` <ng-template #outlet></ng-template>`,
})
export class DynamicClimateLayersComponent implements OnInit, OnDestroy {
  @Input({ required: true }) mapId!: number;
  @Input({ required: true }) layers!: ResultsLayer[];
  @Input() selectedLayer?: ResultsLayer;

  @ViewChild('outlet', { read: ViewContainerRef, static: true })
  outlet!: ViewContainerRef;

  private componentRef?: ComponentRef<ClimateLayersComponent>;

  private readonly registry = inject(DataLayersRegistryService);
  private readonly parentInjector = inject(Injector);

  ngOnInit(): void {
    const service = this.registry.get(this.mapId);
    if (!service)
      throw new Error(`No DataLayersStateService for map ${this.mapId}`);

    const customInjector = Injector.create({
      providers: [{ provide: DataLayersStateService, useValue: service }],
      parent: this.parentInjector,
    });

    this.componentRef = this.outlet.createComponent(ClimateLayersComponent, {
      injector: customInjector,
    });

    this.componentRef.setInput('layers', this.layers);
    // Setting the selected layer
    this.componentRef.setInput('selectedLayer', this.selectedLayer);
  }

  ngOnDestroy(): void {
    this.componentRef?.destroy();
  }
}
