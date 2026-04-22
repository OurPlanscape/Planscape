import { RouterModule, Routes } from '@angular/router';
import { TreatmentOverviewComponent } from '@treatments/treatment-overview/treatment-overview.component';

import { NgModule } from '@angular/core';
import { numberResolver } from '@resolvers/number.resolver';
import { TreatmentProjectAreaComponent } from '@treatments/treatment-project-area/treatment-project-area.component';
import { TreatmentConfigComponent } from '@treatments/treatment-config/treatment-config.component';
import { DirectImpactsComponent } from '@treatments/direct-impacts/direct-impacts.component';
import { TreatmentEffectsHomeComponent } from './treatment-effects-home/treatment-effects-home.component';
import { AuthGuard } from '@app/services';
import { createFeatureGuard } from '@app/features/feature.guard';

const routes: Routes = [
  {
    path: '',
    title: 'Treatment Effects Home',
    pathMatch: 'full',
    component: TreatmentEffectsHomeComponent,
    canActivate: [
      createFeatureGuard({ featureName: 'SCENARIO_DASHBOARDS' }),
      AuthGuard,
    ],
  },
  {
    path: '',
    title: 'Treatment Plan Overview',
    component: TreatmentConfigComponent,
    children: [
      {
        path: ':treatmentId',
        title: 'Treatment Plan Overview',
        component: TreatmentOverviewComponent,
        resolve: {
          treatmentId: numberResolver('treatmentId', ''),
        },
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
