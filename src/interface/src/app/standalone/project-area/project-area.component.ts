import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { FrontendConstants } from '../../map/map.constants';
import { regionMapCenters } from '../../map/map.helper';
import { Region } from '@types';
import { stadiaAlidadeTiles } from '../../map/map.tiles';
import { JsonPipe } from '@angular/common';

const defaultStyles = {
  weight: 1,
  fillOpacity: 0.2,
  color: '#FF0000',
  fillColor: '#FF0000',
  fill: true,
};

const outlineStyles = {
  weight: 2,
  color: '#000',
  fill: false,
};

const selectedStyles = {
  fillOpacity: 0.2,
  color: '#00FF00',
  fillColor: '#00FF00',
  fill: true,
};

@Component({
  selector: 'app-project-area',
  standalone: true,
  imports: [JsonPipe],
  templateUrl: './project-area.component.html',
  styleUrl: './project-area.component.scss',
})
export class ProjectAreaComponent implements OnInit {
  map!: L.Map;
  ids: number[] = [];

  selectedStands: number[] = [];

  ngOnInit() {
    const stands = this.loadStands();
    const outline = this.loadAreaOutline();

    this.map = L.map('map', {
      center: [...regionMapCenters(Region.SIERRA_NEVADA)],
      zoom: FrontendConstants.MAP_INITIAL_ZOOM,
      minZoom: FrontendConstants.MAP_MIN_ZOOM,
      maxZoom: FrontendConstants.MAP_MAX_ZOOM,
      layers: [stadiaAlidadeTiles(), outline, stands],
      zoomControl: false,
      scrollWheelZoom: true,
      // attributionControl: this.showAttributionAndZoom,
    });

    // outline.on(
    //   'load',
    //   () => console.log(outline)
    //   //this.map.fitBounds((outline as Polyline).getBounds())
    // );
  }

  private loadStands() {
    const url =
      '/planscape-backend/tiles/treatment_plan_prescriptions/{z}/{x}/{y}?&project_area_id=2710';

    const layer = L.vectorGrid.protobuf(url, {
      vectorTileLayerStyles: {
        treatment_plan_prescriptions: defaultStyles,
      },
      interactive: true,
      pane: 'overlayPane',
      cache: true,
      getFeatureId: (f: any) => {
        const p = f.properties.id as number;
        if (!this.ids.includes(p)) {
          this.ids.push(p);
        }
        return p;
      },
    });
    // layer.on('mouseover', (thing) => console.log('mouse over', thing));
    layer.on('click', (thing) => {
      const vectorLayer = layer as unknown as typeof L.vectorGrid;
      const properties = (thing as any).layer.properties;
      const id = properties.id;
      if (this.selectedStands.includes(id)) {
        vectorLayer.resetFeatureStyle(id);
        this.selectedStands = this.selectedStands.filter(
          (standId) => standId !== id
        );
      } else {
        vectorLayer.setFeatureStyle(id, selectedStyles);
        this.selectedStands.push(id);
      }
    });
    return layer;
  }

  private loadAreaOutline() {
    const url =
      '/planscape-backend/tiles/project_area_outline/{z}/{x}/{y}?&project_area_id=2710';

    return L.vectorGrid.protobuf(url, {
      vectorTileLayerStyles: {
        project_area_outline: outlineStyles,
      },
      zIndex: 1000, // To ensure boundary is loaded in on top of any other layers
    });
  }
}
