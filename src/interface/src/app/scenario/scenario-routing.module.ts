import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { resetDatalayerResolver } from '@resolvers/reset-datalayer.resolver';
import { scenarioLoaderResolver } from '@resolvers/scenario-loader.resolver';
import { ScenarioComponent } from './scenario.component';
import { canDeactivateGuard } from '@services/can-deactivate.guard';
import { ScenarioRoutePlaceholderComponent } from './scenario-route-placeholder/scenario-route-placeholder';
import { ScenarioDashboardComponent } from './scenario-dashboard/scenario-dashboard.component';
import { createFeatureGuard } from '@app/features/feature.guard';

const routes: Routes = [
  {
    path: '',
    component: ScenarioComponent,
    title: 'Scenario Configuration',
    resolve: {
      scenarioId: scenarioLoaderResolver,
    },
  },
  {
    path: ':scenarioId/dashboard',
    component: ScenarioDashboardComponent,
    title: 'Scenario Dashboard',
    canDeactivate: [canDeactivateGuard],
    canActivate: [createFeatureGuard({ featureName: 'SCENARIO_DASHBOARDS' })],
    resolve: {
      scenarioId: scenarioLoaderResolver,
      dataLayerInit: resetDatalayerResolver,
    },
  },
  // We need to keep this route when SCENARIO_DASHBOARDS be released since this is used for drafts creation
  {
    path: ':scenarioId',
    component: ScenarioRoutePlaceholderComponent,
    title: 'Scenario Configuration',
    canDeactivate: [canDeactivateGuard],
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
