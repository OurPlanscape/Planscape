import { Component, Input, OnChanges } from '@angular/core';

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
export class ProjectAreasComponent implements OnChanges {
  @Input() areas!: ProjectAreaReport[];

  total: ProjectTotalReport = {
    acres: 0,
    percentTotal: 0,
    estimatedCost: 0,
  };

  ngOnChanges() {
    this.calculateTotal();
  }

  private calculateTotal() {
    if (this.areas) {
      this.total = this.parseResultsToTotals(this.areas);
    }
  }

  private parseResultsToTotals(
    areaReports: ProjectAreaReport[]
  ): ProjectTotalReport {
    return areaReports.reduce(
      (acc, value) => {
        acc.acres += value.acres;
        acc.estimatedCost += value.estimatedCost;
        acc.percentTotal += value.percentTotal;
        return acc;
      },
      {
        acres: 0,
        percentTotal: 0,
        estimatedCost: 0,
      }
    );
  }
}
