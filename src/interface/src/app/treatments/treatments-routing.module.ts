import { RouterModule, Routes } from '@angular/router';

import { TreatmentOverviewComponent } from './treatment-overview/treatment-overview.component';
import { ProjectAreaComponent } from './project-area/project-area.component';
import { NgModule } from '@angular/core';

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
        path: 'project-area/:project-area-id',
        title: 'Project area overview',
        component: ProjectAreaComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TreatmentsRoutingModule {}
