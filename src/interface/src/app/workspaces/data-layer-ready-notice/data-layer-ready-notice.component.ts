import { NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  MAT_SNACK_BAR_DATA,
  MatSnackBarRef,
} from '@angular/material/snack-bar';

export interface DataLayerReadyNoticeData {
  name: string;
  canEdit: boolean;
}

@Component({
  selector: 'app-data-layer-ready-notice',
  standalone: true,
  imports: [MatIconModule, NgIf],
  templateUrl: './data-layer-ready-notice.component.html',
  styleUrls: ['./data-layer-ready-notice.component.scss'],
})
export class DataLayerReadyNoticeComponent {
  data: DataLayerReadyNoticeData = inject(MAT_SNACK_BAR_DATA);
  private snackBarRef = inject(MatSnackBarRef);

  edit() {
    this.snackBarRef.dismissWithAction();
  }

  close() {
    this.snackBarRef.dismiss();
  }
}
