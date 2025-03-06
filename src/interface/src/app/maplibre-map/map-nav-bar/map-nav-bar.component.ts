import { Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MapBaseDropdownComponent } from '../map-base-dropdown/map-base-dropdown.component';

@Component({
  selector: 'app-map-nav-bar',
  standalone: true,
  imports: [MapBaseDropdownComponent],
  templateUrl: './map-nav-bar.component.html',
  styleUrl: './map-nav-bar.component.scss',
})
export class MapNavbarComponent {
  constructor() {}
  opacity$ = new BehaviorSubject(0);
}
