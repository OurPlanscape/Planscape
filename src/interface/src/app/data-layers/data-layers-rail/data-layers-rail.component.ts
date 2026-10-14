import { AsyncPipe, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ButtonComponent } from '@styleguide';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import {
  SidebarIconRailComponent,
  SidebarRailItem,
} from '@explore/sidebar-icon-rail/sidebar-icon-rail.component';
import { DataLayersStateService } from '../data-layers.state.service';

/**
 * Data layers with the icon rail, for pages without base layers
 * (scenario creation, scenario view). Used when DATA_ORGANIZATION is on.
 */
@Component({
  selector: 'app-data-layers-rail',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    ButtonComponent,
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

  readonly railItems: SidebarRailItem[] = [
    { id: 'data-layers', icon: 'category', label: 'Data Layers' },
    {
      id: 'uploaded',
      icon: 'drive_folder_upload',
      label: 'Uploaded',
      disabled: true,
    },
    { id: 'favorites', icon: 'star', label: 'Favorites', disabled: true },
  ];

  selection$ = this.dataLayersStateService.selection$;

  constructor(private dataLayersStateService: DataLayersStateService) {}

  goBack() {
    this.dataLayersStateService.goBackToSearchResults();
  }
}
