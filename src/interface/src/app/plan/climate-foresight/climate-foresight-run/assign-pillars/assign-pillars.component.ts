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
}
