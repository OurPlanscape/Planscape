import { DecimalPipe, NgFor, NgIf, NgStyle } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ButtonComponent } from '@styleguide';
import { FundingMapConfigState } from '../funding-map-config-state';

export interface FundingLegendData { totalAcres: number; selectedAcres: number, treatmentAcres?: [{treatment: string; acres: number}] };

@Component({
  selector: 'app-funding-acreage-legend',
  standalone: true,
  imports: [
    ButtonComponent,
    DecimalPipe,
    MatIconModule,
    MatMenuModule,
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

  acreageDetails = [
    { name: 'No Treatment', color: '#fff', acres: 342590 },
    { name: 'RX Burn Only', color: '#FB6F92', acres: 342590 },
    { name: 'Thinning Only', color: '#90BE6D', acres: 342590 },
    { name: 'Thin and RX Burn', color: '#2A9D8F', acres: 342590 },
  ];



  close() {
    this.fundingMapConfig.setFundingLegendVisible(false);
  }
}
