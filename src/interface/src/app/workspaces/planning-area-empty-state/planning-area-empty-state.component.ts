import { NgIf } from '@angular/common';
import { Component, EventEmitter, inject, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { UploadPlanningAreaBoxComponent } from '@app/explore/upload-planning-area-box/upload-planning-area-box.component';
import { DrawService } from '@app/maplibre-map/draw.service';
import { ButtonComponent } from '@styleguide';
import { PlanningAreaCreationModalComponent } from '../planning-area-creation-modal/planning-area-creation-modal.component';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-planning-area-empty-state',
  standalone: true,
  imports: [NgIf, ButtonComponent, UploadPlanningAreaBoxComponent],
  templateUrl: './planning-area-empty-state.component.html',
  styleUrl: './planning-area-empty-state.component.scss',
  providers: [DrawService],
})
export class PlanningAreaEmptyStateComponent {
  @Output() reload = new EventEmitter();
  showUploadForm = false;
  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);
  workspaceId = this.route.snapshot.data['workspaceId'];
  handleDraw() {
    // TODO: Will be covered as part of PLAN-3858
  }
  handleUpload() {
    this.dialog
      .open(PlanningAreaCreationModalComponent, {
        data: {
          workspaceId: this.workspaceId,
        },
      })
      .afterClosed()
      .subscribe((reload) => {
        if (reload === true) {
          this.reload.emit();
        }
      });
  }
}
