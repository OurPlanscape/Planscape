import { Data, RouterModule, Routes } from '@angular/router';
import { TreatmentOverviewComponent } from './treatment-overview/treatment-overview.component';

import { NgModule } from '@angular/core';
import { numberResolver } from '../resolvers/number.resolver';
import { TreatmentProjectAreaComponent } from './treatment-project-area/treatment-project-area.component';
import { TreatmentLayoutComponent } from './treatment-layout/treatment-layout.component';
import { DirectImpactsComponent } from './direct-impacts/direct-impacts.component';

// Possible routing params
export interface TreatmentRoutingData extends Data {
  scenarioId: number;
  treatmentId: number;
  projectAreaId?: number;
  showMapProjectAreas?: boolean;
  showTreatmentStands?: boolean;
  showMapControls?: boolean;
}

const routes: Routes = [
  {
    path: '',
    title: 'Treatment plan overview',
    component: TreatmentLayoutComponent,
    children: [
      {
        path: '',
        title: 'Treatment plan overview',
        component: TreatmentOverviewComponent,
        data: {
          showMapProjectAreas: true,
          showTreatmentStands: false,
        },
      },
      { path: 'project-area', redirectTo: '', pathMatch: 'full' },
      {
        path: 'project-area/:projectAreaId',
        title: 'Project area overview',
        component: TreatmentProjectAreaComponent,
        resolve: {
          projectAreaId: numberResolver('projectAreaId', ''),
        },
        data: {
          showMapProjectAreas: false,
          showTreatmentStands: true,
          showMapControls: true,
        },
      },
    ],
  },
  { path: 'impacts', component: DirectImpactsComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TreatmentsRoutingModule {}
