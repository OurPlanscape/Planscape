import { AfterViewInit, Component, Input, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { filter } from 'rxjs/operators';
import { FrontendConstants, Plan } from 'src/app/types';

import { BackendConstants } from './../../backend-constants';

@Component({
  selector: 'app-plan-map',
  templateUrl: './plan-map.component.html',
  styleUrls: ['./plan-map.component.scss'],
})
export class PlanMapComponent implements AfterViewInit, OnDestroy {
  @Input() plan = new BehaviorSubject<Plan | null>(null);
  @Input() mapId?: string;
  /** The amount of padding in the top left corner when the map fits the plan boundaries. */
  @Input() mapPadding: L.PointTuple = [0, 0]; // [left, top]

  private readonly destroy$ = new Subject<void>();
  map!: L.Map;
  drawingLayer: L.GeoJSON | undefined;
  tileLayer: L.TileLayer | undefined;

  constructor(private router: Router) {}

  ngAfterViewInit(): void {
    if (this.map != undefined) this.map.remove();

    this.map = L.map(this.mapId ? this.mapId : 'map', {
      center: [...FrontendConstants.MAP_CENTER],
      zoom: FrontendConstants.MAP_INITIAL_ZOOM,
      minZoom: FrontendConstants.MAP_MIN_ZOOM,
      maxZoom: FrontendConstants.MAP_MAX_ZOOM,
      layers: [this.stadiaAlidadeTiles()],
      zoomControl: false,
      pmIgnore: false,
      scrollWheelZoom: false,
    });
    this.map.attributionControl.setPosition('topright');

    // Add zoom controls to bottom right corner
    const zoomControl = L.control.zoom({
      position: 'bottomright',
    });
    zoomControl.addTo(this.map);

    this.plan
      .pipe(
        takeUntil(this.destroy$),
        filter((plan) => !!plan)
      )
      .subscribe((plan) => {
        this.drawPlanningArea(plan!);
      });

    setTimeout(() => this.map.invalidateSize(), 0);
  }

  // Add planning area to map and frame it in view
  private drawPlanningArea(plan: Plan) {
    if (!plan.planningArea) return;

    if (!!this.drawingLayer) {
      this.drawingLayer.remove();
    }

    this.drawingLayer = L.geoJSON(plan.planningArea, {
      pane: 'overlayPane',
      style: {
        color: '#7b61ff',
        fillColor: '#7b61ff',
        fillOpacity: 0.2,
        weight: 3,
      },
    }).addTo(this.map);
    this.map.fitBounds(this.drawingLayer.getBounds(), {
      paddingTopLeft: this.mapPadding,
    });
  }

  /** Creates a basemap layer using the Stadia.AlidadeSmooth tiles. */
  private stadiaAlidadeTiles() {
    return L.tileLayer(
      'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noreferrer">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
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
  setCondition(filepath: string): void {
    this.tileLayer?.remove();

    if (filepath?.length === 0 || !filepath) return;

    this.tileLayer = L.tileLayer(
      BackendConstants.TILES_END_POINT + filepath + '/{z}/{x}/{y}.png',
      {
        minZoom: 7,
        maxZoom: 13,
        opacity: 0.7,
      }
    );

    this.map.addLayer(this.tileLayer);
  }

  expandMap() {
    this.router.navigate(['map']);
  }
}
