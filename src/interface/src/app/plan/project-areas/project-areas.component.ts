import { Component, Input, OnChanges } from '@angular/core';
import {
  getColorForProjectPosition,
  parseResultsToTotals,
} from '@app/plan/plan-helpers';
import { PROJECT_AREA_COLORS } from '@shared';
import { CurrencyPipe, DecimalPipe, NgFor } from '@angular/common';

export interface ProjectAreaReport {
  rank: number;
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
  standalone: true,
  imports: [NgFor, DecimalPipe, CurrencyPipe],
  selector: 'app-project-areas',
  templateUrl: './project-areas.component.html',
  styleUrls: ['./project-areas.component.scss'],
})
export class ProjectAreasComponent implements OnChanges {
  @Input() areas!: ProjectAreaReport[];
  colors = PROJECT_AREA_COLORS;

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
      this.total = parseResultsToTotals(this.areas);
    }
  }

  getColorByPosition = getColorForProjectPosition;
}
