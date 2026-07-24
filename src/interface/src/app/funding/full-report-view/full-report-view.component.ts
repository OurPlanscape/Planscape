import { AsyncPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ScenarioState } from '@app/scenario/scenario.state';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { ProjectArea } from '@app/types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FundingReportService } from '@services/funding-report.service';
import { FundingReport, FundingReportAETSummary } from '@types';
import {
  BehaviorSubject,
  combineLatest,
  filter,
  finalize,
  map,
  Observable,
  of,
  shareReplay,
  Subject,
  switchMap,
  take,
  tap,
} from 'rxjs';

import { FundingReportViewComponent } from '../funding-report-view/funding-report-view.component';
import { FilterProjectFormat } from '../funding-project-areas-selector/funding-project-areas-selector.component';
import { ScenarioService } from '@app/services';
import { isPlanningApproachSubUnits } from '@app/scenario/scenario-helper';

/**
 * Authed funding-report container. Fetches the report and project areas for the
 * current scenario, supports interactive water recalculation, and feeds it all
 * into the shared {@link FundingReportViewComponent}.
 */
@UntilDestroy()
@Component({
  selector: 'app-full-report-view',
  standalone: true,
  imports: [AsyncPipe, FundingReportViewComponent],
  templateUrl: './full-report-view.component.html',
  styleUrl: './full-report-view.component.scss',
})
export class FullReportViewComponent implements OnInit {
  currentScenario$ = this.scenarioState.currentScenario$;

  allAvailableProjectAreas$: Observable<ProjectArea[]> =
    this.currentScenario$.pipe(
      switchMap((scenario) => {
        if (!scenario?.id) {
          return of([]);
        }
        return this.scenarioService.getProjectAreas(scenario.id);
      }),
      shareReplay(1)
    );

  filterOptions$: Observable<FilterProjectFormat[]> = combineLatest([
    this.allAvailableProjectAreas$,
    this.currentScenario$,
  ]).pipe(
    map(([projectAreas, scenario]) => {
      if (!projectAreas.length) {
        return [];
      }

      // filter the top 10 for subunit approaches
      if (
        scenario?.planning_approach &&
        isPlanningApproachSubUnits(scenario?.planning_approach)
      ) {
        projectAreas = projectAreas.filter(
          (pa) => pa.data.treatment_rank <= 10
        );
      }

      return this.projectAreasToSelectionMenu(projectAreas);
    }),
    shareReplay(1)
  );

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

  /** Latest water-availability recalculation, patched into the report locally. */
  private water$ = new BehaviorSubject<FundingReportAETSummary | null>(null);

  /** The fetched report with any local water recalculation applied. */
  report$ = combineLatest([this.fetchedReport$, this.water$]).pipe(
    map(([report, water]) => this.applyRecalculations(report, water)),
    shareReplay(1)
  );

  updatingWaterAvailability = false;
  /** Water % entered; `switchMap` cancels any in-flight request when a new one arrives. */
  private waterRequest$ = new Subject<number>();

  constructor(
    private breadcrumbService: BreadcrumbService,
    private scenarioState: ScenarioState,
    private scenarioService: ScenarioService,
    private fundingReportService: FundingReportService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.redirectIfScenarioUnavailable();
    this.initializeBreadcrumb();
  }

  /**
   * Kick the user out to home if the scenario query fails — e.g. they don't
   * have permission to view it (the view permission lives on the planning area).
   */
  private redirectIfScenarioUnavailable(): void {
    this.scenarioState.currentScenarioResource$
      .pipe(
        filter((resource) => !!resource.error),
        take(1),
        untilDestroyed(this)
      )
      .subscribe(() => this.router.navigate(['/home']));
  }

  initializeBreadcrumb(): void {
    this.breadcrumbService.updateBreadCrumb({
      label: 'Funding Opportunity Report',
      backUrl: '..',
      icon: 'close',
      blackText: true,
    });

    // Once the scenario loads, append its name to the breadcrumb.
    this.currentScenario$.pipe(untilDestroyed(this)).subscribe((scenario) =>
      this.breadcrumbService.updateBreadCrumb({
        label: `Funding Opportunity Report: ${scenario.name}`,
        backUrl: '..',
        icon: 'close',
        blackText: true,
      })
    );

    this.waterRequest$
      .pipe(
        switchMap((increasePercent) => {
          // Set inside switchMap so a re-request re-arms the loader *after* the
          // cancelled request's finalize has cleared it.
          this.updatingWaterAvailability = true;
          return this.scenarioState.currentScenarioId$.pipe(
            filter((id): id is number => id !== null),
            take(1),
            switchMap((id) =>
              this.fundingReportService.getWaterAvailability(
                id,
                increasePercent
              )
            ),
            finalize(() => (this.updatingWaterAvailability = false))
          );
        }),
        untilDestroyed(this)
      )
      .subscribe((water) => this.water$.next(water));
  }

  projectAreasToSelectionMenu(
    projectAreas: ProjectArea[]
  ): FilterProjectFormat[] {
    return projectAreas
      .map((projectArea) => {
        const filterOption: FilterProjectFormat = {
          id: projectArea.id,
          shortName: projectArea.data.treatment_rank.toString(),
          name: `Project Area ${projectArea.data.treatment_rank}`,
        };
        return filterOption; // sort the resulting array so 'Project 10' is after 'Project 2'
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
      );
  }

  redirectToFunding() {
    this.router.navigate(['..'], { relativeTo: this.route });
  }

  updateWaterAvailability(increasePercent: number) {
    this.waterRequest$.next(increasePercent);
  }

  /**
   * Apply the locally-triggered water recalculation on top of the fetched
   * report, leaving everything else untouched. Returns a new report object so
   * change detection picks it up.
   *
   * Water patches both `summary.AET` (the whole-scenario totals) and
   * `projects.AET` (the per-project breakdown the funding-report component
   * re-aggregates over the selected project areas), keeping them in sync for the
   * new percentage.
   *
   * Flame length is no longer recalculated here: a single report run now
   * pre-calculates every interval, and the funding-report component reads the
   * selected one straight from the report.
   */
  private applyRecalculations(
    report: FundingReport | null,
    water: FundingReportAETSummary | null
  ): FundingReport | null {
    if (!report?.results) {
      return report;
    }
    const results = { ...report.results };
    if (water) {
      results.summary = { ...results.summary, AET: water };
      results.projects = {
        ...results.projects,
        AET: water.project_areas ?? [],
      };
    }
    return { ...report, results };
  }
}
