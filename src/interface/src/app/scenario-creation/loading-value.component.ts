import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-value',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <mat-spinner
      *ngIf="value === null"
      [diameter]="spinnerDiameter"></mat-spinner>
    <ng-container *ngIf="value !== null">
      {{ (value | number: format) || '--' }}{{ unit ? ' ' + unit : '' }}
    </ng-container>
  `,
})
export class LoadingValueComponent {
  @Input() value: number | null = null;
  @Input() format = '1.0-2';
  @Input() unit = 'acres';
  @Input() spinnerDiameter = 16;
}
