import { Component, Input } from '@angular/core';
import { ScenarioSetupModalComponent } from '@app/scenario/scenario-setup-modal/scenario-setup-modal.component';
import { Plan, SCENARIO_TYPE } from '@app/types';
import { ActionCardComponent } from '@styleguide';
import { MatDialog } from '@angular/material/dialog';
import { UploadProjectAreasModalComponent } from '@app/plan/upload-project-areas-modal/upload-project-areas-modal.component';
import { MatIconModule } from '@angular/material/icon';
import { canAddScenario } from '@app/plan/permissions';

@Component({
  selector: 'app-scenarios-empty-list',
  standalone: true,
  imports: [ActionCardComponent, MatIconModule],
  templateUrl: './scenarios-empty-list.component.html',
  styleUrl: './scenarios-empty-list.component.scss',
})
export class ScenariosEmptyListComponent {
  @Input() plan!: Plan | null;

  constructor(private dialog: MatDialog) {}

  get canAddScenarios() {
    return this.plan && canAddScenario(this.plan);
  }

  public openProjectAreasUploadDialog() {
    return this.dialog.open(UploadProjectAreasModalComponent, {
      data: {
        planId: this.plan?.id,
        planning_area_name: this.plan?.name,
      }});
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
