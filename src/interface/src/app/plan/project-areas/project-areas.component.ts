import { Component, Inject, Input, LOCALE_ID, OnChanges } from '@angular/core';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  NgFor,
  NgIf,
} from '@angular/common';
import {
  getColorForProjectPosition,
  parseResultsToTotals,
  PROJECT_AREA_COLUMNS,
} from '../plan-helpers';
import { PROJECT_AREA_COLORS } from '@shared';

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
  imports: [NgFor, NgIf],
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

  constructor(@Inject(LOCALE_ID) private locale: string) {}

  ngOnChanges() {
    this.calculateTotal();
  }

  private calculateTotal() {
    if (this.areas) {
      this.total = parseResultsToTotals(this.areas);
    }
  }

  /**
   * Format a project-area value using its column's display config. The same
   * config drives how {@link parseResultsToTotals} aggregates the total, so the
   * displayed format and the maths behind the total always agree.
   */
  format(value: number, key: keyof ProjectTotalReport): string {
    const column = PROJECT_AREA_COLUMNS[key];
    let formatted: string;
    switch (column.format) {
      case 'currency':
        formatted = formatCurrency(
          value,
          this.locale,
          '$',
          'USD',
          column.digitsInfo
        );
        break;
      case 'percent':
        formatted = formatPercent(value, this.locale, column.digitsInfo);
        break;
      default:
        formatted = formatNumber(value, this.locale, column.digitsInfo);
    }
    return column.suffix ? formatted + column.suffix : formatted;
  }

  getColorByPosition = getColorForProjectPosition;
}
