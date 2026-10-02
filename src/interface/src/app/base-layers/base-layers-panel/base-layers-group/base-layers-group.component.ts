import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';
import { DataLayerTooltipComponent } from '@data-layers/data-layer-tooltip/data-layer-tooltip.component';
import { DataLayersService } from '@services/data-layers.service';
import { MapModuleService } from '@services/map-module.service';
import { BASE_LAYERS_DEFAULT, SNACK_ERROR_CONFIG } from '@shared';
import { ButtonComponent, HighlighterDirective } from '@styleguide';
import { BaseLayer, MapDataDataSet } from '@types';
import { catchError, map, of, tap } from 'rxjs';

@Component({
  selector: 'app-base-layers-group',
  standalone: true,
  imports: [
    AsyncPipe,
    ButtonComponent,
    DataLayerTooltipComponent,
    HighlighterDirective,
    MatCheckboxModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    NgFor,
    NgIf,
  ],
  templateUrl: './base-layers-group.component.html',
  styleUrl: './base-layers-group.component.scss',
})
export class BaseLayersGroupComponent implements OnChanges, OnInit {
  @Input() dataSet!: MapDataDataSet;
  @Input() allSelectedLayersIds: number[] = [];
  @Input() initialExpanded = false;
  /** Layers to display as-is (search results) instead of fetching the dataset's layers. */
  @Input() layers: BaseLayer[] | null = null;
  @Input() searchTerm = '';

  @Output() layerSelected = new EventEmitter<{
    layer: BaseLayer;
    isMulti: boolean;
  }>();

  @ViewChild('listContent') listContent?: ElementRef<HTMLElement>;

  readonly BASE_LAYERS_DEFAULT = BASE_LAYERS_DEFAULT;

  loadingLayers$ = this.baseLayersStateService.loadingLayers$;

  expanded = false;
  baseLayers: BaseLayer[] = [];
  loaded = false;
  private fetchStarted = false;

  constructor(
    private baseLayersStateService: BaseLayersStateService,
    private dataLayersService: DataLayersService,
    private mapModuleService: MapModuleService,
    private matSnackBar: MatSnackBar
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    // only use the very first value from the parent
    if (changes['initialExpanded']?.firstChange) {
      this.expanded = this.initialExpanded;
    }
    if (changes['layers'] && this.layers) {
      this.baseLayers = sortByName(this.layers);
      this.loaded = true;
    }
  }

  ngOnInit(): void {
    if (this.expanded && !this.layers) {
      this.fetchLayers(() => this.scrollToSelectedItems());
    }
  }

  toggle() {
    this.expanded = !this.expanded;
    if (this.expanded && !this.fetchStarted && !this.layers) {
      this.fetchLayers();
    }
  }

  onLayerChange(layer: BaseLayer, isMulti: boolean): void {
    if (!isMulti) {
      this.baseLayersStateService.resetSourceIds();
    }
    this.layerSelected.emit({ layer, isMulti });
  }

  isSelectedLayer(id: number): boolean {
    return this.allSelectedLayersIds.includes(id);
  }

  private fetchLayers(afterLoad?: () => void) {
    this.loaded = false;
    this.fetchStarted = true;
    this.dataLayersService
      .listBaseLayersByDataSet(
        this.dataSet.id,
        this.mapModuleService.moduleName
      )
      .pipe(
        map((layers) => sortByName(layers)),
        tap(() => (this.loaded = true)),
        catchError(() => {
          this.loaded = true;
          // let the next expand retry
          this.fetchStarted = false;
          this.matSnackBar.open(
            `Error: Could not load layers for ${this.dataSet.name}`,
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
          return of([]);
        })
      )
      .subscribe((layers) => {
        this.baseLayers = layers;
        afterLoad?.();
      });
  }

  private scrollToSelectedItems() {
    // wait for the list to render before looking for the selected item
    setTimeout(() => {
      this.listContent?.nativeElement
        .querySelector('[selected]')
        ?.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
  }
}

function sortByName(layers: BaseLayer[]) {
  return [...layers].sort((a, b) => a.name.localeCompare(b.name));
}
