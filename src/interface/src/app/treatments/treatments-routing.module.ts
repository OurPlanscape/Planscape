import { RouterModule, Routes } from '@angular/router';
import { TreatmentOverviewComponent } from './treatment-overview/treatment-overview.component';

import { NgModule } from '@angular/core';
import { numberResolver } from '../resolvers/number.resolver';
import { TreatmentProjectAreaComponent } from './treatment-project-area/treatment-project-area.component';

const routes: Routes = [
  {
    path: '',
    title: 'Treatment plan overview',
    children: [
      {
        path: '',
        title: 'Treatment plan overview',
        component: TreatmentOverviewComponent,
      },
      { path: 'project-area', redirectTo: '', pathMatch: 'full' },
      {
        path: 'project-area/:projectAreaId',
        title: 'Project area overview',
        component: TreatmentProjectAreaComponent,
        resolve: {
          projectAreaId: numberResolver('projectAreaId', ''),
        },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TreatmentsRoutingModule {}
