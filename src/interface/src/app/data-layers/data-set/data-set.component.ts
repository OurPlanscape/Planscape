import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SearchResult } from '@types';
import { ButtonComponent, HighlighterDirective } from '@styleguide';
import { MatRadioModule } from '@angular/material/radio';

@Component({
  selector: 'app-data-set',
  standalone: true,
  imports: [
    NgForOf,
    MatIconModule,
    ButtonComponent,
    NgIf,
    MatRadioModule,
    HighlighterDirective,
  ],
  templateUrl: './data-set.component.html',
  styleUrl: './data-set.component.scss',
})
export class DataSetComponent {
  @Input() name = '';
  @Input() organizationName = '';
  @Input() layers?: SearchResult[];
  @Input() path?: string[];
  @Input() searchTerm = '';

  @Output() selectDataset = new EventEmitter<void>();
}
