import {
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
} from '@angular/core';
import { NgIf } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { ButtonComponent } from '@styleguide';
import { BaseLayersComponent } from '@base-layers/base-layers/base-layers.component';
import { MapSelectorComponent } from '@explore/map-selector/map-selector.component';
import { SidebarTabs } from '@explore/sidebar-tabs';

/**
 * Map viewer side panel used when the DATA_ORGANIZATION flag is off.
 * Delete alongside the flag; see ExploreSidebarComponent for the replacement.
 */
@Component({
  selector: 'app-legacy-sidebar',
  standalone: true,
  imports: [
    NgIf,
    MatTabsModule,
    ButtonComponent,
    BaseLayersComponent,
    MapSelectorComponent,
  ],
  templateUrl: './legacy-sidebar.component.html',
  styleUrl: './legacy-sidebar.component.scss',
})
export class LegacySidebarComponent {
  @Input() expanded = true;
  @Input() selectedTab: SidebarTabs = SidebarTabs.DATA_LAYERS;

  @Output() expandedChange = new EventEmitter<boolean>();
  @Output() selectedTabChange = new EventEmitter<SidebarTabs>();

  @HostBinding('class.expanded') get hostExpanded() {
    return this.expanded;
  }
}
