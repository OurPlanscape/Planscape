import { DecimalPipe, NgFor, NgIf, NgStyle } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ButtonComponent } from '@styleguide';
import { FundingMapConfigState } from '../funding-map-config-state';

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
  acreageDetails = [
    { name: 'No Treatment', color: '#fff', acres: 342590 },
    { name: 'RX Burn Only', color: '#FB6F92', acres: 342590 },
    { name: 'Thinning Only', color: '#90BE6D', acres: 342590 },
    { name: 'Thin and RX Burn', color: '#2A9D8F', acres: 342590 },
  ];

  totalAcres = 756000;
  selectedAcres = 342590;

  close() {
    this.fundingMapConfig.setFundingLegendVisible(false);
  }
}

/*
  example result:

    "treatment_areas": {
      "projects": {
        "101": {
          "Rx Burn": 12.34,
          "Thin and Rx Burn": 5.67,
          "No Treatment": 2.1
        },
        "102": {
          "No Treatment": 8.45
        }
      },
      "total": {
        "Rx Burn": 12.34,
        "Thin and Rx Burn": 5.67,
        "No Treatment": 10.55
      }
    }
  }
}

*/
