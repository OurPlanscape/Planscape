import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NgIf } from '@angular/common';

@Component({
  selector: 'sg-no-results',
  standalone: true,
  imports: [MatIconModule, NgIf],
  templateUrl: './no-results.component.html',
  styleUrl: './no-results.component.scss',
})
export class NoResultsComponent {
  @Input() searchString = '';
}
