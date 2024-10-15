import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { TreatmentPlanAboutTabComponent } from '../treatment-plan-about-tab/treatment-plan-about-tab.component';
import { ProjectAreasTabComponent } from '../project-areas-tab/project-areas-tab.component';

@Component({
  selector: 'app-treatment-plan-tabs',
  standalone: true,
  imports: [
    MatTabsModule,
    TreatmentPlanAboutTabComponent,
    ProjectAreasTabComponent,
  ],
  templateUrl: './treatment-plan-tabs.component.html',
  styleUrl: './treatment-plan-tabs.component.scss',
})
export class TreatmentPlanTabsComponent {}
