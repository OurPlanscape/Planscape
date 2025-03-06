import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-map-nav-bar',
  standalone: true,
  imports: [AsyncPipe, NgIf],
  templateUrl: './map-nav-bar.component.html',
  styleUrl: './map-nav-bar.component.scss',
})
export class MapNavbarComponent {
  constructor() {}
  opacity$ = new BehaviorSubject(0);
}
