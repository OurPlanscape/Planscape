import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { ModalComponent } from '@styleguide';
import { MatDialogRef } from '@angular/material/dialog';
import { FeatureService } from 'src/app/features/feature.service';

@Component({
  selector: 'app-outside-state-dialog-component',
  standalone: true,
  imports: [ModalComponent, NgIf],
  templateUrl: './outside-state-dialog-component.component.html',
  styleUrl: './outside-state-dialog-component.component.scss',
})
export class OutsideStateDialogComponentComponent {
  readonly dialogRef = inject(
    MatDialogRef<OutsideStateDialogComponentComponent>
  );

  constructor(private featureService: FeatureService) {}

  conusEnabled = this.featureService.isFeatureEnabled('CONUS_WIDE_SCENARIOS');

  closeModal(): void {
    this.dialogRef.close(false);
  }
}
