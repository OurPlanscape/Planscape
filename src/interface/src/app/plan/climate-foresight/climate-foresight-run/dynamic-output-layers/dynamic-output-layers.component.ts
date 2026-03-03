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
import { OutputLayersComponent } from '../output-layers/output-layers.component';
import { OutputLayer } from '../analysis/analysis.component';

@Component({
  selector: 'app-dynamic-output-layers',
  standalone: true,
  imports: [NgIf],
  template: ` <ng-template #outlet></ng-template>`,
})
export class DynamicOutputLayersComponent implements OnInit, OnDestroy {
  @Input({ required: true }) mapId!: number;
  @Input({ required: true }) layers!: OutputLayer[];

  @ViewChild('outlet', { read: ViewContainerRef, static: true })
  outlet!: ViewContainerRef;

  private componentRef?: ComponentRef<OutputLayersComponent>;

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

    this.componentRef = this.outlet.createComponent(OutputLayersComponent, {
      injector: customInjector,
    });

    this.componentRef.setInput('layers', this.layers);
  }

  ngOnDestroy(): void {
    this.componentRef?.destroy();
  }
}
