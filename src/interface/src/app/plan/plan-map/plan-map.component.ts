import {
  AfterViewInit,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import * as L from 'leaflet';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { distinctUntilChanged, map, take } from 'rxjs/operators';
import { PlanService } from 'src/app/services';
import {
  FrontendConstants,
  regionMapCenters,
  Plan,
  Region,
  regionToString,
} from 'src/app/types';

import { BackendConstants } from './../../backend-constants';
import { HttpClient, HttpParams } from '@angular/common/http';

// Needed to keep reference to legend div element to remove
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
  /** The amount of padding in the top left corner when the map fits the plan boundaries. */
  @Input() mapPadding: L.PointTuple = [0, 0]; // [left, top]
  @Input() showAttributionAndZoom: boolean = false;

  private readonly destroy$ = new Subject<void>();
  map!: L.Map;
  drawingLayer: L.GeoJSON | undefined;
  projectAreasLayer: L.GeoJSON | undefined;
  tileLayer: L.TileLayer | undefined;

  mapRef: MapRef = {
    legend: undefined,
  };

  selectedRegion$ = new BehaviorSubject<Region>(Region.SIERRA_NEVADA);
  currentScenarioId$ = this.planService.planState$.pipe(
    map(({ currentScenarioId }) => currentScenarioId),
    distinctUntilChanged(),
    takeUntil(this.destroy$)
  );

  private layer: string = '';
  private shapes: any | null = null;

  constructor(
    private planService: PlanService,
    private http: HttpClient
  ) {
    this.selectedRegion$ = this.planService.planRegion$;
  }

  ngOnInit(): void {
    this.planService.planState$
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
      scrollWheelZoom: false,
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

    if (this.plan) {
      this.drawPlanningArea(this.plan!);
    }

    setTimeout(() => this.map.invalidateSize(), 0);
  }

  // Add planning area to map and frame it in view
  private drawPlanningArea(plan: Plan, color?: string, opacity?: number) {
    if (!plan.planningArea) return;

    if (!!this.drawingLayer) {
      this.drawingLayer.remove();
    }

    this.drawingLayer = L.geoJSON(plan.planningArea, {
      pane: 'overlayPane',
      style: {
        color: color ?? '#3367D6',
        fillColor: color ?? '#3367D6',
        fillOpacity: opacity ?? 0.1,
        weight: 7,
      },
    }).addTo(this.map);
    this.map.fitBounds(this.drawingLayer.getBounds(), {
      paddingTopLeft: this.mapPadding,
    });
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

  ngOnDestroy(): void {
    this.map.remove();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Display rendered tiles for the provided condition filepath (or, if the filepath
   *  string is empty, remove rendered tiles). */
  private setCondition(filepath: string): void {
    this.tileLayer?.remove();

    if (filepath?.length === 0 || !filepath) return;

    var region = regionToString(this.planService.planRegion$.getValue());
    this.tileLayer = L.tileLayer.wms(
      BackendConstants.TILES_END_POINT + region + '/wms?',
      {
        layers: region + filepath,
        minZoom: 7,
        maxZoom: 13,
        format: 'image/png',
        transparent: true,
        opacity: 0.7,
      }
    );

    this.map.addLayer(this.tileLayer);

    // Map legend request
    var dataUnit = '';
    this.planService.planState$.pipe(take(1)).subscribe((state) => {
      if (state.legendUnits) {
        dataUnit = state.legendUnits;
      }
    });
    const legendUrl = BackendConstants.TILES_END_POINT + 'wms';
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
  private drawShapes(shapes: any): void {
    this.projectAreasLayer?.remove();

    if (!shapes) return;

    this.projectAreasLayer = L.geoJSON(shapes, {
      style: (_) => ({
        color: '#0f5acd',
        fillColor: '#0f5acd',
        fillOpacity: 0.1,
        weight: 5,
      }),
    });
    this.projectAreasLayer.addTo(this.map);
  }
}
