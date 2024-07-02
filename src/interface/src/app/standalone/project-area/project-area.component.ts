import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { FrontendConstants } from '../../map/map.constants';
import { regionMapCenters } from '../../map/map.helper';
import { Region } from '@types';

@Component({
  selector: 'app-project-area',
  standalone: true,
  imports: [],
  templateUrl: './project-area.component.html',
  styleUrl: './project-area.component.scss',
})
export class ProjectAreaComponent implements OnInit {
  map!: L.Map;

  ngOnInit() {
    this.map = L.map('map', {
      center: [...regionMapCenters(Region.SIERRA_NEVADA)],
      zoom: FrontendConstants.MAP_INITIAL_ZOOM,
      minZoom: FrontendConstants.MAP_MIN_ZOOM,
      maxZoom: FrontendConstants.MAP_MAX_ZOOM,
      layers: [this.stadiaAlidadeTiles()],
      zoomControl: false,
      pmIgnore: false,
      scrollWheelZoom: true,
      // attributionControl: this.showAttributionAndZoom,
    });
  }

  /** Creates a basemap layer using the Stadia.AlidadeSmooth tiles. */
  private stadiaAlidadeTiles() {
    var attributionString = '';

    return L.tileLayer(
      'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 19,
        attribution: attributionString,
      }
    );
  }
}
