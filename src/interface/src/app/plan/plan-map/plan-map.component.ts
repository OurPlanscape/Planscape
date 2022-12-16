import { AfterViewInit, Component, Input, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { Plan } from 'src/app/types';

@Component({
  selector: 'app-plan-map',
  templateUrl: './plan-map.component.html',
  styleUrls: ['./plan-map.component.scss'],
})
export class PlanMapComponent implements AfterViewInit, OnDestroy {
  @Input() plan: Plan | undefined;

  map!: L.Map;

  constructor(private router: Router) {}

  ngAfterViewInit(): void {
    if (this.map != undefined) this.map.remove();

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

  ngOnDestroy(): void {
    this.map.remove();
  }

  expandMap() {
    this.router.navigate(['map']);
  }
}
