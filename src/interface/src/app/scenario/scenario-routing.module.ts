import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ScenarioCreationComponent } from './scenario-creation/scenario-creation.component';
import { scenarioLoaderResolver } from '../resolvers/scenario-loader.resolver';
import { resetDatalayerResolver } from '../resolvers/reset-datalayer.resolver';
import { canDeactivateGuard } from '../../app/services/can-deactivate.guard';
import { ScenarioRoutePlaceholderComponent } from './scenario-route-placeholder/scenario-route-placeholder';

const routes: Routes = [
  {
    path: 'scenario',
    children: [
      {
        path: '',
        component: ScenarioCreationComponent,
        title: 'Scenario Configuration',
        data: {
          showOverview: false,
          showProjectAreas: false,
        },
        canDeactivate: [canDeactivateGuard],
        resolve: {
          scenarioId: scenarioLoaderResolver,
          dataLayerInit: resetDatalayerResolver,
        },
      },
      {
        path: ':scenarioId',
        component: ScenarioRoutePlaceholderComponent,
        title: 'Scenario Configuration',
        data: {
          showOverview: false,
          showProjectAreas: true,
        },
        resolve: {
          scenarioId: scenarioLoaderResolver,
          dataLayerInit: resetDatalayerResolver,
        },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ScenarioRoutingModule {}
