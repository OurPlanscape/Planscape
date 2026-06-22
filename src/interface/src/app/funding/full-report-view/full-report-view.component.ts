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
import { ScenarioResult } from '@app/types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FundingReportService } from '@services/funding-report.service';
import { FilterDropdownComponent, OpacitySliderComponent } from '@styleguide';
import {
  ToggleButtonsConfig,
  ToggleTabsComponent,
} from '@styleguide/toggle-tabs/toggle-tabs.component';
import {
  FlameLengthReductionResponse,
  FlameLengthRequestParams,
  FundingReport,
  FundingReportAETSummary,
} from '@types';
import {
  BehaviorSubject,
  combineLatest,
  filter,
  finalize,
  map,
  Observable,
  shareReplay,
  Subject,
  switchMap,
  take,
  tap,
} from 'rxjs';

import { FundingReportMapComponent } from '../funding-report-map/funding-report-map.component';
import { FundingReportComponent } from '../funding-report/funding-report.component';
import { FundingMapConfigState } from '../funding-map-config-state';

interface FilterProjectFormat {
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
  providers: [FundingMapConfigState],
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
  availableProjectAreas$: Observable<FilterProjectFormat[]> =
    this.currentScenario$.pipe(
      map((scenario) => {
        if (!scenario?.origin || !scenario?.scenario_result) return [];
        return this.resultsToSelectionMenu(
          scenario.origin,
          scenario.scenario_result
        );
      }),
      shareReplay(1)
    );

  readonly filteredProjectAreas$: Observable<FilterProjectFormat[]> =
    combineLatest(this.availableProjectAreas$, this.selectedProjectAreas$).pipe(
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

  /** Latest flame-length recalculation, patched into the report locally. */
  private flameLength$ =
    new BehaviorSubject<FlameLengthReductionResponse | null>(null);

  /** Latest water-availability recalculation, patched into the report locally. */
  private water$ = new BehaviorSubject<FundingReportAETSummary | null>(null);

  /** The fetched report with any local flame-length / water recalculation applied. */
  report$ = combineLatest([
    this.fetchedReport$,
    this.flameLength$,
    this.water$,
  ]).pipe(
    map(([report, flameLength, water]) =>
      this.withWater(this.withFlameLength(report, flameLength), water)
    ),
    shareReplay(1)
  );

  updatingFlameLength = false;
  updatingWaterAvailability = false;
  /** Apply clicks; `switchMap` cancels any in-flight request when a new one arrives. */
  private flameLengthRequest$ = new Subject<FlameLengthRequestParams>();
  /** Water % entered; `switchMap` cancels any in-flight request when a new one arrives. */
  private waterRequest$ = new Subject<number>();

  tabIndex = 0;

  constructor(
    private breadcrumbService: BreadcrumbService,
    private scenarioState: ScenarioState,
    private fundingReportService: FundingReportService,
    private fundingMapConfigState: FundingMapConfigState,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initializeBreadcrumb();
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

  resultsToSelectionMenu(
    origin: string,
    results: ScenarioResult
  ): FilterProjectFormat[] {
    return results.result.features.map((featureCollection) => {
      const props = featureCollection.properties;
      return {
        id: origin === 'USER' ? props.project_id : props.treatment_rank,
        shortName: props.treatment_rank,
        name: `Project Area ${props.treatment_rank}`,
      };
    });
  }

  redirectToFunding() {
    this.router.navigate(['..'], { relativeTo: this.route });
  }

  updateFlameLength(params: FlameLengthRequestParams) {
    this.flameLengthRequest$.next(params);
  }

  updateWaterAvailability(increasePercent: number) {
    this.waterRequest$.next(increasePercent);
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
        ...report.results,
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

  /**
   * Replace the report's `AET` water summary with a recalculation, leaving the
   * other metrics untouched. Returns a new report object so change detection
   * picks it up.
   *
   * Only `summary.AET` is patched: the report always displays the whole-scenario
   * water summary (see the funding-report component's `water` getter) and never
   * breaks AET down by project area, so the per-project AET the endpoint also
   * returns is ignored.
   */
  private withWater(
    report: FundingReport | null,
    water: FundingReportAETSummary | null
  ): FundingReport | null {
    if (!report || !report.results || !water) {
      return report;
    }
    return {
      ...report,
      results: {
        ...report.results,
        summary: {
          ...report.results.summary,
          AET: water,
        },
      },
    };
  }
}
