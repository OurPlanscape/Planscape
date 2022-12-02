import { Component, Input } from '@angular/core';
import { Map } from 'src/app/types';

@Component({
  selector: 'app-map-nameplate',
  templateUrl: './map-nameplate.component.html',
  styleUrls: ['./map-nameplate.component.scss'],
})
export class MapNameplateComponent {
  @Input() map!: Map | null;
  @Input() selected: boolean = false;
}
