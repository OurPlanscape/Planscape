import { DatePipe, DecimalPipe, NgForOf, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ButtonComponent } from '@styleguide/button/button.component';

export interface CardDetails {
  icon: string;
  label: string;
  value: string;
}

@Component({
  selector: 'sg-details-card',
  standalone: true,
  imports: [
    MatIconModule,
    NgForOf,
    NgIf,
    DatePipe,
    DecimalPipe,
    MatProgressSpinnerModule,
    ButtonComponent,
  ],
  templateUrl: './details-card.component.html',
  styleUrl: './details-card.component.scss',
})
export class DetailsCardComponent {
  @Input() creator: string = '';
  @Input() acres: number | null = null;
  @Input() created_at: string = '';
  @Input() planning_area_name: string = '';

  @Input() cardTitle: string = '';
  @Input() subtitle: string = '';
  @Input() details: CardDetails[] | null = [];

  @Input() loading: boolean = false;
  @Input() canShare: Boolean = false;

  @Output() share = new EventEmitter<void>();
}
