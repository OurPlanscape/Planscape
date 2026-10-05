import {
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
} from '@angular/core';
import { NgIf } from '@angular/common';
import { ButtonComponent } from '@styleguide';
import { BaseLayersComponent } from '@base-layers/base-layers/base-layers.component';
import { MapSelectorComponent } from '@explore/map-selector/map-selector.component';
import {
  SidebarIconRailComponent,
  SidebarRailItem,
} from '@explore/sidebar-icon-rail/sidebar-icon-rail.component';
import { SidebarTabs } from '@explore/sidebar-tabs';

const PANEL_BY_RAIL_ITEM: Record<string, SidebarTabs> = {
  'data-layers': SidebarTabs.DATA_LAYERS,
  'base-layers': SidebarTabs.BASE_LAYERS,
};

@Component({
  selector: 'app-explore-sidebar',
  standalone: true,
  imports: [
    NgIf,
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
