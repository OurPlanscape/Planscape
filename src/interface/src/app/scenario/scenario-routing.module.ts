import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { resetDatalayerResolver } from '../resolvers/reset-datalayer.resolver';
import { ScenarioRoutePlaceholderComponent } from '../plan/scenario-route-placeholder/scenario-route-placeholder';
import { scenarioLoaderResolver } from '../resolvers/scenario-loader.resolver';
import { ScenarioComponent } from './scenario.component';
import { ScenarioCreationComponent } from './scenario-creation/scenario-creation.component';
import { canDeactivateGuard } from '@services/can-deactivate.guard';
import { createFeatureGuard } from '../features/feature.guard';

const routes: Routes = [
  {
    path: '',
    component: ScenarioComponent,
    title: 'Scenario Configuration',
    children: [
      {
        path: '',
        component: ScenarioCreationComponent,
        title: 'Scenario Configuration',
        data: {
          showOverview: false,
          showProjectAreas: false,
        },
        canActivate: [
          createFeatureGuard({
            featureName: 'SCENARIO_CONFIGURATION_STEPS',
            fallback: 'config',
          }),
        ],
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
        canActivate: [
          createFeatureGuard({
            featureName: 'SCENARIO_CONFIGURATION_STEPS',
            fallback: 'config/:scenarioId',
          }),
        ],
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
