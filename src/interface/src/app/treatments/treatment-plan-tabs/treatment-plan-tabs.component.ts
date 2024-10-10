import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { TreatmentplanAboutTabComponent } from '../treatmentplan-about-tab/treatmentplan-about-tab.component';
import { TreatmentSummaryComponent } from '../treatment-summary/treatment-summary.component';

@Component({
  selector: 'app-treatment-plan-tabs',
  standalone: true,
  imports: [
    MatTabsModule,
    TreatmentplanAboutTabComponent,
    TreatmentSummaryComponent,
  ],
  templateUrl: './treatment-plan-tabs.component.html',
  styleUrl: './treatment-plan-tabs.component.scss',
})
export class TreatmentPlanTabsComponent {}
