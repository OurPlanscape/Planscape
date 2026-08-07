import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToggleComponent } from '@styleguide';
import { NewScenarioState } from '@app/scenario-creation/new-scenario.state';

@Component({
  selector: 'app-treated-stands-toggle',
  standalone: true,
  imports: [FormsModule, ToggleComponent],
  templateUrl: './treated-stands-toggle.component.html',
  styleUrl: './treated-stands-toggle.component.scss',
})
export class TreatedStandsToggleComponent {
  showTreatedStands = false;

  constructor(private newScenarioState: NewScenarioState) {}

  toggleTreatedStands() {
    this.newScenarioState.setDisplayTreatedStands(this.showTreatedStands);
  }
}
