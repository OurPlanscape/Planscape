import { Component, Input, OnChanges } from '@angular/core';
import {
  getColorForProjectPosition,
  parseResultsToTotals,
} from '../plan-helpers';
import { PROJECT_AREA_COLORS } from '@shared';
import { CurrencyPipe, DecimalPipe, NgFor, NgIf } from '@angular/common';

export interface ProjectAreaReport {
  rank: number;
  acres: number;
  estimatedCost: number;
  score: number;
  rxLeverage: number;
  percentTreatableArea: number;
}

export type ProjectTotalReport = Omit<ProjectAreaReport, 'rank' | 'score'>;

@Component({
  standalone: true,
  imports: [NgFor, DecimalPipe, CurrencyPipe, NgIf],
  selector: 'app-project-areas',
  templateUrl: './project-areas.component.html',
  styleUrls: ['./project-areas.component.scss'],
})
export class ProjectAreasComponent implements OnChanges {
  @Input() areas!: ProjectAreaReport[];
  @Input() showRxLeverage = false;

  colors = PROJECT_AREA_COLORS;

  total: ProjectTotalReport = {
    acres: 0,
    percentTreatableArea: 0,
    estimatedCost: 0,
    rxLeverage: 0,
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
