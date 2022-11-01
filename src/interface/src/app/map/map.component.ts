import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { BoundaryService } from '../boundary.service';
import { PopupService } from '../popup.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements AfterViewInit {
  private map!: L.Map;
  private boundary!: any;

  private initMap(): void {
    this.map = L.map('map', {
      center: [38.646, -120.548],
      zoom: 9,
    });
    const tiles = L.tileLayer(
      'https://api.mapbox.com/styles/v1/tsuga11/ckcng1sjp2kat1io3rv2croyl/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoidHN1Z2ExMSIsImEiOiJjanFmaTA5cGIyaXFoM3hqd3R5dzd3bzU3In0.TFqMjIIYtpcyhzNh4iMcQA',
      {
        zIndex: 0,
        tileSize: 512,
        zoomOffset: -1,
      }
    );
    tiles.addTo(this.map);
  }
  constructor(private boundaryService: BoundaryService, private popupService: PopupService) {}

  private initBoundaryLayer() {
    const boundaryLayer = L.geoJSON(this.boundary, {
      style: (feature) => ({
        weight: 3,
        opacity: 0.5,
        color: '#0000ff',
        fillOpacity: 0.2,
        fillColor: '#6DB65B',
      }),
      onEachFeature: (feature, layer) => layer.bindPopup(this.popupService.makeDetailsPopup(feature.properties.shape_name))
    });
    this.map.addLayer(boundaryLayer);
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.boundaryService.getBoundaryShapes().subscribe((boundary) => {
      this.boundary = boundary;
      this.initBoundaryLayer();
    });

  }
}
