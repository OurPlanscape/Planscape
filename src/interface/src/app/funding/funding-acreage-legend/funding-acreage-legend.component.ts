import { DecimalPipe, NgFor, NgIf, NgStyle } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ButtonComponent } from '@styleguide';
import { FundingMapConfigState } from '../funding-map-config-state';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';

export const TREATMENT_ORDER = [
  'No Treatment',
  'Rx Burn',
  'Thinning Only',
  'Thin and Rx Burn',
] as const;

// derive the order as a type, using TS magic
export type LegendTreatmentType = (typeof TREATMENT_ORDER)[number];

export interface FundingLegendData {
  /**
   * Total acreage of the planning area, straight off the report. Null when the
   * report doesn't carry it (older payloads), which hides the acreage line.
   */
  totalPlanningAreaAcres: number | null;
  selectedAcres: number;
  noTreatmentAcres: number;
  treatmentAcresTotals?: Array<{
    treatment: LegendTreatmentType;
    acres: number;
  }>;
}

@Component({
  selector: 'app-funding-acreage-legend',
  standalone: true,
  imports: [
    ButtonComponent,
    DecimalPipe,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    NgFor,
    NgIf,
    NgStyle,
  ],
  templateUrl: './funding-acreage-legend.component.html',
  styleUrl: './funding-acreage-legend.component.scss',
})
export class FundingAcreageLegendComponent {
  constructor(private fundingMapConfig: FundingMapConfigState) {}

  @Input() legendData!: FundingLegendData;

  treatmentColors: Record<LegendTreatmentType, string> = {
    'No Treatment': 'transparent',
    'Rx Burn': '#FB6F92',
    'Thinning Only': '#90BE6D',
    'Thin and Rx Burn': '#2A9D8F',
  };

  toggleTooltip(tooltip: MatTooltip, event: MouseEvent): void {
    event.stopPropagation();

    if (tooltip.disabled) {
      tooltip.disabled = false;
      tooltip.show();
    } else {
      tooltip.hide();

      // Re-disable tooltip so it doesn't instantly re-appear on hover
      setTimeout(() => {
        tooltip.disabled = true;
      }, 100);
    }
  }

  close() {
    this.fundingMapConfig.setFundingLegendVisibility(false);
  }
}
