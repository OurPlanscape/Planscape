import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { TreatmentPlanNotesComponent } from '../treatment-plan-notes/treatment-plan-notes.component';
import { ProjectAreasTabComponent } from '../project-areas-tab/project-areas-tab.component';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';

@Component({
  selector: 'app-treatment-plan-tabs',
  standalone: true,
  imports: [
    MatTabsModule,
    TreatmentPlanNotesComponent,
    ProjectAreasTabComponent,
    MapBaseLayerComponent,
  ],
  templateUrl: './treatment-plan-tabs.component.html',
  styleUrl: './treatment-plan-tabs.component.scss',
})
export class TreatmentPlanTabsComponent {}
