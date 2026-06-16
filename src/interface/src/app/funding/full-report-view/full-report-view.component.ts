import { Component } from '@angular/core';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import {
  BreadCrumb,
  BreadcrumbService,
} from '@app/services/breadcrumb.service';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import {
  ToggleButtonsConfig,
  ToggleTabsComponent,
} from '@styleguide/toggle-tabs/toggle-tabs.component';
import { FilterDropdownComponent } from '@styleguide';
import { AsyncPipe, NgIf } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, shareReplay, switchMap, take, tap } from 'rxjs';
import { UntilDestroy } from '@ngneat/until-destroy';
import { ScenarioState } from '@scenario/scenario.state';
import { FundingReportService } from '@services/funding-report.service';
import { FundingReportComponent } from '../funding-report/funding-report.component';

@UntilDestroy()
@Component({
  selector: 'app-full-report-view',
  standalone: true,
  imports: [
    AsyncPipe,
    FilterDropdownComponent,
    FundingReportComponent,
    MatButtonToggleModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    NavBarComponent,
    MatTabsModule,
    NgIf,
    ToggleTabsComponent,
  ],
  templateUrl: './full-report-view.component.html',
  styleUrl: './full-report-view.component.scss',
})
export class FullReportViewComponent {
  tabButtons: ToggleButtonsConfig[] = [
    { name: 'Report', value: 'report', icon: 'analytics_outline' },
    { name: 'Data Layers', value: 'data_layers', icon: 'layers_outline' },
  ];

  // TODO: convert project area list to match this format
  outcomeViewOptions = [
    { name: 'Project Area 1', shortName: '1', id: 27372 },
    { name: 'Project Area 2', shortName: '2', id: 27373 },
    { name: 'Project Area 3', shortName: '3', id: 27374 },
  ];

  currentView: string = 'report';

  /** Project area ids selected in the dropdown; empty means all areas. */
  selectedProjectAreas: number[] = [];

  /**
   * Single (non-polling) fetch of the report. This view is only reachable for a
   * finished report, so we redirect back to the funding dashboard for any other
   * status (or a missing report). `shareReplay(1)` keeps the template binding
   * and the redirect check on one HTTP call.
   */
  report$ = this.scenarioState.currentScenarioId$.pipe(
    filter((id): id is number => id !== null),
    take(1),
    switchMap((id) => this.fundingReportService.getReport(id)),
    tap((report) => {
      if (report?.status !== 'SUCCESS') {
        this.redirectToFunding();
      }
    }),
    shareReplay(1)
  );

  constructor(
    private breadcumbService: BreadcrumbService,
    private scenarioState: ScenarioState,
    private fundingReportService: FundingReportService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    const newBreadCrumb: BreadCrumb = {
      label: 'Funding Opportunity Report',
      backUrl: '..',
      icon: 'close',
      blackText: true,
    };
    this.breadcumbService.updateBreadCrumb(newBreadCrumb);
  }

  private redirectToFunding() {
    this.router.navigate(['..'], { relativeTo: this.route });
  }

  handleToggleSelection(selection: string) {
    this.currentView = selection;
  }

  /* report tabs things */
  tabIndex = 1;
  onTabIndexChange(tabSelected: number) {}

  changeProjectAreas(selection: { id: number }[]) {
    this.selectedProjectAreas = selection.map((item) => item.id);
  }
}
