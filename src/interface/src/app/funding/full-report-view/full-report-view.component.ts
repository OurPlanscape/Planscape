import { AsyncPipe, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseLayersComponent } from '@app/base-layers/base-layers/base-layers.component';
import { DataLayersComponent } from '@app/data-layers/data-layers/data-layers.component';
import { MapNavbarComponent } from '@app/maplibre-map/map-nav-bar/map-nav-bar.component';
import { ScenarioState } from '@app/scenario/scenario.state';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { ProjectArea } from '@app/types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FundingReportService } from '@services/funding-report.service';
import { FilterDropdownComponent, OpacitySliderComponent } from '@styleguide';
import {
  ToggleButtonsConfig,
  ToggleTabsComponent,
} from '@styleguide/toggle-tabs/toggle-tabs.component';
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

import { FundingReportMapComponent } from '../funding-report-map/funding-report-map.component';
import { FundingReportComponent } from '../funding-report/funding-report.component';
import { FundingMapConfigState } from '../funding-map-config-state';
import { generateLegendFromReport } from '../funding-report/funding-report.helper';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { ScenarioService } from '@app/services';
import { isPlanningApproachSubUnits } from '@app/scenario/scenario-helper';

export interface FilterProjectFormat {
  id: number;
  name: string;
  shortName: string;
}

@UntilDestroy()
@Component({
  selector: 'app-full-report-view',
  standalone: true,
  imports: [
    AsyncPipe,
    BaseLayersComponent,
    DataLayersComponent,
    FilterDropdownComponent,
    FundingReportComponent,
    NgIf,
    MatButtonToggleModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTabsModule,
    FilterDropdownComponent,
    FundingReportComponent,
    FundingReportMapComponent,
    MapNavbarComponent,
    NavBarComponent,
    OpacitySliderComponent,
    ToggleTabsComponent,
  ],
  providers: [
    FundingMapConfigState,
    { provide: MapConfigState, useExisting: FundingMapConfigState },
  ],
  templateUrl: './full-report-view.component.html',
  styleUrl: './full-report-view.component.scss',
})
export class FullReportViewComponent implements OnInit {
  tabButtons: ToggleButtonsConfig[] = [
    { name: 'Report', value: 'report', icon: 'analytics_outline' },
    { name: 'Data Layers', value: 'data_layers', icon: 'layers_outline' },
  ];
  currentView: string = 'report';

  currentScenario$ = this.scenarioState.currentScenario$;
  selectedProjectAreas$ = this.fundingMapConfigState.selectedProjectAreas$;
  opacity$ = this.fundingMapConfigState.opacity$;

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

  readonly filteredProjectAreas$: Observable<FilterProjectFormat[]> =
    combineLatest(this.filterOptions$, this.selectedProjectAreas$).pipe(
      map(([available, selectedIds]) => {
        if (!selectedIds?.length) return [];
        return available.filter((area) => selectedIds.includes(area.id));
      })
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

  /** Id of the report's treatment datalayer to display on the map. */
  treatmentDataLayerId$ = this.report$.pipe(
    map((report) => report?.treatment_datalayer ?? null)
  );

  updatingWaterAvailability = false;
  /** Water % entered; `switchMap` cancels any in-flight request when a new one arrives. */
  private waterRequest$ = new Subject<number>();

  tabIndex = 0;

  constructor(
    private breadcrumbService: BreadcrumbService,
    private scenarioState: ScenarioState,
    private scenarioService: ScenarioService,
    private fundingReportService: FundingReportService,
    private fundingMapConfigState: FundingMapConfigState,
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

  handleFilterSelection(selectedAreas: FilterProjectFormat[]): void {
    const ids = selectedAreas.map((a) => a.id);
    this.fundingMapConfigState.updateSelectedProjectAreas(ids);
  }

  handleToggleSelection(selection: string): void {
    this.currentView = selection;
  }

  handleOpacityChange(opacity: number): void {
    this.fundingMapConfigState.setOpacity(opacity);
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

  legendData$ = combineLatest([
    this.fetchedReport$,
    this.selectedProjectAreas$,
    this.allAvailableProjectAreas$,
  ]).pipe(
    map(([report, areas, projAreas]) =>
      generateLegendFromReport(report?.results ?? null, areas, projAreas)
    ),
    shareReplay(1)
  );
}
