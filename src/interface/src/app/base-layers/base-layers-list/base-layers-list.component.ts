import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { BaseLayer, MapDataDataSet } from '@types';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { BASE_LAYERS_DEFAULT, SNACK_ERROR_CONFIG } from '@shared';
import { BaseLayersStateService } from '../base-layers.state.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DataLayersService } from '@services';
import { catchError, map, tap } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAP_MODULE_NAME } from '@services/map-module.token';
import {
  ButtonComponent,
  HighlighterDirective,
  ToggleComponent,
} from '@styleguide';
import { DataLayerTooltipComponent } from '@data-layers/data-layer-tooltip/data-layer-tooltip.component';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-base-layers-list',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    AsyncPipe,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    ButtonComponent,
    ToggleComponent,
    DataLayerTooltipComponent,
    MatMenuModule,
    HighlighterDirective,
  ],
  templateUrl: './base-layers-list.component.html',
  styleUrl: './base-layers-list.component.scss',
})
export class BaseLayersListComponent implements OnChanges, AfterViewInit {
  @Input() dataSet!: MapDataDataSet;
  @Input() allSelectedLayersIds: number[] = [];
  @Input() initialExpanded = false;
  /** Layers to display as-is (e.g. search results) instead of fetching the dataset's layers. */
  @Input() layers: BaseLayer[] | null = null;
  @Input() searchTerm = '';

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

  loaded = false;

  constructor(
    private matSnackBar: MatSnackBar,
    @Inject(MAP_MODULE_NAME) private mapModuleName: string
  ) {}

  ngAfterViewInit(): void {
    if (this.expanded && !this.layers) {
      this.listBaseLayersByDataSet()
        .pipe(map((c) => this.sortByName(c)))
        .subscribe((c) => {
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
    if (changes['layers'] && this.layers) {
      this.baseLayers = this.sortByName(this.layers);
      this.loaded = true;
    }
  }

  onLayerChange(layer: any, isMulti: boolean): void {
    if (!isMulti) {
      this.baseLayerStateService.resetSourceIds();
    }
    this.layerSelected.emit({ layer, isMulti });
  }

  onLayerToggle(layer: BaseLayer, checked: boolean): void {
    if (checked) {
      this.onLayerChange(layer, false);
    } else {
      this.baseLayerStateService.removeBaseLayer(layer);
    }
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
    if (this.noBaseLayers && !this.layers) {
      this.listBaseLayersByDataSet()
        .pipe(map((c) => this.sortByName(c)))
        .subscribe((c) => {
          this.baseLayers = c;
        });
    }
  }

  private sortByName(layers: BaseLayer[]) {
    return [...layers].sort((a, b) => a.name.localeCompare(b.name));
  }

  private listBaseLayersByDataSet() {
    this.loaded = false;
    return this.dataLayersService
      .listBaseLayersByDataSet(this.dataSet.id, this.mapModuleName)
      .pipe(
        tap((_) => (this.loaded = true)),
        catchError((e) => {
          // Setting loaded = true since the tap is only fired if the observable emits a next, if there is an error tap is not fired
          this.loaded = true;
          this.matSnackBar.open(
            `Error: Could not load layers for ${this.dataSet.name}`,
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
          return [];
        })
      );
  }

  get noBaseLayers() {
    return this.baseLayers.length == 0;
  }
}
