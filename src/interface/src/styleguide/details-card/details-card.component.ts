import { DatePipe, DecimalPipe, NgForOf, NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export interface CardDetails {
  icon: string;
  label: string;
  value: string;
}

@Component({
  selector: 'sg-details-card',
  standalone: true,
  imports: [MatIconModule, NgForOf, NgIf, DatePipe, DecimalPipe],
  templateUrl: './details-card.component.html',
  styleUrl: './details-card.component.scss',
})
export class DetailsCardComponent {
  @Input() creator: string = '';
  @Input() acres: number | null = null;
  @Input() created_at: string = '';
  @Input() planning_area_name: string = '';

  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() details: CardDetails[] | null = [];
}
