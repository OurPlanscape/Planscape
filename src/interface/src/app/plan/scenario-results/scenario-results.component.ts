import { Component } from '@angular/core';
import {
  ProjectAreaReport,
  ProjectTotalReport,
} from '../project-areas/project-areas.component';

@Component({
  selector: 'app-scenario-results',
  templateUrl: './scenario-results.component.html',
  styleUrls: ['./scenario-results.component.scss'],
})
export class ScenarioResultsComponent {
  // TODO this data is a placeholder.
  areas: ProjectAreaReport[] = [
    { id: 1, acres: 123, percentTotal: 12, estimatedCost: '$12k', score: 12 },
    { id: 2, acres: 444, percentTotal: 2.2, estimatedCost: '$32k', score: 2 },
    {
      id: 3,
      acres: 983,
      percentTotal: 32.2,
      estimatedCost: '$432k',
      score: 32,
    },
    {
      id: 4,
      acres: 12,
      percentTotal: 12.2,
      estimatedCost: '$2k',
      score: 0.2,
    },
  ];
  total: ProjectTotalReport = {
    acres: 983,
    percentTotal: 32.2,
    estimatedCost: '$432k',
  };
}
