import { Component } from '@angular/core';
import { SectionComponent } from '@styleguide';
import { CommonModule } from '@angular/common';
import {  FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DataLayersComponent } from 'src/app/data-layers/data-layers/data-layers.component';
import { ChipSelectorComponent } from 'src/styleguide/chip-selector/chip-selector.component';

@Component({
  selector: 'app-custom-priority-objectives',
  standalone: true,
  imports: [ChipSelectorComponent, CommonModule, DataLayersComponent, SectionComponent, ReactiveFormsModule],
  templateUrl: './custom-priority-objectives.component.html',
  styleUrl: './custom-priority-objectives.component.scss'
})
export class CustomPriorityObjectivesComponent {
  form = new FormGroup({}); // keeping the inheritance happy
  selectionCount = 0;
  selectedItems = ['idk', 'something here'];
}
