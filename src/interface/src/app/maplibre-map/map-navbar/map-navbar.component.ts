import { Component } from '@angular/core';
import { MapBaseDropdownComponent } from '../map-base-dropdown/map-base-dropdown.component';
import { OpacitySliderComponent } from '@styleguide';
import { AsyncPipe, NgIf } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { MapConfigState } from '../../maplibre-map/map-config.state';

@Component({
  selector: 'app-map-navbar',
  standalone: true,
  imports: [AsyncPipe, MapBaseDropdownComponent, NgIf, OpacitySliderComponent],
  templateUrl: './map-navbar.component.html',
  styleUrl: './map-navbar.component.scss',
})
export class MapNavbarComponent {
  constructor(private mapConfigState: MapConfigState) {}
  opacity$ = new BehaviorSubject(0);

  handleOpacityChange(opacity: number) {
    this.mapConfigState.setTreatedStandsOpacity(opacity);
  }
}
