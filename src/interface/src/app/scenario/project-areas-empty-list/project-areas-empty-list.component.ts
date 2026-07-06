import { Component, Input } from '@angular/core';
import { ScenarioSetupModalComponent } from '@app/scenario/scenario-setup-modal/scenario-setup-modal.component';
import { Plan, SCENARIO_TYPE } from '@app/types';
import { ActionCardComponent } from '@styleguide';
import { MatIconModule } from '@angular/material/icon';
import { canAddScenario } from '@app/plan/permissions';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-project-areas-empty-list',
  standalone: true,
  imports: [ActionCardComponent, MatIconModule],
  templateUrl: './project-areas-empty-list.component.html',
  styleUrl: './project-areas-empty-list.component.scss',
})
export class ProjectAreasEmptyListComponent {
  @Input() plan!: Plan | null;

  constructor(private dialog: MatDialog) {}

  get canAddScenarios() {
    return this.plan && canAddScenario(this.plan);
  }

  public openScenarioSetupDialog(type: SCENARIO_TYPE) {
    return this.dialog.open(ScenarioSetupModalComponent, {
      maxWidth: '560px',
      data: {
        planId: this.plan?.id,
        fromClone: false,
        type: type,
      },
    });
  }
}
