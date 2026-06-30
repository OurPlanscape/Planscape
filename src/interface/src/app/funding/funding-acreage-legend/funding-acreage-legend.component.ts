import { DecimalPipe, NgFor, NgIf, NgStyle } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ButtonComponent } from '@styleguide';
import { FundingMapConfigState } from '../funding-map-config-state';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';

export type TreatmentType =
  | 'No Treatment'
  | 'RX Burn Only'
  | 'Thinning Only'
  | 'Thin and Rx Burn';
export interface FundingLegendData {
  totalAcres: number;
  selectedAcres: number;
  treatmentAcres?: Array<{ treatment: TreatmentType; acres: number }>;
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
  //TODO: replace with non-mocked data

  @Input() legendData!: FundingLegendData;

  totalAcres = this.legendData?.totalAcres ?? 0;
  selectedAcres = this.legendData?.selectedAcres ?? 0;

  treatmentColors: Record<TreatmentType, string> = {
    'No Treatment': '#fff',
    'RX Burn Only': '#FB6F92',
    'Thinning Only': '#90BE6D',
    'Thin and Rx Burn': '#2A9D8F',
  };

  toggleTooltip(tooltip: MatTooltip, event: MouseEvent): void {
    event.stopPropagation();
    tooltip.disabled = false;
    tooltip.toggle();
  }

  close() {
    this.fundingMapConfig.setFundingLegendVisible(false);
  }
}
