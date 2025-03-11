import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DataSetSearchResult } from '@types';
import { ButtonComponent } from '@styleguide';

@Component({
  selector: 'app-data-set',
  standalone: true,
  imports: [NgForOf, MatIconModule, ButtonComponent, NgIf],
  templateUrl: './data-set.component.html',
  styleUrl: './data-set.component.scss',
})
export class DataSetComponent {
  @Input() name = '';
  @Input() organizationName = '';
  @Input() layers?: DataSetSearchResult[];
  @Input() path?: string[];

  @Output() selectDataset = new EventEmitter();
}
