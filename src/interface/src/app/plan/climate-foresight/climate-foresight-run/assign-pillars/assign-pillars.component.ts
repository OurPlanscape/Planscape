import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
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
export class AssignPillarsComponent {
  datalayers = [
    { title: 'Probability of High Severity Fire' },
    { title: 'Wildlife Species Richness' },
  ];

  pillars: {
    title: string;
    isOpen: boolean;
    dataLayers: { title: string }[];
  }[] = [
    {
      title: 'Air Quality',
      isOpen: false,
      dataLayers: [
        { title: 'Potential Total Smoke Production' },
        { title: 'Potential Avoided Smoke Production' },
        { title: 'Heavy Fuel Load' },
      ],
    },
    {
      title: 'Carbon Sequestration',
      isOpen: false,
      dataLayers: [
        { title: 'Large Tree Carbon' },
        { title: 'Dead and Down Carbon' },
        { title: 'Total Carbon (F3)' },
      ],
    },
    {
      title: 'Fire-Adapted Communities',
      isOpen: false,
      dataLayers: [],
    },
    {
      title: 'Forest Resilience',
      isOpen: false,
      dataLayers: [],
    },
  ];

  private dialog: MatDialog = inject(MatDialog);

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
      .subscribe((modalResponse: any) => {});
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
}
