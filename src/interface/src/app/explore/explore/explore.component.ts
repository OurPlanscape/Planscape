import { Component, HostListener, OnDestroy } from '@angular/core';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { MapNavbarComponent } from '../../maplibre-map/map-nav-bar/map-nav-bar.component';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { SharedModule } from '@shared';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { MultiMapConfigState } from '../../maplibre-map/multi-map-config.state';
import { SyncedMapsComponent } from '../../maplibre-map/synced-maps/synced-maps.component';
import { MultiMapControlComponent } from '../../maplibre-map/multi-map-control/multi-map-control.component';
import { ButtonComponent, OpacitySliderComponent } from '@styleguide';
import { BehaviorSubject, map, of, tap, switchMap, take, combineLatest, Observable } from 'rxjs';
import { MatTabsModule } from '@angular/material/tabs';
import { ExploreStorageService } from '@services/local-storage.service';
import { BaseLayersComponent } from '../../base-layers/base-layers/base-layers.component';
import { ExploreModesToggleComponent } from '../../maplibre-map/explore-modes-toggle/explore-modes-toggle.component';
import { MapSelectorComponent } from '../map-selector/map-selector.component';
import { DrawService } from 'src/app/maplibre-map/draw.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MapConfigService } from '../../maplibre-map/map-config.service';
import { PlanState } from '../../plan/plan.state';
import { getPlanPath } from '../../plan/plan-helpers';
import { NavbarAreaAcreageComponent } from '../navbar-area-acreage/navbar-area-acreage.component';
import { Plan } from '@types';
@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [
    AsyncPipe,
    ExploreModesToggleComponent,
    HttpClientTestingModule,
    MapNavbarComponent,
    MapComponent,
    SharedModule,
    SyncedMapsComponent,
    MultiMapControlComponent,
    OpacitySliderComponent,
    NgClass,
    ButtonComponent,
    NgIf,
    MatTabsModule,
    NavbarAreaAcreageComponent,
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
  // TODO: Replace the behavior subject with the value that is coming from the state
  projectAreasOpacity$ = new BehaviorSubject(0.5);
  panelExpanded = true;
  tabIndex = 0;

  showSelectionToggle$ = this.planState.currentPlanId$.pipe(map((id) => !id));

  @HostListener('window:beforeunload')
  beforeUnload() {
    this.saveStateToLocalStorage();
  }

  totalAcres$ = new BehaviorSubject<number | null>(null);
  loadingAcres$ = new BehaviorSubject<boolean>(false);
  drawAcres$ = this.drawService.totalAcres$;

  constructor(
    private breadcrumbService: BreadcrumbService,
    private exploreStorageService: ExploreStorageService,
    private multiMapConfigState: MultiMapConfigState,
    private mapConfigService: MapConfigService,
    private planState: PlanState,
    private drawService: DrawService,
  ) {
    this.loadStateFromLocalStorage();

    //TODO: just move these to the navbar acres component?

    combineLatest([this.planState.currentPlan$ as Observable<Plan>, this.drawService.totalAcres$ as Observable<number>]).pipe(
      tap(([plan, drawAcres]: [Plan, number]) => {
        console.log('Emitted values:', { plan, drawAcres });
      }),
      // filter(([plan, drawAcres]: [Plan, number]) => drawAcres !== null || plan.area_acres !== null),
      map(([plan, drawAcres]: [Plan, number]) => {
        // console.log('isDrawing:', isDrawing);
        console.log('plan acres?:', plan.area_acres);
        console.log('draw acres?:', drawAcres);
        return 10000;
        // return isDrawing ? drawAcres ?? null : plan.area_acres ?? null;
      })
    ).subscribe((result: number) => {
      console.log('is there a result?', result);
      this.totalAcres$.next(result);
    });

    combineLatest([this.planState.isPlanLoading$, this.drawService.calculatingAcres$]).pipe(
      map(([planLoading, drawLoading]) => planLoading || drawLoading) // Check if either is true
    ).subscribe(isTrue => {
      this.loadingAcres$.next(isTrue);
    });

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

    this.mapConfigService.initialize();
  }

  handleOpacityChange(opacity: number) {
    // TODO: update the opacity directly on the state
    this.projectAreasOpacity$.next(opacity);
  }

  togglePanelExpanded() {
    this.panelExpanded = !this.panelExpanded;
  }

  ngOnDestroy() {
    this.saveStateToLocalStorage();
  }

  private saveStateToLocalStorage() {
    this.exploreStorageService.setItem({
      tabIndex: this.tabIndex,
      isPanelExpanded: this.panelExpanded,
    });
  }

  private loadStateFromLocalStorage() {
    const options = this.exploreStorageService.getItem();
    if (options) {
      this.panelExpanded = options.isPanelExpanded || false;
      this.tabIndex = options.tabIndex || 0;
      this.onTabIndexChange(this.tabIndex);
    }
  }

  onTabIndexChange(index: number) {
    if (index !== 0) {
      this.multiMapConfigState.setSelectedMap(null);
    } else {
      this.multiMapConfigState.setSelectedMap(1); // Default map
    }
  }
}
