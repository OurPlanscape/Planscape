import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ScenarioCreationComponent } from './scenario-creation/scenario-creation.component';
import { scenarioLoaderResolver } from '../resolvers/scenario-loader.resolver';
import { resetDatalayerResolver } from '../resolvers/reset-datalayer.resolver';
import { createFeatureGuard } from '../features/feature.guard';
import { CreateScenariosComponent } from '../plan/create-scenarios/create-scenarios.component';
import { ScenarioRoutePlaceholderComponent } from '../plan/scenario-route-placeholder/scenario-route-placeholder';

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
        canActivate: [
          createFeatureGuard({
            featureName: 'SCENARIO_CONFIGURATION_STEPS',
            fallback: 'config',
          }),
        ],
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
  {
    path: 'config',
    component: CreateScenariosComponent,
    title: 'Scenario Configuration',
    data: {
      showOverview: false,
      showProjectAreas: false,
    },
    canActivate: [
      createFeatureGuard({
        featureName: 'SCENARIO_CONFIGURATION_STEPS',
        fallback: 'scenario',
        inverted: true,
      }),
    ],
    resolve: {
      scenarioId: scenarioLoaderResolver,
      dataLayerInit: resetDatalayerResolver,
    },
  },
  {
    path: 'config/:scenarioId',
    component: ScenarioRoutePlaceholderComponent,
    title: 'Scenario Configuration',
    data: {
      showOverview: false,
      showProjectAreas: true,
    },
    canActivate: [
      createFeatureGuard({
        featureName: 'SCENARIO_CONFIGURATION_STEPS',
        fallback: 'scenario/:scenarioId',
        inverted: true,
      }),
    ],
    resolve: {
      scenarioId: scenarioLoaderResolver,
      dataLayerInit: resetDatalayerResolver,
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ScenarioRoutingModule {}
