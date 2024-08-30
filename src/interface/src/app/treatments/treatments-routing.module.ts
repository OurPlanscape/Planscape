import { RouterModule, Routes } from '@angular/router';
import { TreatmentOverviewComponent } from './treatment-overview/treatment-overview.component';

import { NgModule } from '@angular/core';
import { numberResolver } from '../resolvers/number.resolver';
import { TreatmentProjectAreaComponent } from './treatment-project-area/treatment-project-area.component';
import { TreatmentsState } from './treatments.state';
import { SelectedStandsState } from './treatment-map/selected-stands.state';
import { TreatedStandsState } from './treatment-map/treated-stands.state';
import { treatmentStateResolver } from './treatment-state.resolver';

const routes: Routes = [
  {
    path: '',
    title: 'Treatment plan overview',
    providers: [TreatmentsState, SelectedStandsState, TreatedStandsState],
    children: [
      {
        path: '',
        title: 'Treatment plan overview',
        component: TreatmentOverviewComponent,
        resolve: {
          initializeStates: treatmentStateResolver,
        },
      },
      { path: 'project-area', redirectTo: '', pathMatch: 'full' },
      {
        path: 'project-area/:projectAreaId',
        title: 'Project area overview',
        component: TreatmentProjectAreaComponent,
        resolve: {
          projectAreaId: numberResolver('projectAreaId', ''),
          initializeStates: treatmentStateResolver,
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
