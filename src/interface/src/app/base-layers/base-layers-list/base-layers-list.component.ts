import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { BaseLayer } from '@types';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { BASE_LAYERS_DEFAULT } from '@shared';
import { BaseLayersStateService } from '../base-layers.state.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DataLayersService } from '@services';
import { MapDataDataSet } from '../../types/module.types';

@Component({
  selector: 'app-base-layers-list',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    AsyncPipe,
    MatRadioModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './base-layers-list.component.html',
  styleUrl: './base-layers-list.component.scss',
})
export class BaseLayersListComponent implements OnInit, AfterViewInit {
  @Input() dataSet!: MapDataDataSet;
  @Input() allSelectedLayersIds: number[] = [];

  @Output() layerSelected = new EventEmitter<{
    layer: BaseLayer;
    isMulti: boolean;
  }>();

  @ViewChild('listContent') listContent!: ElementRef<HTMLElement>;

  private baseLayerStateService: BaseLayersStateService = inject(
    BaseLayersStateService
  );

  private dataLayersService: DataLayersService = inject(DataLayersService);

  expanded = false;

  BASE_LAYERS_DEFAULT = BASE_LAYERS_DEFAULT;

  loadingLayers$ = this.baseLayerStateService.loadingLayers$;

  baseLayers: BaseLayer[] = [];

  ngOnInit(): void {
    console.log('TODO FIX THIS');
    // expand if any selectedLayersId on this categorized list
    // this.expanded = this.categorizedBaseLayer.layers.some((layer) =>
    //   this.allSelectedLayersIds.includes(layer.id)
    // );
  }

  ngAfterViewInit(): void {
    if (this.expanded) {
      this.scrollToSelectedItems();
    }
  }

  onLayerChange(layer: any, isMulti: boolean): void {
    if (!isMulti) {
      this.baseLayerStateService.resetSourceIds();
    }
    this.layerSelected.emit({ layer, isMulti });
  }

  isSelectedLayer(id: number): boolean {
    return this.allSelectedLayersIds.includes(id);
  }

  private scrollToSelectedItems() {
    const item = this.listContent.nativeElement.querySelector('[selected]');
    if (item) {
      item.scrollIntoView({
        behavior: 'instant',
        block: 'center',
      });
    }
  }

  expandDataSet() {
    this.expanded = !this.expanded;
    if (this.noBaseLayers) {
      this.dataLayersService
        .listBaseLayersByDataSet(this.dataSet.id)
        .subscribe((c) => (this.baseLayers = c));
    }
  }

  get noBaseLayers() {
    return this.baseLayers.length == 0;
  }
}
