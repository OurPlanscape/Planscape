import { DatePipe, DecimalPipe, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Plan } from '@app/types';

@Component({
  selector: 'app-planning-area-details-card',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MatIconModule, NgIf],
  templateUrl: './planning-area-details-card.component.html',
  styleUrl: './planning-area-details-card.component.scss',
})
export class PlanningAreaDetailsCardComponent {
  @Input() plan: Plan | null = null;
}
