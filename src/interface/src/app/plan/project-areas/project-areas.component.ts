import { Component, Input } from '@angular/core';

export interface ProjectAreaReport {
  id: number;
  acres: number;
  percentTotal: number;
  estimatedCost: number;
  score: number;
}

export interface ProjectTotalReport {
  acres: number;
  percentTotal: number;
  estimatedCost: number;
}

@Component({
  selector: 'app-project-areas',
  templateUrl: './project-areas.component.html',
  styleUrls: ['./project-areas.component.scss'],
})
export class ProjectAreasComponent {
  @Input() areas!: ProjectAreaReport[];
  @Input() total!: ProjectTotalReport;
}
