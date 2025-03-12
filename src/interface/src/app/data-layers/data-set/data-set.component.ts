import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SearchResult } from '@types';
import { ButtonComponent } from '@styleguide';
import { MatRadioModule } from '@angular/material/radio';

@Component({
  selector: 'app-data-set',
  standalone: true,
  imports: [NgForOf, MatIconModule, ButtonComponent, NgIf, MatRadioModule],
  templateUrl: './data-set.component.html',
  styleUrl: './data-set.component.scss',
})
export class DataSetComponent {
  @Input() name = '';
  @Input() organizationName = '';
  @Input() layers?: SearchResult[];
  @Input() path?: string[];

  @Output() selectDataset = new EventEmitter();
}
