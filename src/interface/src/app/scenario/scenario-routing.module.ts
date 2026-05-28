import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { resetDatalayerResolver } from '@resolvers/reset-datalayer.resolver';
import { scenarioLoaderResolver } from '@resolvers/scenario-loader.resolver';
import { ScenarioComponent } from './scenario.component';
import { canDeactivateGuard } from '@services/can-deactivate.guard';
import { ScenarioRoutePlaceholderComponent } from './scenario-route-placeholder/scenario-route-placeholder';
import { createFeatureGuard } from '@app/features/feature.guard';
import { DashboardSwitcherComponent } from './dashboard-switcher/dashboard-switcher.component';
import { FundingDashboardComponent } from '@app/funding/funding-dashboard/funding-dashboard.component';
import { FullReportViewComponent } from '@app/funding/full-report-view/full-report-view.component';

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
    component: DashboardSwitcherComponent,
    title: 'Scenario Dashboard',
    canDeactivate: [canDeactivateGuard],
    canActivate: [createFeatureGuard({ featureName: 'SCENARIO_DASHBOARDS' })],
    resolve: {
      scenarioId: scenarioLoaderResolver,
      dataLayerInit: resetDatalayerResolver,
    },
  },
  {
    path: ':scenarioId/funding',
    component: FundingDashboardComponent,
    title: 'Funding Dashboard',
    canDeactivate: [canDeactivateGuard],
    canActivate: [createFeatureGuard({ featureName: 'FUNDING_REPORTS' })],
    resolve: {
      scenarioId: scenarioLoaderResolver,
      dataLayerInit: resetDatalayerResolver,
    },
  },
  {
    path: ':scenarioId/funding/fullview', // TODO: nested or no?
    component: FullReportViewComponent,
    title: 'Funding Report',
    canDeactivate: [canDeactivateGuard],
    canActivate: [createFeatureGuard({ featureName: 'FUNDING_REPORTS' })],
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
