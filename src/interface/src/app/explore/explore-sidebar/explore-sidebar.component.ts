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
import { MapSelectorComponent } from '@explore/map-selector/map-selector.component';
import {
  SidebarIconRailComponent,
  SidebarRailItem,
} from '@explore/sidebar-icon-rail/sidebar-icon-rail.component';
import { SidebarTabs } from '@explore/sidebar-tabs';
import { DataLayersRegistryService } from '@explore/data-layers-registry';
import { MultiMapConfigState } from '@maplibre-map/multi-map-config.state';
import { combineLatest, map, of, switchMap, take } from 'rxjs';

const PANEL_BY_RAIL_ITEM: Record<string, SidebarTabs> = {
  'data-layers': SidebarTabs.DATA_LAYERS,
  'base-layers': SidebarTabs.BASE_LAYERS,
};

@Component({
  selector: 'app-explore-sidebar',
  standalone: true,
  imports: [
    NgIf,
    AsyncPipe,
    ButtonComponent,
    BaseLayersComponent,
    MapSelectorComponent,
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
    switchMap((state) => state?.selection$ ?? of(null))
  );

  constructor(
    private multiMapConfigState: MultiMapConfigState,
    private dataLayersRegistry: DataLayersRegistryService
  ) {}

  goBack() {
    this.dataLayersState$
      .pipe(take(1))
      .subscribe((state) => state?.goBackToSearchResults());
  }

  @HostBinding('class.expanded') get hostExpanded() {
    return this.expanded;
  }

  readonly railItems: SidebarRailItem[] = [
    { id: 'data-layers', icon: 'category', label: 'Data Layers' },
    { id: 'base-layers', icon: 'layers', label: 'Base Layers' },
    { id: 'favorites', icon: 'star', label: 'Favorites', disabled: true },
  ];

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
    // clicking the icon of the panel already on screen collapses it
    if (this.expanded && tab === this.selectedTab) {
      this.expandedChange.emit(false);
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
