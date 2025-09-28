import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { resetDatalayerResolver } from '../resolvers/reset-datalayer.resolver';
import { ScenarioRoutePlaceholderComponent } from './scenario-route-placeholder/scenario-route-placeholder';
import { scenarioLoaderResolver } from '../resolvers/scenario-loader.resolver';
import { ScenarioComponent } from './scenario.component';
import { ScenarioCreationComponent } from './scenario-creation/scenario-creation.component';
import { canDeactivateGuard } from '@services/can-deactivate.guard';

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
        canDeactivate: [canDeactivateGuard],
        resolve: {
          scenarioId: scenarioLoaderResolver,
          dataLayerInit: resetDatalayerResolver,
        },
      },
      {
        path: 'draft/:scenarioId', // Route for draft with scenarioId
        component: ScenarioCreationComponent, // Also route to ScenarioCreationComponent
        title: 'Draft Scenario Configuration',
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
