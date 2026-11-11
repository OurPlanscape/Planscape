import {
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
} from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { ButtonComponent } from '@styleguide';
import { BaseLayersComponent } from '@base-layers/base-layers/base-layers.component';
import { MapTabsComponent } from '@explore/map-tabs/map-tabs.component';
import {
  SidebarIconRailComponent,
  SidebarRailItem,
} from '@explore/sidebar-icon-rail/sidebar-icon-rail.component';
import { dataLayersRailItems } from '@explore/sidebar-icon-rail/data-layers-rail-items';
import { SidebarTabs } from '@explore/sidebar-tabs';
import { DataLayersRegistryService } from '@explore/data-layers-registry';
import { MultiMapConfigState } from '@maplibre-map/multi-map-config.state';
import { WorkspaceState } from '@app/workspaces/workspace.state';
import { FeatureService } from '@features/feature.service';
import { FeaturesModule } from '@features/features.module';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  asapScheduler,
  catchError,
  combineLatest,
  map,
  observeOn,
  of,
  switchMap,
  take,
} from 'rxjs';

const PANEL_BY_RAIL_ITEM: Record<string, SidebarTabs> = {
  'data-layers': SidebarTabs.DATA_LAYERS,
  'base-layers': SidebarTabs.BASE_LAYERS,
  favorites: SidebarTabs.FAVORITES,
  uploaded: SidebarTabs.UPLOADED,
};

@Component({
  selector: 'app-explore-sidebar',
  standalone: true,
  imports: [
    NgIf,
    AsyncPipe,
    ButtonComponent,
    BaseLayersComponent,
    FeaturesModule,
    MapTabsComponent,
    MatIconModule,
    MatTooltipModule,
    SidebarIconRailComponent,
  ],
  templateUrl: './explore-sidebar.component.html',
  styleUrl: './explore-sidebar.component.scss',
})
export class ExploreSidebarComponent {
  readonly SidebarTabs = SidebarTabs;

  @Input() expanded = true;
  @Input() selectedTab: SidebarTabs = SidebarTabs.DATA_LAYERS;

  @Output() expandedChange = new EventEmitter<boolean>();
  @Output() selectedTabChange = new EventEmitter<SidebarTabs>();

  // State of the data layers panel for the map currently picked in the selector
  private dataLayersState$ = combineLatest([
    this.multiMapConfigState.selectedMapId$,
    this.dataLayersRegistry.size$,
  ]).pipe(
    map(([mapId]) => (mapId ? this.dataLayersRegistry.get(mapId) : undefined))
  );

  dataLayersSelection$ = this.dataLayersState$.pipe(
    // Maps register and restore their state on init, after this header was checked
    observeOn(asapScheduler),
    switchMap((state) => state?.selection$ ?? of(null))
  );

  constructor(
    private multiMapConfigState: MultiMapConfigState,
    private dataLayersRegistry: DataLayersRegistryService,
    private featureService: FeatureService,
    private workspaceState: WorkspaceState
  ) {}

  canUpload$ = this.featureService.isFeatureEnabled('DATA_UPLOAD')
    ? this.workspaceState.currentWorkspace$.pipe(
        map((workspace) => workspace.permissions.includes('add_datalayer')),
        catchError(() => of(false))
      )
    : of(false);

  openUpload() {
    // TODO: open the upload data modal
  }

  goBack() {
    this.dataLayersState$
      .pipe(take(1))
      .subscribe((state) => state?.goBackToSearchResults());
  }

  @HostBinding('class.expanded') get hostExpanded() {
    return this.expanded;
  }

  readonly railItems = dataLayersRailItems({
    baseLayers: true,
    uploaded: this.featureService.isFeatureEnabled('DATA_UPLOAD'),
    favoritesEnabled: true,
  });

  get activeItem() {
    return this.railItems.find(
      (item) => PANEL_BY_RAIL_ITEM[item.id] === this.selectedTab
    );
  }

  get activeItemId() {
    return this.activeItem?.id ?? null;
  }

  selectItem(item: SidebarRailItem) {
    const tab = PANEL_BY_RAIL_ITEM[item.id];
    if (tab === undefined) {
      return;
    }
    if (!this.expanded) {
      this.expandedChange.emit(true);
    }
    if (tab !== this.selectedTab) {
      this.selectedTabChange.emit(tab);
    }
  }
}
