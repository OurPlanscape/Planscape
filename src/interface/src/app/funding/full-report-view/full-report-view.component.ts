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
import {
  BehaviorSubject,
  combineLatest,
  filter,
  finalize,
  map,
  shareReplay,
  Subject,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ScenarioState } from '@scenario/scenario.state';
import { FundingReportService } from '@services/funding-report.service';
import { FundingReportComponent } from '../funding-report/funding-report.component';
import {
  FlameLengthReductionResponse,
  FlameLengthRequestParams,
  FundingReport,
} from '@types';

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
  private fetchedReport$ = this.scenarioState.currentScenarioId$.pipe(
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

  /** Latest flame-length recalculation, patched into the report locally. */
  private flameLength$ =
    new BehaviorSubject<FlameLengthReductionResponse | null>(null);

  /** The fetched report with any local flame-length recalculation applied. */
  report$ = combineLatest([this.fetchedReport$, this.flameLength$]).pipe(
    map(([report, flameLength]) => this.withFlameLength(report, flameLength)),
    shareReplay(1)
  );

  updatingFlameLength = false;
  /** Apply clicks; `switchMap` cancels any in-flight request when a new one arrives. */
  private flameLengthRequest$ = new Subject<FlameLengthRequestParams>();

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

    this.flameLengthRequest$
      .pipe(
        switchMap((params) => {
          // Set inside switchMap so a re-apply re-arms the loader *after* the
          // cancelled request's finalize has cleared it.
          this.updatingFlameLength = true;
          return this.scenarioState.currentScenarioId$.pipe(
            filter((id): id is number => id !== null),
            take(1),
            switchMap((id) =>
              this.fundingReportService.getFlameLengthReduction(id, params)
            ),
            finalize(() => (this.updatingFlameLength = false))
          );
        }),
        untilDestroyed(this)
      )
      .subscribe((flameLength) => this.flameLength$.next(flameLength));
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

  updateFlameLength(params: FlameLengthRequestParams) {
    this.flameLengthRequest$.next(params);
  }

  /**
   * Replace the report's `TOTAL_FLAME_SEVERITY` (summary and per-project) with a
   * flame-length recalculation, leaving the other metrics untouched. Returns a
   * new report object so change detection picks it up.
   */
  private withFlameLength(
    report: FundingReport | null,
    flameLength: FlameLengthReductionResponse | null
  ): FundingReport | null {
    if (!report || !report.results || !flameLength) {
      return report;
    }
    return {
      ...report,
      results: {
        summary: {
          ...report.results.summary,
          TOTAL_FLAME_SEVERITY: flameLength.summary,
        },
        projects: {
          ...report.results.projects,
          TOTAL_FLAME_SEVERITY: flameLength.projects,
        },
      },
    };
  }
}
