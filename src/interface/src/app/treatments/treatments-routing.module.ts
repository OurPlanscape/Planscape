import { RouterModule, Routes } from '@angular/router';
import { TreatmentOverviewComponent } from '@app/treatments/treatment-overview/treatment-overview.component';

import { NgModule } from '@angular/core';
import { numberResolver } from '@app/resolvers/number.resolver';
import { TreatmentProjectAreaComponent } from '@app/treatments/treatment-project-area/treatment-project-area.component';
import { TreatmentConfigComponent } from '@app/treatments/treatment-config/treatment-config.component';
import { DirectImpactsComponent } from '@app/treatments/direct-impacts/direct-impacts.component';

const routes: Routes = [
  {
    path: '',
    title: 'Treatment Plan Overview',
    component: TreatmentConfigComponent,
    children: [
      {
        path: '',
        title: 'Treatment Plan Overview',
        component: TreatmentOverviewComponent,
        data: {
          showMapProjectAreas: true,
        },
      },
      { path: 'project-area', redirectTo: '', pathMatch: 'full' },
      {
        path: 'project-area/:projectAreaId',
        title: 'Project Area Overview',
        component: TreatmentProjectAreaComponent,
        resolve: {
          projectAreaId: numberResolver('projectAreaId', ''),
        },
        data: {
          showMapProjectAreas: false,
          showMapControls: true,
          standSelectionEnabled: true,
        },
      },
    ],
  },
  {
    path: 'impacts',
    title: 'Direct Treatment Impacts',
    component: DirectImpactsComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TreatmentsRoutingModule {}
