import {
  AfterViewInit,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import * as L from 'leaflet';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { take } from 'rxjs/operators';
import {
  BaseLayerType,
  FrontendConstants,
  Plan,
  Region,
  regionToString,
} from '@types';
import { HttpClient, HttpParams } from '@angular/common/http';
import { LegacyPlanStateService } from '@services';
import { regionMapCenters } from '../../map/map.helper';
import { Feature } from 'geojson';
import { getColorForProjectPosition } from '../plan-helpers';
import polylabel from 'polylabel';
import { environment } from '../../../environments/environment';
import { MapLayerSelectDialogComponent } from '../map-layer-select-dialog/map-layer-select-dialog.component';

import { satelliteTiles, terrainTiles } from 'src/app/map/map.tiles';
import { MapLayerControlComponent } from './map-layer-control/map-layer-control-component';
import { MatDialog } from '@angular/material/dialog';
import { OpacityControlComponent } from './opacity-control/opacity-control.component';

// Needed to keep references to div elements to remove
export interface MapRef {
  legend?: HTMLElement | undefined;
}

@Component({
  selector: 'app-plan-map',
  templateUrl: './plan-map.component.html',
  styleUrls: ['./plan-map.component.scss'],
})
export class PlanMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() plan: Plan | null = null;
  @Input() mapId?: string;
  @Input() mapHeight: string = '100%';
  /** The amount of padding in the top left corner when the map fits the plan boundaries. */
  @Input() mapPadding: L.PointTuple = [0, 0]; // [left, top]
  @Input() showAttributionAndZoom: boolean = false;
  @Input() showLayerSwitcher: boolean = false;
  @Input() showOpacityControl: boolean = false;
  private readonly destroy$ = new Subject<void>();
  tooltips: L.Tooltip[] = [];

  map!: L.Map;
  drawingLayer: L.GeoJSON | undefined;
  projectAreasLayer: L.GeoJSON | undefined;
  tileLayer: L.TileLayer | undefined;

  mapRef: MapRef = {
    legend: undefined,
  };

  selectedRegion$ = new BehaviorSubject<Region>(Region.SIERRA_NEVADA);

  private layer: string = '';
  private shapes: any | null = null;
  private layerControl = new MapLayerControlComponent();
  private opacityControl = new OpacityControlComponent();
  private currentBaseLayer: BaseLayerType = BaseLayerType.Road;

  constructor(
    private LegacyPlanStateService: LegacyPlanStateService,
    private http: HttpClient,
    private dialog: MatDialog
  ) {
    this.selectedRegion$ = this.LegacyPlanStateService.planRegion$;
  }

  ngOnInit(): void {
    this.LegacyPlanStateService.planState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        if (state.mapConditionLayer !== this.layer) {
          this.layer = state.mapConditionLayer ?? '';
          this.setCondition(state.mapConditionLayer ?? '');
        }
        if (state.mapShapes !== this.shapes) {
          this.shapes = state.mapShapes;
          this.drawShapes(state.mapShapes);
        }
      });
  }

  openLayerDialog() {
    const layerPickerDialogRef = this.dialog.open(
      MapLayerSelectDialogComponent,
      {
        data: { selectedLayer: this.currentBaseLayer },
        panelClass: 'no-padding-dialog',
      }
    );
    layerPickerDialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((selected) => {
        if (selected !== undefined) {
          this.setCurrentBaseLayer(selected);
        }
      });
  }

  updateOpacity(opacity: number): void {
    // Converting opacity from 0-100 to 0-1
    const opacityValue = opacity / 100;
    // Maximum values
    const maxProjectAreaOpacity = 1;
    const maxPlanningAreaOpacity = 0.3;
    // Opacity values
    const projectAreaOpacity = Math.max(
      0,
      Math.min(opacityValue, maxProjectAreaOpacity)
    );
    const planningAreaOpacity = Math.max(
      0,
      Math.min(opacityValue, maxPlanningAreaOpacity)
    );

    if (this.drawingLayer) {
      this.drawingLayer.setStyle({
        fillOpacity: planningAreaOpacity, // Fill/background opacity
      });
    }

    if (this.projectAreasLayer) {
      this.projectAreasLayer.setStyle({
        fillOpacity: projectAreaOpacity,
      });
      this.tooltips.forEach((tooltip) => {
        tooltip.setOpacity(projectAreaOpacity);
      });
    }
  }

  ngAfterViewInit(): void {
    if (this.map != undefined) this.map.remove();
    this.map = L.map(this.mapId ? this.mapId : 'map', {
      center: [...regionMapCenters(this.selectedRegion$.getValue()!)],
      zoom: FrontendConstants.MAP_INITIAL_ZOOM,
      minZoom: FrontendConstants.MAP_MIN_ZOOM,
      maxZoom: FrontendConstants.MAP_MAX_ZOOM,
      layers: [this.stadiaAlidadeTiles()],
      zoomControl: false,
      pmIgnore: false,
      scrollWheelZoom: true,
      attributionControl: this.showAttributionAndZoom,
    });

    if (this.showAttributionAndZoom) {
      this.map.attributionControl.setPosition('topright');

      // Add zoom controls to bottom right corner
      const zoomControl = L.control.zoom({
        position: 'bottomright',
      });
      zoomControl.addTo(this.map);
    }

    if (this.showLayerSwitcher) {
      this.layerControl.layerClicked.subscribe(() => this.openLayerDialog());
      this.map.addControl(this.layerControl);
    }

    if (this.showOpacityControl) {
      this.opacityControl.opacityChanged.subscribe((opacity: number) =>
        this.updateOpacity(opacity)
      );
      this.map.addControl(this.opacityControl);
    }

    if (this.plan) {
      this.drawPlanningArea(this.plan!);
    }

    setTimeout(() => this.map.invalidateSize(), 0);
  }

  // Add planning area to map and frame it in view
  private drawPlanningArea(plan: Plan, color?: string, opacity?: number) {
    if (!plan.geometry) return;

    if (!!this.drawingLayer) {
      this.drawingLayer.remove();
    }

    this.drawingLayer = L.geoJSON(plan.geometry, {
      pane: 'overlayPane',
      style: {
        color: color ?? '#000000',
        fillColor: color ?? '#A5C8D7',
        fillOpacity: opacity ?? 0.12,
        weight: 3,
      },
    }).addTo(this.map);

    // force the map fitbounds to happen on the next tick.
    // not ideal, but fixes some issues until we refactor this component.
    setTimeout(() => {
      if (this.drawingLayer) {
        this.map.fitBounds(this.drawingLayer.getBounds(), {
          paddingTopLeft: this.mapPadding,
          animate: false,
        });
      }
    }, 10);
  }

  /** Creates a basemap layer using the Stadia.AlidadeSmooth tiles. */
  private stadiaAlidadeTiles() {
    var attributionString = '';
    if (this.showAttributionAndZoom) {
      attributionString =
        '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noreferrer">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';
    }
    return L.tileLayer(
      'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 19,
        attribution: attributionString,
      }
    );
  }

  setCurrentBaseLayer(selectedLayer: BaseLayerType) {
    this.map.eachLayer((ly) => {
      if (ly instanceof L.TileLayer) {
        this.map.removeLayer(ly);
      }
    });
    let layerTiles = terrainTiles();
    if (selectedLayer === BaseLayerType.Road) {
      layerTiles = this.stadiaAlidadeTiles();
    } else if (selectedLayer === BaseLayerType.Satellite) {
      layerTiles = satelliteTiles();
    }
    this.currentBaseLayer = selectedLayer;
    if (this.map) {
      this.map.addLayer(layerTiles);
    }

    // redraw the condition layer
    this.setCondition(this.layer);
  }

  ngOnDestroy(): void {
    this.map.remove();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Display rendered tiles for the provided condition filepath (or, if the filepath
   *  string is empty, remove rendered tiles). */
  private setCondition(filepath: string): void {
    this.tileLayer?.remove();
    this.mapRef.legend?.remove();

    if (filepath?.length === 0 || !filepath) return;

    var region = regionToString(
      this.LegacyPlanStateService.planRegion$.getValue()
    );
    this.tileLayer = L.tileLayer.wms(
      environment.tile_endpoint + region + '/wms?',
      {
        layers: region + filepath,
        minZoom: FrontendConstants.MAP_MIN_ZOOM,
        maxZoom: FrontendConstants.MAP_MAX_ZOOM,
        format: 'image/png',
        transparent: true,
        opacity: 0.7,
      }
    );
    if (this.map) {
      this.map.addLayer(this.tileLayer);
    }

    // Map legend request
    var dataUnit = '';
    this.LegacyPlanStateService.planState$.pipe(take(1)).subscribe((state) => {
      if (state.legendUnits) {
        dataUnit = state.legendUnits;
      }
    });
    const legendUrl = environment.tile_endpoint + 'wms';
    let queryParams = new HttpParams();
    queryParams = queryParams.append('request', 'GetLegendGraphic');
    queryParams = queryParams.append('layer', filepath);
    queryParams = queryParams.append('format', 'application/json');
    var legendJson = this.http.get<string>(legendUrl, { params: queryParams });
    legendJson.pipe(take(1)).subscribe((value: any) => {
      var colorMap =
        value['Legend'][0]['rules'][0]['symbolizers'][0]['Raster']['colormap'];
      this.addLegend(colorMap, dataUnit, this.map);
    });
  }

  addLegend(colormap: any, dataUnit: string | undefined, map: L.Map) {
    var entries = colormap['entries'];
    const legend = new (L.Control.extend({
      options: { position: 'topleft' },
    }))();
    const mapRef = this.mapRef;
    legend.onAdd = function (map) {
      // Remove any pre-existing legend on map
      if (mapRef && mapRef.legend) {
        L.DomUtil.remove(mapRef.legend);
      }

      const div = L.DomUtil.create('div', 'legend');
      // htmlContent of HTMLDivElement must be directly added here to add to leaflet map
      // Creating a string and then assigning to div.innerHTML to allow for class encapsulation
      // (otherwise div tags are automatically closed before they should be)
      var htmlContent = '';
      htmlContent += '<div class=parentlegend>';
      if (dataUnit && colormap['type'] == 'ramp') {
        // For legends with numerical labels make header the corresponding data units
        htmlContent += '<div><b>' + dataUnit + '</b></div>';
      } else {
        // For legends with categorical labels make header 'Legend'
        htmlContent += '<div><b>Legend</b></div>';
      }
      // Reversing order to present legend values from high to low (default is low to high)
      for (let i = entries.length - 1; i >= 0; i--) {
        var entry = entries[i];
        // Add a margin-bottom to only the last entry in the legend
        var lastChild = '';
        if (i == 0) {
          lastChild = 'style="margin-bottom: 6px;"';
        }
        if (entry['label']) {
          // Filter out 'nodata' entries
          if (entry['color'] != '#000000') {
            htmlContent +=
              '<div class="legendline" ' +
              lastChild +
              '><i style="background:' +
              entry['color'] +
              '"> &emsp; &hairsp;</i> &nbsp;<label>' +
              entry['label'] +
              '<br/></label></div>';
          } else if (lastChild != '') {
            htmlContent += '<div class="legendline"' + lastChild + '></div>';
          }
        } else {
          htmlContent +=
            '<div class="legendline" ' +
            lastChild +
            '><i style="background:' +
            entry['color'] +
            '"> &emsp; &hairsp;</i> &nbsp; <br/></div>';
        }
      }
      htmlContent += '</div>';
      div.innerHTML = htmlContent;
      // Needed to allow for scrolling on the legend
      L.DomEvent.on(div, 'mousewheel', L.DomEvent.stopPropagation);
      // Set reference to legend for later deletion
      mapRef.legend = div;
      return div;
    };

    legend.addTo(map);
  }

  /** Draw geojson shapes on the map, or erase currently drawn shapes. */
  private drawShapes(shapes: Feature[] | null): void {
    this.projectAreasLayer?.remove();

    if (!shapes) return;

    this.projectAreasLayer = L.geoJSON(shapes, {
      style: (shape) => ({
        color: '#000',
        fillColor: getColorForProjectPosition(shape?.properties.treatment_rank),
        fillOpacity: 0.4,
        weight: 1.5,
      }),
      onEachFeature: (feature, layer) => {
        if (!feature.properties.treatment_rank) {
          return;
        }
        let center: number[] = [];
        if (feature.geometry.type === 'Polygon') {
          center = polylabel(feature.geometry.coordinates, 0.0005);
          const tooltip = addTooltipAtCenter(
            feature.properties.treatment_rank?.toString(),
            center,
            this.map
          );
          this.tooltips.push(tooltip);
        } else if (feature.geometry.type === 'MultiPolygon') {
          feature.geometry.coordinates.forEach((positions) => {
            center = polylabel(positions, 0.005);
            const tooltip = addTooltipAtCenter(
              feature.properties.treatment_rank?.toString(),
              center,
              this.map
            );
            this.tooltips.push(tooltip);
          });
        }
      },
    });
    this.projectAreasLayer.addTo(this.map);
  }
}

function addTooltipAtCenter(
  content: string,
  center: number[],
  map: L.Map
): L.Tooltip {
  let tooltip = L.tooltip({
    permanent: true,
    direction: 'center',
    className: 'project-area-label',
  })
    .setLatLng([center[1], center[0]])
    .setContent(content);

  if (map) {
    tooltip.addTo(map);
  }

  return tooltip;
}
