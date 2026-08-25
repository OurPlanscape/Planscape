import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { AsyncPipe, CommonModule, NgClass, NgIf } from '@angular/common';
import { MapNavbarComponent } from '@maplibre-map/map-nav-bar/map-nav-bar.component';
import { MapConfigState } from '@maplibre-map/map-config.state';
import { SharedModule } from '@shared';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { MultiMapConfigState } from '@maplibre-map/multi-map-config.state';
import { SyncedMapsComponent } from '@maplibre-map/synced-maps/synced-maps.component';
import { MultiMapControlComponent } from '@maplibre-map/multi-map-control/multi-map-control.component';
import { ButtonComponent, OpacitySliderComponent } from '@styleguide';
import {
  combineLatest,
  firstValueFrom,
  map,
  of,
  skip,
  switchMap,
  take,
} from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { ExploreStorageService } from '@services/local-storage.service';
import { BaseLayersComponent } from '@base-layers/base-layers/base-layers.component';
import { ExploreModesToggleComponent } from '@maplibre-map/explore-modes-toggle/explore-modes-toggle.component';
import { MapSelectorComponent } from '@explore/map-selector/map-selector.component';
import { DrawService } from '@maplibre-map/draw.service';
import { HttpClientModule } from '@angular/common/http';
import { MapConfigService } from '@maplibre-map/map-config.service';
import { PlanState } from '@plan/plan.state';
import { getPlanPath } from '@plan/plan-helpers';

import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { FrontendConstants } from '@map/map.constants';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { ActivatedRoute } from '@angular/router';
import { ScenarioState } from '@app/scenario/scenario.state';

enum SidebarTabs {
  DATA_LAYERS,
  BASE_LAYERS,
}

@UntilDestroy()
@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [
    AsyncPipe,
    ExploreModesToggleComponent,
    HttpClientModule,
    MapNavbarComponent,
    SharedModule,
    SyncedMapsComponent,
    MultiMapControlComponent,
    OpacitySliderComponent,
    NgClass,
    ButtonComponent,
    NgIf,
    MatTabsModule,
    CommonModule,
    BaseLayersComponent,
    MapSelectorComponent,
    NavBarComponent,
  ],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.scss',
  providers: [
    DrawService,
    // 1. Create a single instance of the subclass
    { provide: MapConfigState, useClass: MultiMapConfigState },

    // 2. Alias its own type to that same instance
    { provide: MultiMapConfigState, useExisting: MapConfigState },
    MapConfigService,
  ],
})
export class ExploreComponent implements OnDestroy, OnInit {
  dataLayerOpacity$ = this.multiMapConfigState.dataLayersOpacity$;
  defaultDataLayerOpacity = FrontendConstants.MAPLIBRE_MAP_DATA_LAYER_OPACITY;

  panelExpanded = true;
  tabIndex = 0;

  showSelectionToggle$ = this.planState.currentPlanId$.pipe(map((id) => !id));

  @HostListener('window:beforeunload')
  beforeUnload() {
    this.saveStateToLocalStorage();
  }

  totalAcres$ = this.drawService.totalAcres$;

  constructor(
    private breadcrumbService: BreadcrumbService,
    private exploreStorageService: ExploreStorageService,
    private multiMapConfigState: MultiMapConfigState,
    private mapConfigService: MapConfigService,
    private planState: PlanState,
    private scenarioState: ScenarioState,
    private drawService: DrawService,
    private route: ActivatedRoute
  ) {
    this.loadStateFromLocalStorage();

    // expand panel automatically when the selected map change
    // (when the user clicks on the data layer name on the map)
    this.multiMapConfigState.selectedMapId$
      .pipe(untilDestroyed(this), skip(1))
      .subscribe((id) => {
        this.panelExpanded = true;
        // if I have a selected map, go to data layer tab
        if (id) {
          this.tabIndex = SidebarTabs.DATA_LAYERS;
        }
      });

    this.mapConfigService.initialize();
  }

  ngOnInit() {
    const scenarioId = this.route.snapshot.data['scenarioId'];

    this.planState.currentPlanId$
      .pipe(
        take(1),
        switchMap((id) => {
          if (!id) {
            return of({ plan: null, scenario: null });
          }

          return combineLatest({
            plan: this.planState.currentPlan$,
            scenario: scenarioId
              ? this.scenarioState.currentScenario$
              : of(null),
          });
        })
      )
      .subscribe(({ plan, scenario }) => {
        let label = 'New Plan';
        let backUrl = '/';
        // If we have a scenarioId (from the route) AND plan and scenario
        if (scenarioId && plan && scenario) {
          label = 'Map Viewer: ' + scenario.name;
          backUrl += getPlanPath(plan.id) + `/scenario/${scenarioId}/dashboard`;
          // otherwise, just route back to the planning area
        } else if (plan) {
          label = 'Map Viewer: ' + plan.name;
          backUrl = getPlanPath(plan.id);
        }

        this.breadcrumbService.updateBreadCrumb({
          label,
          backUrl,
          blackText: true,
          icon: 'close',
        });
      });
  }

  handleOpacityChange(opacity: number) {
    this.multiMapConfigState.updateDataLayersOpacity(opacity);
  }

  togglePanelExpanded() {
    this.panelExpanded = !this.panelExpanded;
  }

  ngOnDestroy() {
    this.saveStateToLocalStorage();
  }

  private async saveStateToLocalStorage() {
    const opacity = await firstValueFrom(this.dataLayerOpacity$);
    this.exploreStorageService.setItem({
      tabIndex: this.tabIndex,
      isPanelExpanded: this.panelExpanded,
      opacity: opacity,
    });
  }

  private loadStateFromLocalStorage() {
    const options = this.exploreStorageService.getItem();
    if (options) {
      this.panelExpanded = options.isPanelExpanded || false;
      this.tabIndex = options.tabIndex || SidebarTabs.DATA_LAYERS;
      this.multiMapConfigState.updateDataLayersOpacity(
        options.opacity || FrontendConstants.MAPLIBRE_MAP_DATA_LAYER_OPACITY
      );
      this.multiMapConfigState.setAllowClickOnMap(
        this.tabIndex === SidebarTabs.DATA_LAYERS
      );
    }
  }

  onTabIndexChange(index: number) {
    // allow click on map only if viewing data layers tab
    this.multiMapConfigState.setAllowClickOnMap(
      index === SidebarTabs.DATA_LAYERS
    );
    if (index !== SidebarTabs.DATA_LAYERS) {
      this.multiMapConfigState.setSelectedMap(null);
    } else {
      this.multiMapConfigState.resetToFirstMap();
    }
  }
}
