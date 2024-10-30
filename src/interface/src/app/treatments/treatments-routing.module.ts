import { RouterModule, Routes } from '@angular/router';
import { TreatmentOverviewComponent } from './treatment-overview/treatment-overview.component';

import { NgModule } from '@angular/core';
import { numberResolver } from '../resolvers/number.resolver';
import { TreatmentProjectAreaComponent } from './treatment-project-area/treatment-project-area.component';
import { TreatmentConfigComponent } from './treatment-config/treatment-config.component';
import { DirectImpactsComponent } from './direct-impacts/direct-impacts.component';

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
          showTreatmentStands: false,
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
          showTreatmentStands: true,
          showMapControls: true,
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
