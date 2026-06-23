import { DecimalPipe, NgFor, NgIf, NgStyle } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ButtonComponent } from '@styleguide';

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
  //TODO: replace with non-mocked data
  acreageDetails = [
    { name: 'No Treatment', color: '#fff', acres: 342590 },
    { name: 'Burn Only', color: '#FB6F92', acres: 342590 },
    { name: 'Thinning Only', color: '#90BE6D', acres: 342590 },
    { name: 'Thin and RX Burn', color: '#2A9D8F', acres: 342590 },
  ];

  totalAcres = 756000;
  selectedAcres = 342590;

  close() {}
}

/*
  example result:

  {
  "id": 1,
  "scenario": 14,
  "created_by": 3,
  "created_at": "2026-06-01T00:00:00Z",
  "updated_at": "2026-06-01T00:05:00Z",
  "status": "SUCCESS",
  "treatment_datalayer": 482,
  "results": {
    "summary": {
      "ABOVEGROUND_TOTAL": [
        {
          "year": 2026,
          "value": 320.5,
          "baseline": 5000,
          "delta": 6.41
        }
      ],
      "AET": {
        "percentage": 25,
        "improved_acres": 1234.5,
        "total_project_area_acres": 5000,
        "improved_area_percent": 24.69
      },
      "BIOMASS_VOLUMES": {
        "merchantable_softwood_bf_ac": 1820.5,
        "merchantable_hardwood_bf_ac": 430.2,
        "merchantable_mixed_bf_ac": 95.1,
        "non_merchantable_softwood_cuft_ac": 12.4,
        "non_merchantable_hardwood_cuft_ac": 3.1,
        "non_merchantable_mixed_cuft_ac": 0.9
      }
    },
    "projects": {
      "ABOVEGROUND_TOTAL": [
        {
          "project_id": 14,
          "proj_id": null,
          "year": 2026,
          "value": 80,
          "baseline": 1000,
          "delta": 8
        }
      ],
      "AET": [
        {
          "project_id": 14,
          "improved_acres": 1234.5,
          "total_acres": 5000,
          "improved_area_percent": 24.69
        }
      ],
      "BIOMASS_VOLUMES": [
        {
          "project_id": 14,
          "proj_id": null,
          "merchantable_softwood_bf_ac": 1820.5,
          "merchantable_hardwood_bf_ac": 430.2,
          "merchantable_mixed_bf_ac": 95.1,
          "non_merchantable_softwood_cuft_ac": 12.4,
          "non_merchantable_hardwood_cuft_ac": 3.1,
          "non_merchantable_mixed_cuft_ac": 0.9
        }
      ]
    },
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
