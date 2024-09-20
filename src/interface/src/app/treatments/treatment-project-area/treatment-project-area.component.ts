import { Component } from '@angular/core';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentSummaryComponent } from '../treatment-summary/treatment-summary.component';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { PrescriptionActionsComponent } from '../prescription-actions/prescription-actions.component';
import { RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { TreatmentsTabComponent } from '../treatments-tab/treatments-tab.component';

@Component({
  selector: 'app-treatment-project-area',
  standalone: true,
  imports: [
    TreatmentMapComponent,
    TreatmentSummaryComponent,
    MatTabsModule,
    JsonPipe,
    AsyncPipe,
    PrescriptionActionsComponent,
    RouterLink,
    TreatmentsTabComponent,
  ],
  templateUrl: './treatment-project-area.component.html',
  styleUrl: './treatment-project-area.component.scss',
})
export class TreatmentProjectAreaComponent {
  constructor() {}
}
