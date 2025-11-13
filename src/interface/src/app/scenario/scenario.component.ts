import { Component } from '@angular/core';
import { NewScenarioState } from './new-scenario.state';
import { SharedModule } from '@shared';
import { GoalOverlayComponent } from '../plan/goal-overlay/goal-overlay.component';
import { ScenarioMapComponent } from '../maplibre-map/scenario-map/scenario-map.component';

@Component({
  standalone: true,
  selector: 'app-scenario',
  templateUrl: './scenario.component.html',
  styleUrl: './scenario.component.scss',
  providers: [NewScenarioState],
  imports: [SharedModule, GoalOverlayComponent, ScenarioMapComponent],
})
export class ScenarioComponent {
  constructor() {}
}
