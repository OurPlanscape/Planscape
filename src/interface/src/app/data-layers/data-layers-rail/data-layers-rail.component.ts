import { AsyncPipe, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { filter, skip } from 'rxjs';
import { ButtonComponent } from '@styleguide';
import { BaseLayersComponent } from '@base-layers/base-layers/base-layers.component';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import { FavoriteDataLayersComponent } from '@data-layers/favorite-data-layers/favorite-data-layers.component';
import {
  SidebarIconRailComponent,
  SidebarRailItem,
} from '@explore/sidebar-icon-rail/sidebar-icon-rail.component';
import { dataLayersRailItems } from '@explore/sidebar-icon-rail/data-layers-rail-items';
import { FeatureService } from '@features/feature.service';
import { FeaturesModule } from '@features/features.module';
import { DataLayersStateService } from '../data-layers.state.service';

type RailPanel = 'data-layers' | 'base-layers' | 'favorites' | 'uploaded';

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
    FavoriteDataLayersComponent,
    FeaturesModule,
    SidebarIconRailComponent,
  ],
  templateUrl: './data-layers-rail.component.html',
  styleUrl: './data-layers-rail.component.scss',
})
export class DataLayersRailComponent {
  @Input() displayAddButton = false;
  @Input() useClearFooter = true;
  @Input() stickySearch = false;

  @Input() set showBaseLayers(value: boolean) {
    this._showBaseLayers = value;
    this.buildRailItems();
  }

  private _showBaseLayers = false;
  private favoritesEnabled = false;

  activePanel: RailPanel = 'data-layers';

  railItems: SidebarRailItem[] = [];

  selection$ = this.dataLayersStateService.selection$;

  private readonly uploadEnabled =
    this.featureService.isFeatureEnabled('DATA_UPLOAD');

  constructor(
    private dataLayersStateService: DataLayersStateService,
    private featureService: FeatureService
  ) {
    this.buildRailItems();

    this.dataLayersStateService.favoritesEnabled$
      .pipe(untilDestroyed(this))
      .subscribe((enabled) => {
        this.favoritesEnabled = enabled;
        if (!enabled && this.activePanel === 'favorites') {
          this.activePanel = 'data-layers';
        }
        this.buildRailItems();
      });

    // the map's layer name legend browses to its layer, so bring the data layers back
    this.dataLayersStateService.paths$
      .pipe(
        untilDestroyed(this),
        skip(1),
        filter((path) => path.length > 0)
      )
      .subscribe(() => (this.activePanel = 'data-layers'));
  }

  private buildRailItems() {
    this.railItems = dataLayersRailItems({
      baseLayers: this._showBaseLayers,
      uploaded: this.uploadEnabled,
      favoritesEnabled: this.favoritesEnabled,
    });
  }

  selectItem(item: SidebarRailItem) {
    this.activePanel = item.id as RailPanel;
  }

  goBack() {
    this.dataLayersStateService.goBackToSearchResults();
  }
}
