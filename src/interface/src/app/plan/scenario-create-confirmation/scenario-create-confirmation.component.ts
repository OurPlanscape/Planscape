import {
  Component,
  EventEmitter,
  Inject,
  inject,
  Input,
  Output,
} from '@angular/core';
import { ModalComponent, ModalConfirmationDialogComponent } from '@styleguide';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FeatureService } from '@app/features/feature.service';

@Component({
  selector: 'app-scenario-create-confirmation',
  standalone: true,
  imports: [ModalComponent, ModalConfirmationDialogComponent],
  templateUrl: './scenario-create-confirmation.component.html',
  styleUrl: './scenario-create-confirmation.component.scss',
})
export class ScenarioCreateConfirmationComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private featureService: FeatureService
  ) {
    this.isDashboardEnabled = this.featureService.isFeatureEnabled(
      'SCENARIO_DASHBOARDS'
    );
  }
  isDashboardEnabled: boolean = false;

  @Input() scenarioName = this.data.name;
  @Output() proceed = new EventEmitter<boolean>();
  readonly dialogRef = inject(
    MatDialogRef<ScenarioCreateConfirmationComponent>
  );

  closeModal(): void {
    this.dialogRef.close(false);
  }

  goToTreatmentPlans(): void {
    this.dialogRef.close(true);
  }
}
