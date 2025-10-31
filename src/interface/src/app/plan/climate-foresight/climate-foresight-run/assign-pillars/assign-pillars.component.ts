import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SectionComponent, ButtonComponent } from '@styleguide';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';

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
  ],
  templateUrl: './assign-pillars.component.html',
  styleUrl: './assign-pillars.component.scss',
})
export class AssignPillarsComponent {
  placeholderUnassigneddataLayers = [
    { title: 'Probability of High Severity Fire' },
    { title: 'Wildlife Species Richness' },
  ];
  placeholderGroups: {
    title: string;
    isOpen?: boolean;
    dataLayers: { title: string }[];
  }[] = [
    {
      title: 'Air Quality',
      dataLayers: [
        { title: 'Potential Total Smoke Production' },
        { title: 'Potential Avoided Smoke Production' },
        { title: 'Heavy Fuel Load' },
      ],
    },
    {
      title: 'Carbon Sequestration',
      dataLayers: [
        { title: 'Large Tree Carbon' },
        { title: 'Dead and Down Carbon' },
        { title: 'Total Carbon (F3)' },
      ],
    },
    {
      title: 'Fire-Adapted Communities',
      dataLayers: [],
    },
    {
      title: 'Forest Resilience',
      dataLayers: [],
    },
  ];

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
}
