import { Component, Input } from '@angular/core';
import { ScenarioSetupModalComponent } from '@app/scenario/scenario-setup-modal/scenario-setup-modal.component';
import { Plan, SCENARIO_TYPE } from '@app/types';
import { ActionCardComponent } from '@styleguide';
import { MatDialog } from '@angular/material/dialog';
import { UploadProjectAreasModalComponent } from '@app/plan/upload-project-areas-modal/upload-project-areas-modal.component';

@Component({
  selector: 'app-scenarios-empty-list',
  standalone: true,
  imports: [ActionCardComponent],
  templateUrl: './scenarios-empty-list.component.html',
  styleUrl: './scenarios-empty-list.component.scss',
})
export class ScenariosEmptyListComponent {
  @Input() plan!: Plan | null;

  constructor(private dialog: MatDialog) {}

  public openProjectAreasUploadDialog() {
    return this.dialog.open(UploadProjectAreasModalComponent, {});
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
