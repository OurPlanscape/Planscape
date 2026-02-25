import { Component, Input } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MapBaseDropdownComponent } from '@maplibre-map/map-base-dropdown/map-base-dropdown.component';
import { MenuPositionX } from '@angular/material/menu';

@Component({
  selector: 'app-map-nav-bar',
  standalone: true,
  imports: [MapBaseDropdownComponent],
  templateUrl: './map-nav-bar.component.html',
  styleUrl: './map-nav-bar.component.scss',
})
export class MapNavbarComponent {
  @Input() menuPosition: MenuPositionX = 'after';
  constructor() {}
  opacity$ = new BehaviorSubject(0);
}
