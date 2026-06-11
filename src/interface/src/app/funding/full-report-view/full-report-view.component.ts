import { Component, OnInit } from '@angular/core';
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
import { FilterDropdownComponent, OpacitySliderComponent } from '@styleguide';
import { AsyncPipe, NgIf, NgForOf } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { FundingReportComponent } from '../funding-report/funding-report.component';
import { FundingReportMapComponent } from '../funding-report-map/funding-report-map.component';
import { MapNavbarComponent } from '@app/maplibre-map/map-nav-bar/map-nav-bar.component';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ScenarioState } from '@app/scenario/scenario.state';
import { Scenario, ScenarioResult } from '@app/types';

@UntilDestroy()
@Component({
  selector: 'app-full-report-view',
  standalone: true,
  imports: [
    AsyncPipe,
    FilterDropdownComponent,
    FundingReportComponent,
    FundingReportMapComponent,
    MapNavbarComponent,
    MatButtonToggleModule,
    MatIconModule,
    MatMenuModule,
    MatSelectModule,
    NavBarComponent,
    MatTabsModule,
    NgIf,
    OpacitySliderComponent,
    ToggleTabsComponent,
    NgForOf,
  ],
  templateUrl: './full-report-view.component.html',
  styleUrl: './full-report-view.component.scss',
})
export class FullReportViewComponent implements OnInit {
  tabButtons: ToggleButtonsConfig[] = [
    { name: 'Report', value: 'report', icon: 'analytics_outline' },
    { name: 'Data Layers', value: 'data_layers', icon: 'layers_outline' },
  ];

  // TODO: convert project area list to match this format
  outcomeViewOptions = [
    { id: 27014, name: 'Project Area 1', shortName: '1' },
    { id: 27015, name: 'Project Area 2', shortName: '2' },
    { id: 27016, name: 'Project Area 3', shortName: '3' },
    { id: 27017, name: 'Project Area 4', shortName: '4' },
    { id: 27018, name: 'Project Area 5', shortName: '5' },
    { id: 27019, name: 'Project Area 6', shortName: '6' },
  ];

  currentView: string = 'report';
  selectedProjectAreas: any[] = [];

  currentScenario$ = this.scenarioState.currentScenario$;

  /* TODO clean this up, omve to helper? */
  resultsToSelectionMenu(
    results: ScenarioResult
  ): { id: number; name: string; shortName: string }[] {
    console.log('what is the result?', results);

    return results.result.features.map((featureCollection) => {
      console.log('wait, theres a faeture collection?', featureCollection);
      const props = featureCollection.properties;
      return {
        id: props.proj_id,
        shortName: props.treatment_rank,
        name: `Project Area ${props.treatment_rank}`,
      };
    });
  }

  ngOnInit() {
    //  DO IT HERE INSTEAD
    this.currentScenario$
      .pipe(untilDestroyed(this))
      .subscribe((scenario: Scenario) => {
        console.log('is there a scenario?', scenario);
        if (scenario?.scenario_result) {
          console.log('results?', scenario.scenario_result);
          const areas = this.resultsToSelectionMenu(scenario.scenario_result);
          console.log('areas?', areas);
          this.outcomeViewOptions = areas;
        }
      });
  }

  constructor(
    private breadcumbService: BreadcrumbService,
    private mapConfigState: MapConfigState,
    private scenarioState: ScenarioState
  ) {
    const newBreadCrumb: BreadCrumb = {
      label: 'Funding Opportunity Report',
      backUrl: '..',
      icon: 'close',
      blackText: true,
    };
    this.breadcumbService.updateBreadCrumb(newBreadCrumb);

    this.mapConfigState.selectedProjectAreas$
      .pipe(untilDestroyed(this))
      .subscribe((selectedIds) => {
        this.setSelectedProjectAreas(selectedIds);
      });
  }

  handleFilterSelection(selectedAreas: any[]) {
    this.mapConfigState.updateSelectedProjectAreas(
      selectedAreas.map((a) => a.id)
    );
  }

  setSelectedProjectAreas(ids: number[]) {
    if (ids.length === 0) {
      this.selectedProjectAreas = [];
    }
    this.selectedProjectAreas = this.outcomeViewOptions.filter((o) => {
      return ids.includes(o.id);
    });
  }

  handleToggleSelection(selection: string) {
    this.currentView = selection;
  }

  /* map interaction -- TODO: possibly move these vars elsewhere */
  opacity$ = this.mapConfigState.opacity$;

  handleOpacityChange(opacity: number) {
    this.mapConfigState.setOpacity(opacity);
  }
}
