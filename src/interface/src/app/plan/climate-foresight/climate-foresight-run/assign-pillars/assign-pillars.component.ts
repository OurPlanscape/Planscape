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
  ],
  templateUrl: './assign-pillars.component.html',
  styleUrl: './assign-pillars.component.scss',
})
export class AssignPillarsComponent implements OnInit {
  @Input() datalayers: DataLayer[] = [];
  @Input() run: ClimateForesightRun | null = null;

  private dialog: MatDialog = inject(MatDialog);
  climateService: ClimateForesightService = inject(ClimateForesightService);

  pillars: Pillar[] = [];

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
    this.dialog
      .open(NamePillarModalComponent)
      .afterClosed()
      .subscribe((modalResponse: any) => {
        if (modalResponse) {
          this.getPillars();
        }
      });
  }

  deletePillar() {
    this.dialog
      .open(DeleteDialogComponent, {
        data: {
          title: 'Delete pillar',
          body: 'This will remove the pillar, but all data layers inside will remain and return to the selected data layers list. Are you sure you want to delete this pillar?',
        },
      })
      .afterClosed()
      .subscribe((modalResponse: any) => {});
  }

  getDataLayers() {
    this.climateService
      .getDataLayers()
      .pipe()
      .subscribe((datalayers) => {
        console.log('Datalayers', datalayers);
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
      });
  }

  getPillars() {
    if (!this.run?.id) {
      return;
    }
    this.climateService.getPillars(this.run?.id).subscribe((res) => {
      console.log('Pillars', res);
      this.pillars = this.pillars;
    });
  }
}
