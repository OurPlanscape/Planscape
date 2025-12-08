import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
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
export class BaseLayersListComponent implements OnChanges, AfterViewInit {
  @Input() dataSet!: MapDataDataSet;
  @Input() allSelectedLayersIds: number[] = [];
  @Input() initialExpanded = false;

  expanded = false;

  @Output() layerSelected = new EventEmitter<{
    layer: BaseLayer;
    isMulti: boolean;
  }>();

  @ViewChild('listContent') listContent!: ElementRef<HTMLElement>;

  private baseLayerStateService: BaseLayersStateService = inject(
    BaseLayersStateService
  );

  private dataLayersService: DataLayersService = inject(DataLayersService);

  BASE_LAYERS_DEFAULT = BASE_LAYERS_DEFAULT;

  loadingLayers$ = this.baseLayerStateService.loadingLayers$;

  baseLayers: BaseLayer[] = [];

  ngAfterViewInit(): void {
    if (this.expanded) {
      this.listBaseLayersByDataSet().subscribe((c) => {
        this.baseLayers = c;
        this.scrollToSelectedItems();
      });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // only use the very first value from the parent
    if (changes['initialExpanded']?.firstChange) {
      this.expanded = this.initialExpanded;
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
      this.listBaseLayersByDataSet().subscribe((c) => (this.baseLayers = c));
    }
  }

  private listBaseLayersByDataSet() {
    return this.dataLayersService.listBaseLayersByDataSet(this.dataSet.id);
  }

  get noBaseLayers() {
    return this.baseLayers.length == 0;
  }
}
