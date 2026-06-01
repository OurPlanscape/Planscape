import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'sg-message-card',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './message-card.component.html',
  styleUrl: './message-card.component.scss',
})
export class MessageCardComponent {
  @Input() cardTitle: string = '';
  @Input() cardType: 'warning' | 'error' = 'warning';
}
