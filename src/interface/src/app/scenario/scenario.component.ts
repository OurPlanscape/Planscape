import { Component } from '@angular/core';
import { SharedModule } from '@shared';
import { ScenarioMapComponent } from '@maplibre/scenario-map/scenario-map.component';

/**
 * This component wraps the projected content on a right side panel and shows the
 * scenario map on the left main colum.
 *
 * TODO:  Might be renamed?
 */
@Component({
  standalone: true,
  selector: 'app-scenario',
  templateUrl: './scenario.component.html',
  styleUrl: './scenario.component.scss',
  imports: [SharedModule, ScenarioMapComponent],
})
export class ScenarioComponent {
  constructor() {}
}
