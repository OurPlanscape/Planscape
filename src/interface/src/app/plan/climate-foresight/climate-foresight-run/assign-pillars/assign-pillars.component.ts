import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { SectionComponent, ButtonComponent } from '@styleguide';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { NamePillarModalComponent } from '../../name-pillar-modal/name-pillar-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { DeleteDialogComponent } from 'src/app/standalone/delete-dialog/delete-dialog.component';
import { ClimateForesightService } from '@services';
import { ClimateForesightRun, DataLayer, Pillar } from '@types';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-assign-pillars',
  standalone: true,
  imports: [
    CommonModule,
    SectionComponent,
    ButtonComponent,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    NamePillarModalComponent,
    DeleteDialogComponent,
    ButtonComponent,
    MatProgressSpinnerModule,
  ],
  templateUrl: './assign-pillars.component.html',
  styleUrl: './assign-pillars.component.scss',
})
export class AssignPillarsComponent implements OnInit {
  @Input() run: ClimateForesightRun | null = null;

  private dialog: MatDialog = inject(MatDialog);
  climateService: ClimateForesightService = inject(ClimateForesightService);

  datalayers: DataLayer[] = [];
  pillars: Pillar[] = [];

  loadingDatalayers = false;
  loadingPillars = false;

  ngOnInit(): void {
    this.getDataLayers();
    this.getPillars();
  }

  drop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }

  addPillar() {
    if (this.run?.id) {
      this.dialog
        .open(NamePillarModalComponent, {
          data: {
            runId: this.run.id,
          },
        })
        .afterClosed()
        .subscribe((modalResponse: any) => {
          if (modalResponse) {
            this.getPillars();
          }
        });
    }
  }

  editPillar(pillar: Pillar) {
    if (this.run?.id) {
      this.dialog
        .open(NamePillarModalComponent, {
          data: {
            pillar: pillar,
            runId: this.run.id,
          },
        })
        .afterClosed()
        .subscribe((modalResponse: any) => {
          debugger;
          if (modalResponse) {
            this.getPillars();
          }
        });
    }
  }

  deletePillar(id: number) {
    this.dialog
      .open(DeleteDialogComponent, {
        data: {
          title: 'Delete pillar',
          body: 'This will remove the pillar, but all data layers inside will remain and return to the selected data layers list. Are you sure you want to delete this pillar?',
        },
      })
      .afterClosed()
      .subscribe((modalResponse: any) => {
        if (this.run?.id && modalResponse === true) {
          this.climateService.deletePillar(id, this.run.id).subscribe((res) => {
            this.getPillars();
          });
        }
      });
  }

  getDataLayers() {
    this.loadingDatalayers = true;
    this.climateService
      .getDataLayers()
      .pipe()
      .subscribe({
        next: (datalayers) => {
          // Filtering just the enabled datalayers
          const enabledLayers =
            datalayers.filter(
              (dl: any) =>
                dl.metadata?.modules?.['climate_foresight']?.enabled === true
            ) || [];
          // geting the selected datalayers id
          const availableLayerIDs = this.run?.input_datalayers?.map(
            (dl) => dl.datalayer
          );
          // Filtering just the available datalayers
          const availableLayers = enabledLayers.filter((dl) =>
            availableLayerIDs?.includes(dl.id)
          );
          this.datalayers = availableLayers;
          this.loadingDatalayers = false;
        },
        error: () => {
          this.loadingDatalayers = false;
        },
      });
  }

  getPillars() {
    if (!this.run?.id) {
      return;
    }
    this.loadingPillars = true;
    this.climateService.getPillars(this.run?.id).subscribe({
      next: (res) => {
        this.pillars = res.map((p) => {
          p.isOpen = false;
          // TODO: Getting the pre-selected datalayers for this pillar
          const preSelectedLayers: any[] = [];
          p.dataLayers = preSelectedLayers;
          return p;
        });
        this.loadingPillars = false;
      },
      error: () => {
        this.loadingPillars = false;
      },
    });
  }
}
