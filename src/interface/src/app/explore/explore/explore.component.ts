import { Component, HostListener, OnDestroy } from '@angular/core';
import { AsyncPipe, CommonModule, NgClass, NgIf } from '@angular/common';
import { MapNavbarComponent } from '../../maplibre-map/map-nav-bar/map-nav-bar.component';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { SharedModule } from '@shared';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { MultiMapConfigState } from '../../maplibre-map/multi-map-config.state';
import { SyncedMapsComponent } from '../../maplibre-map/synced-maps/synced-maps.component';
import { MultiMapControlComponent } from '../../maplibre-map/multi-map-control/multi-map-control.component';
import { ButtonComponent, OpacitySliderComponent } from '@styleguide';
import { firstValueFrom, map, of, skip, switchMap, take } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { ExploreStorageService } from '@services/local-storage.service';
import { BaseLayersComponent } from '../../base-layers/base-layers/base-layers.component';
import { ExploreModesToggleComponent } from '../../maplibre-map/explore-modes-toggle/explore-modes-toggle.component';
import { MapSelectorComponent } from '../map-selector/map-selector.component';
import { DrawService } from 'src/app/maplibre-map/draw.service';
import { HttpClientModule } from '@angular/common/http';
import { MapConfigService } from '../../maplibre-map/map-config.service';
import { PlanState } from '../../plan/plan.state';
import { getPlanPath } from '../../plan/plan-helpers';
import { FrontendConstants } from '@types';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

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
export class ExploreComponent implements OnDestroy {
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
    private drawService: DrawService
  ) {
    this.loadStateFromLocalStorage();

    this.planState.currentPlanId$
      .pipe(
        take(1),
        switchMap((id) => {
          if (id) {
            return this.planState.currentPlan$;
          }
          return of(null);
        })
      )
      .subscribe((plan) => {
        let label = 'New Plan';
        let backUrl = '/';
        if (plan) {
          label = 'Explore: ' + plan.name;
          backUrl = getPlanPath(plan.id);
        }
        this.breadcrumbService.updateBreadCrumb({
          label,
          backUrl,
        });
      });

    // expand panel automatically when the selected map change
    // (when the user clicks on the data layer name on the map)
    this.multiMapConfigState.selectedMapId$
      .pipe(untilDestroyed(this), skip(1))
      .subscribe((id) => {
        this.panelExpanded = true;
        // if I have a selected map, go to data layer tab
        if (id) {
          this.tabIndex = 0;
        }
      });

    this.mapConfigService.initialize();
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
      this.tabIndex = options.tabIndex || 0;
      this.multiMapConfigState.updateDataLayersOpacity(
        options.opacity || FrontendConstants.MAPLIBRE_MAP_DATA_LAYER_OPACITY
      );
    }
  }

  onTabIndexChange(index: number) {
    if (index !== 0) {
      this.multiMapConfigState.setSelectedMap(null);
    } else {
      this.multiMapConfigState.resetToFirstMap();
    }
  }
}
