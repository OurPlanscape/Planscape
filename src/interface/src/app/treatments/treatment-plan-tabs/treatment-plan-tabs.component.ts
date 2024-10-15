import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { TreatmentPlanAboutTabComponent } from '../treatment-plan-about-tab/treatment-plan-about-tab.component';
import { TreatmentSummaryComponent } from '../treatment-summary/treatment-summary.component';

@Component({
  selector: 'app-treatment-plan-tabs',
  standalone: true,
  imports: [
    MatTabsModule,
    TreatmentPlanAboutTabComponent,
    TreatmentSummaryComponent,
  ],
  templateUrl: './treatment-plan-tabs.component.html',
  styleUrl: './treatment-plan-tabs.component.scss',
})
export class TreatmentPlanTabsComponent {}
