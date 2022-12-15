import { AfterViewInit, Component } from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';

import { Plan, Region } from '../types';

@Component({
  selector: 'app-plan',
  templateUrl: './plan.component.html',
  styleUrls: ['./plan.component.scss'],
})
export class PlanComponent implements AfterViewInit {
  private map!: L.Map;
  private plan: Plan | null = null;

  constructor(private router: Router) {
    // TODO(leehana): Use a fake plan until we can query plans from the DB
    this.plan = {
      id: 'fake',
      name: 'fake',
      ownerId: 'fake',
      region: Region.SIERRA_NEVADA,
      planningArea: new L.Polygon([
        new L.LatLng(38.715517043571914, -120.42857302225725),
        new L.LatLng(38.47079787227401, -120.5164425608172),
        new L.LatLng(38.52668443555346, -120.11828371421737),
      ]).toGeoJSON(),
    };
  }

  ngAfterViewInit(): void {
    this.map = L.map('map', {
      center: [38.646, -120.548],
      zoom: 9,
      layers: [this.stadiaAlidadeTiles()],
      zoomControl: false,
      pmIgnore: false,
    });
    this.map.attributionControl.setPosition('topright');

    // Add planning area to map and frame it in view
    if (!!this.plan) {
      const planningArea = L.geoJSON(this.plan.planningArea, {
        pane: 'overlayPane',
        style: {
          color: '#7b61ff',
          fillColor: '#7b61ff',
          fillOpacity: 0.2,
          weight: 3,
        },
      }).addTo(this.map);
      this.map.fitBounds(planningArea.getBounds());
    }
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

  expandMap() {
    this.router.navigate(['map']);
  }
}
