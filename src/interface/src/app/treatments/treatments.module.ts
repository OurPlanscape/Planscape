import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@services';
import { NewTreatmentComponent } from './new-treatment/new-treatment.component';
import { TreatmentOverviewComponent } from './treatment-overview/treatment-overview.component';
import { ProjectAreaComponent } from './project-area/project-area.component';

const routes: Routes = [
  { path: '', redirectTo: 'treatment', pathMatch: 'full' },
  {
    path: 'treatment',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        title: 'New Treatment Plan',
        component: NewTreatmentComponent,
      },
      {
        path: ':treatment-id',
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
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TreatmentsRoutingModule {}

@NgModule({
  declarations: [],
  imports: [CommonModule, TreatmentsRoutingModule],
})
export class TreatmentsModule {}
