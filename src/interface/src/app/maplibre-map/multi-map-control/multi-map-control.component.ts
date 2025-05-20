import { Component } from '@angular/core';
import { MultiMapConfigState } from '../multi-map-config.state';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';

@Component({
  selector: 'app-multi-map-control',
  standalone: true,
  imports: [AsyncPipe, NgIf, NgClass],
  templateUrl: './multi-map-control.component.html',
  styleUrl: './multi-map-control.component.scss',
})
export class MultiMapControlComponent {
  layoutMode$ = this.multiMapConfigState.layoutMode$;

  constructor(private multiMapConfigState: MultiMapConfigState) {}

  setLayoutMode(view: 1 | 2 | 4) {
    this.multiMapConfigState.setLayoutMode(view);
  }
}
