import { AsyncPipe, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { filter, skip } from 'rxjs';
import { ButtonComponent } from '@styleguide';
import { BaseLayersComponent } from '@base-layers/base-layers/base-layers.component';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import {
  SidebarIconRailComponent,
  SidebarRailItem,
} from '@explore/sidebar-icon-rail/sidebar-icon-rail.component';
import { DataLayersStateService } from '../data-layers.state.service';

type RailPanel = 'data-layers' | 'base-layers';

const DATA_LAYERS_ITEM: SidebarRailItem = {
  id: 'data-layers',
  icon: 'category',
  label: 'Data Layers',
};
const BASE_LAYERS_ITEM: SidebarRailItem = {
  id: 'base-layers',
  icon: 'layers',
  label: 'Base Layers',
};
const DISABLED_ITEMS: SidebarRailItem[] = [
  {
    id: 'uploaded',
    icon: 'drive_folder_upload',
    label: 'Uploaded',
    disabled: true,
  },
  { id: 'favorites', icon: 'star', label: 'Favorites', disabled: true },
];
const ITEMS = [DATA_LAYERS_ITEM, ...DISABLED_ITEMS];
const ITEMS_WITH_BASE_LAYERS = [
  DATA_LAYERS_ITEM,
  BASE_LAYERS_ITEM,
  ...DISABLED_ITEMS,
];

/**
 * Data layers with the icon rail, and optionally base layers, for pages
 * outside the explore map (scenario creation, scenario view).
 * Used when DATA_ORGANIZATION is on.
 */
@UntilDestroy()
@Component({
  selector: 'app-data-layers-rail',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    ButtonComponent,
    BaseLayersComponent,
    DataLayersComponent,
    SidebarIconRailComponent,
  ],
  templateUrl: './data-layers-rail.component.html',
  styleUrl: './data-layers-rail.component.scss',
})
export class DataLayersRailComponent {
  @Input() displayAddButton = false;
  @Input() useClearFooter = true;
  @Input() stickySearch = false;
  @Input() showBaseLayers = false;

  activePanel: RailPanel = 'data-layers';

  get railItems(): SidebarRailItem[] {
    return this.showBaseLayers ? ITEMS_WITH_BASE_LAYERS : ITEMS;
  }

  selection$ = this.dataLayersStateService.selection$;

  constructor(private dataLayersStateService: DataLayersStateService) {
    // the map's layer name legend browses to its layer, so bring the data layers back
    this.dataLayersStateService.paths$
      .pipe(
        untilDestroyed(this),
        skip(1),
        filter((path) => path.length > 0)
      )
      .subscribe(() => (this.activePanel = 'data-layers'));
  }

  selectItem(item: SidebarRailItem) {
    this.activePanel = item.id as RailPanel;
  }

  goBack() {
    this.dataLayersStateService.goBackToSearchResults();
  }
}
