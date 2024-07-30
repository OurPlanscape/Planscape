import {
  Component,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import {
  FilterSpecification,
  LayerSpecification,
  Map as MapLibreMap,
} from 'maplibre-gl';
import {
  StandAssigment,
  StandColors,
} from '../project-area/project-area.component';

@Component({
  selector: 'app-map-stands',
  standalone: true,
  imports: [LayerComponent, VectorSourceComponent],
  templateUrl: './map-stands.component.html',
  styleUrl: './map-stands.component.scss',
})
export class MapStandsComponent {
  @Input() projectAreaId = 0;
  @Input() maplibreMap!: MapLibreMap;

  // should this be solved here or parent?
  @Input() selectedStands: number[] = [];
  @Input() treatedStands: { id: number; assigment: StandAssigment }[] = [];

  @Output() clickOnStand = new EventEmitter();

  get mapFilter(): FilterSpecification {
    return ['in', ['get', 'id'], ['literal', this.selectedStands]];
  }

  get vectorLayerUrl() {
    return `http://localhost:4200/planscape-backend/tiles/project_area_outline,treatment_plan_prescriptions/{z}/{x}/{y}?&project_area_id=${this.projectAreaId}`;
  }

  clickOnLayer(event: any) {
    const features = this.maplibreMap.queryRenderedFeatures(event.point, {
      layers: ['stands-layer'],
    });

    const standId = features[0].properties['id'];
    this.clickOnStand.emit(standId);
  }

  get paint(): LayerSpecification['paint'] {
    return {
      'fill-outline-color': '#000',
      'fill-color': this.getFillColors() as any,
      'fill-opacity': 0.5,
    };
  }

  getFillColors() {
    const matchExpression: (string | string[] | number)[] = [];
    matchExpression.push('match');
    matchExpression.push(['get', 'id']);
    // match expression requires at least 2 definitions...
    matchExpression.push(0);
    matchExpression.push('#00a000');
    matchExpression.push(1);
    matchExpression.push('#00a000');

    this.treatedStands.forEach((stand) => {
      matchExpression.push(stand.id);
      matchExpression.push(StandColors[stand.assigment]);
    });
    matchExpression.push('#00000050');

    return matchExpression;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedStands']) {
      //redraw
    }
    // changes.prop contains the old and the new value...
  }
}
