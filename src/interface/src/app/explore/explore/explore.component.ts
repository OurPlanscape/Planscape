import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MapNavbarComponent } from '../../maplibre-map/map-nav-bar/map-nav-bar.component';
import { MapComponent } from '@maplibre/ngx-maplibre-gl';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { SharedModule } from '@shared';
import { BreadcrumbService } from '@services/breadcrumb.service';
import { MultiMapConfigState } from '../../maplibre-map/multi-map-config.state';
import { SyncedMapsComponent } from '../../maplibre-map/synced-maps/synced-maps.component';
import { MultiMapControlComponent } from '../../maplibre-map/multi-map-control/multi-map-control.component';
import { OpacitySliderComponent } from '@styleguide';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [
    AsyncPipe,
    MapNavbarComponent,
    MapComponent,
    SharedModule,
    SyncedMapsComponent,
    MultiMapControlComponent,
    OpacitySliderComponent,
  ],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.scss',
  providers: [
    // 1. Create a single instance of the subclass
    { provide: MapConfigState, useClass: MultiMapConfigState },

    // 2. Alias its own type to that same instance
    { provide: MultiMapConfigState, useExisting: MapConfigState },
  ],
})
export class ExploreComponent {
  // TODO: Replace the behavior subject with the value that is coming from the state
  projectAreasOpacity$ = new BehaviorSubject(0.5);
  constructor(private breadcrumbService: BreadcrumbService) {
    this.breadcrumbService.updateBreadCrumb({
      label: ' New Plan',
      backUrl: '/',
    });
  }

  handleOpacityChange(opacity: number) {
    // TODO: update the opacity directly on the state
    this.projectAreasOpacity$.next(opacity);
  }
}
