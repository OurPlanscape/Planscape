import { Component, OnInit } from '@angular/core';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import {
  ToggleButtonsConfig,
  ToggleTabsComponent,
} from '@styleguide/toggle-tabs/toggle-tabs.component';
import { FilterDropdownComponent, OpacitySliderComponent } from '@styleguide';
import { AsyncPipe, NgIf } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import {
  combineLatest,
  filter,
  map,
  Observable,
  shareReplay,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { FundingReportService } from '@services/funding-report.service';
import { FundingReportComponent } from '../funding-report/funding-report.component';
import { MapSelectorComponent } from '@app/explore/map-selector/map-selector.component';
import { BaseLayersComponent } from '@app/base-layers/base-layers/base-layers.component';
import { DataLayersComponent } from '@app/data-layers/data-layers/data-layers.component';
import { FundingReportMapComponent } from '../funding-report-map/funding-report-map.component';
import { MapNavbarComponent } from '@app/maplibre-map/map-nav-bar/map-nav-bar.component';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { ScenarioState } from '@app/scenario/scenario.state';
import { ScenarioResult } from '@app/types';

interface FilterProjectFormat {
  id: number;
  name: string;
  shortName: string;
}

@Component({
  selector: 'app-full-report-view',
  standalone: true,
  imports: [
    AsyncPipe,
    BaseLayersComponent,
    DataLayersComponent,
    FilterDropdownComponent,
    FundingReportComponent,
    MapSelectorComponent,
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
  selectedProjectAreas$ = this.mapConfigState.selectedProjectAreas$;
  opacity$ = this.mapConfigState.opacity$;
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
    private breadcrumbService: BreadcrumbService,
    private scenarioState: ScenarioState,
    private fundingReportService: FundingReportService,
    private mapConfigState: MapConfigState,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initializeBreadcrumb();
  }

  handleFilterSelection(selectedAreas: FilterProjectFormat[]): void {
    const ids = selectedAreas.map((a) => a.id);
    this.mapConfigState.updateSelectedProjectAreas(ids);
  }

  handleToggleSelection(selection: string): void {
    this.currentView = selection;
  }

  handleOpacityChange(opacity: number): void {
    this.mapConfigState.setOpacity(opacity);
  }

  initializeBreadcrumb(): void {
    this.breadcrumbService.updateBreadCrumb({
      label: 'Funding Opportunity Report',
      backUrl: '..',
      icon: 'close',
      blackText: true,
    });
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

  /* data layer tabs things */
  panelExpanded = true;
  tabIndex = 1;
  onTabIndexChange(tabSelected: number) {}
}
