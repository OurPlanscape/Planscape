import { Component, Input } from '@angular/core';
import { Feature, Geometry } from 'geojson';

@Component({
  selector: 'app-project-card',
  templateUrl: './project-card.component.html',
  styleUrls: ['./project-card.component.scss']
})
export class ProjectCardComponent {

  @Input() feature!: Feature<Geometry, any> | null;

}
