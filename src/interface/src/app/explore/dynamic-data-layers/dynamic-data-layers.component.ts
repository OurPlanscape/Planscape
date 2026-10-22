import {
  Component,
  ComponentRef,
  inject,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import { FavoriteDataLayersComponent } from '@data-layers/favorite-data-layers/favorite-data-layers.component';
import { DataLayersRegistryService } from '../data-layers-registry';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-dynamic-data-layers',
  standalone: true,
  imports: [NgIf],
  template: ` <ng-template #outlet></ng-template>`,
})
export class DynamicDataLayersComponent implements OnInit, OnDestroy {
  @Input({ required: true }) mapId!: number;

  //Which data layers panel to build for this map
  @Input() panel: 'browse' | 'favorites' = 'browse';
  @Input() showSelectionHeader = true;
  @Input() belowSearch?: TemplateRef<unknown>;

  @ViewChild('outlet', { read: ViewContainerRef, static: true })
  outlet!: ViewContainerRef;

  private componentRef?: ComponentRef<
    DataLayersComponent | FavoriteDataLayersComponent
  >;

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

    if (this.panel === 'favorites') {
      this.componentRef = this.outlet.createComponent(
        FavoriteDataLayersComponent,
        { injector: customInjector }
      );
      return;
    }

    this.componentRef = this.outlet.createComponent(DataLayersComponent, {
      injector: customInjector,
    });
    // only the browse panel takes these
    this.componentRef.setInput('showSelectionHeader', this.showSelectionHeader);
    this.componentRef.setInput('belowSearch', this.belowSearch);
  }

  ngOnDestroy(): void {
    this.componentRef?.destroy();
  }
}
