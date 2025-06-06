import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonComponent } from '@styleguide';
import { map } from 'rxjs';
import { MultiMapConfigState } from 'src/app/maplibre-map/multi-map-config.state';

@Component({
  selector: 'app-map-selector',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, AsyncPipe, ButtonComponent],
  templateUrl: './map-selector.component.html',
  styleUrl: './map-selector.component.scss',
})
export class MapSelectorComponent {
  layoutMode$ = this.multiMapConfigState.layoutMode$;
  mapsArray$ = this.layoutMode$.pipe(
    map((layoutMode) =>
      Array.from({ length: layoutMode }, (_, mapNumber) => mapNumber + 1)
    )
  );

  selectedMapId$ = this.multiMapConfigState.selectedMapId$;

  constructor(private multiMapConfigState: MultiMapConfigState) {}

  setSelectedMap(id: number) {
    this.multiMapConfigState.setSelectedMap(id);
  }
}
