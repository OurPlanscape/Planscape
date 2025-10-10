import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatTreeModule } from '@angular/material/tree';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NestedTreeControl } from '@angular/cdk/tree';
import {
  isMapboxURL,
  transformMapboxUrl,
} from 'maplibregl-mapbox-request-transformer';

import {
  ButtonComponent,
  PanelComponent,
  SearchBarComponent,
} from '@styleguide';
import { Plan, ClimateForesightRun, DataLayer } from '@types';
import { MapConfigState } from '../../../../maplibre-map/map-config.state';
import { PlanState } from '../../../plan.state';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { PlanningAreaLayerComponent } from '../../../../maplibre-map/planning-area-layer/planning-area-layer.component';
import {
  Map as MapLibreMap,
  RequestTransformFunction,
  ResourceType,
} from 'maplibre-gl';
import {
  getBoundsFromGeometry,
  addRequestHeaders,
} from '../../../../maplibre-map/maplibre.helper';
import { AuthService, ClimateForesightService } from '@services';
import { DataLayersService } from '../../../../services/data-layers.service';
import { environment } from '../../../../../environments/environment';
import {
  buildPathTree,
  TreeNode,
} from '../../../../data-layers/data-layers/tree-node';
import { generateColorFunction } from '../../../../data-layers/utilities';
import { setColorFunction } from '@geomatico/maplibre-cog-protocol';
import { StepDirective } from '../../../../../styleguide/steps/step.component';

@Component({
  selector: 'app-data-layer-selection',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    PanelComponent,
    SearchBarComponent,
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    MatTreeModule,
    MatProgressSpinnerModule,
    MapComponent,
    PlanningAreaLayerComponent,
  ],
  providers: [
    { provide: StepDirective, useExisting: DataLayerSelectionComponent },
  ],
  templateUrl: './data-layer-selection.component.html',
  styleUrls: ['./data-layer-selection.component.scss'],
})
export class DataLayerSelectionComponent
  extends StepDirective<any>
  implements OnChanges
{
  @Input() plan: Plan | null = null;
  @Input() run: ClimateForesightRun | null = null;
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() complete = new EventEmitter<any>();

  selectedDataLayers: DataLayer[] = [];
  maxDataLayers = 10;
  previewedLayer: DataLayer | null = null;

  form = new FormGroup({
    dataLayers: new FormControl<DataLayer[]>(
      [],
      [Validators.required, Validators.minLength(1)]
    ),
  });

  isBrowserOpen = false;
  loadingLayers = false;
  treeData: TreeNode[] = [];
  filteredTreeData: TreeNode[] = [];
  treeControl = new NestedTreeControl<TreeNode>((node) => node.children);
  allDataLayers: DataLayer[] = [];
  searchTerm = '';

  mapLibreMap: MapLibreMap | null = null;
  bounds$: Observable<any>;
  baseLayerUrl$ = this.mapConfigState.baseMapUrl$.pipe(
    map((url) => {
      if (isMapboxURL(url as string)) {
        return transformMapboxUrl(
          url as string,
          'Style' as ResourceType,
          environment.mapbox_key
        ).url;
      }
      return url;
    })
  );
  maxZoom = 22;
  minZoom = 4;

  get planName(): string {
    return this.plan?.name || '';
  }

  get planAcres(): string {
    if (!this.plan?.geometry) return '';
    const acres = this.plan.area_acres;
    return acres ? `${acres.toLocaleString()} acres` : '';
  }

  get selectedCount(): number {
    return this.selectedDataLayers.length;
  }

  get canProceed(): boolean {
    return this.selectedDataLayers.length > 0;
  }

  get canSelectMore(): boolean {
    return this.selectedCount < this.maxDataLayers;
  }

  constructor(
    private mapConfigState: MapConfigState,
    private planState: PlanState,
    private authService: AuthService,
    private climateForesightService: ClimateForesightService,
    private dataLayersService: DataLayersService
  ) {
    super();
    this.bounds$ = this.planState.planningAreaGeometry$.pipe(
      map((geometry) => {
        if (!geometry) {
          return null;
        }
        const bounds = getBoundsFromGeometry(geometry);
        if (bounds?.every((coord) => isFinite(coord))) {
          return bounds;
        }
        return null;
      }),
      filter(
        (bounds): bounds is [number, number, number, number] => bounds !== null
      )
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['run'] && this.run?.input_datalayers) {
      this.loadSavedDataLayers();
    }
  }

  private loadSavedDataLayers(): void {
    if (this.run?.input_datalayers) {
      const layerIds = this.run.input_datalayers.map(
        (config) => config.datalayer
      );

      this.climateForesightService.getDataLayers().subscribe({
        next: (layers: DataLayer[]) => {
          this.selectedDataLayers = layers.filter((layer) =>
            layerIds.includes(layer.id)
          );
          this.updateFormValue();
        },
        error: (err: any) => {
          console.error('Failed to load saved data layers:', err);
        },
      });
    }
  }

  mapLoaded(map: MapLibreMap): void {
    this.mapLibreMap = map;
  }

  /**
   * Add authorization headers to map tile requests and transform Mapbox URLs
   */
  transformRequest: RequestTransformFunction = (
    url: string,
    resourceType?: ResourceType
  ) => {
    return addRequestHeaders(
      url,
      resourceType,
      this.authService.getAuthCookie()
    );
  };

  toggleBrowser(): void {
    if (!this.isBrowserOpen && this.treeData.length === 0) {
      this.loadDataLayers();
    }
    this.isBrowserOpen = !this.isBrowserOpen;
  }

  private loadDataLayers(): void {
    this.loadingLayers = true;
    this.climateForesightService.getDataLayers().subscribe({
      next: (layers: DataLayer[]) => {
        this.allDataLayers = layers;
        this.treeData = buildPathTree(layers);
        this.filteredTreeData = this.treeData;
        this.loadingLayers = false;
      },
      error: (err: any) => {
        console.error('Failed to load data layers:', err);
        this.loadingLayers = false;
      },
    });
  }

  onSearchChange(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.filterTreeData();
  }

  private filterTreeData(): void {
    if (!this.searchTerm.trim()) {
      this.filteredTreeData = this.treeData;
      return;
    }

    const searchLower = this.searchTerm.toLowerCase();
    this.filteredTreeData = this.filterTree(this.treeData, searchLower);

    // Expand all filtered nodes when searching
    if (this.searchTerm.trim()) {
      this.expandAllNodes(this.filteredTreeData);
    }
  }

  private expandAllNodes(nodes: TreeNode[]): void {
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        this.treeControl.expand(node);
        this.expandAllNodes(node.children);
      }
    });
  }

  private filterTree(nodes: TreeNode[], searchTerm: string): TreeNode[] {
    const filtered: TreeNode[] = [];

    for (const node of nodes) {
      const matchesSearch = node.name.toLowerCase().includes(searchTerm);
      const children = node.children
        ? this.filterTree(node.children, searchTerm)
        : undefined;

      if (matchesSearch || (children && children.length > 0)) {
        filtered.push({
          ...node,
          children: children && children.length > 0 ? children : node.children,
        });
      }
    }

    return filtered;
  }

  isLayerSelected(layer: DataLayer): boolean {
    return this.selectedDataLayers.some((l) => l.id === layer.id);
  }

  toggleLayerSelection(layer: DataLayer): void {
    if (this.isLayerSelected(layer)) {
      this.removeDataLayer(layer);
    } else if (this.canSelectMore) {
      this.selectedDataLayers = [...this.selectedDataLayers, layer];
      this.updateFormValue();
    }
  }

  removeDataLayer(layer: DataLayer): void {
    this.selectedDataLayers = this.selectedDataLayers.filter(
      (l) => l.id !== layer.id
    );
    if (this.previewedLayer?.id === layer.id) {
      this.previewedLayer = null;
      this.removeRasterLayer();
    }
    this.updateFormValue();
  }

  private updateFormValue(): void {
    this.form.patchValue({
      dataLayers: this.selectedDataLayers,
    });
    this.form.markAsTouched();
  }

  isLayerPreviewed(layer: DataLayer): boolean {
    return this.previewedLayer?.id === layer.id;
  }

  toggleLayerPreview(layer: DataLayer): void {
    if (this.previewedLayer?.id === layer.id) {
      this.previewedLayer = null;
      this.removeRasterLayer();
    } else {
      // Select new preview
      this.previewedLayer = layer;
      this.loadLayerPreview(layer);
    }
  }

  private loadLayerPreview(layer: DataLayer): void {
    this.dataLayersService.getPublicUrl(layer.id).subscribe({
      next: (url: string) => {
        const cogUrl = `cog://${url}`;
        const colorFn = generateColorFunction(layer.styles[0].data);
        setColorFunction(url, colorFn);
        this.addRasterLayer(cogUrl, layer);
      },
      error: (err: any) => {
        console.error('Failed to load layer preview:', err);
      },
    });
  }

  private addRasterLayer(cogUrl: string, layer: DataLayer): void {
    if (this.mapLibreMap) {
      this.removeRasterLayer();

      const tileSize = layer.info.blockxsize ?? 256;

      this.mapLibreMap.addSource('preview-raster', {
        type: 'raster',
        url: cogUrl,
        tileSize: tileSize,
        minzoom: 4,
        maxzoom: 22,
      });

      const layers = this.mapLibreMap.getStyle().layers;
      let firstSymbolId: string | undefined;
      if (layers) {
        for (const layer of layers) {
          if (layer.type === 'symbol') {
            firstSymbolId = layer.id;
            break;
          }
        }
      }

      this.mapLibreMap.addLayer(
        {
          id: 'preview-layer',
          type: 'raster',
          source: 'preview-raster',
          paint: {
            'raster-opacity': 0.7,
            'raster-resampling': 'nearest',
          },
        },
        firstSymbolId
      );
    }
  }

  private removeRasterLayer(): void {
    if (this.mapLibreMap) {
      if (this.mapLibreMap.getLayer('preview-layer')) {
        this.mapLibreMap.removeLayer('preview-layer');
      }
      if (this.mapLibreMap.getSource('preview-raster')) {
        this.mapLibreMap.removeSource('preview-raster');
      }
    }
  }

  hasChild = (_: number, node: TreeNode) =>
    !!node.children && node.children.length > 0;

  getData() {
    return {
      dataLayers: this.selectedDataLayers,
    };
  }

  saveAndContinue(): void {
    this.complete.emit(this.getData());
  }
}
