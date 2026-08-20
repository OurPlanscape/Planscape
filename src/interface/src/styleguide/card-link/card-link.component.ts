import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'sg-card-link',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './card-link.component.html',
  styleUrl: './card-link.component.scss',
})
export class CardLinkComponent {
  @Input() showFooter: boolean = true;
  @Input() label: string | null = null;
  @Input() subLabel: string | null = null;
  @Input() height: 'tall' | 'normal' = 'normal';
  @Output() navigate = new EventEmitter();

  @HostBinding('class.tall')
  get isTall() {
    return this.height === 'tall';
  }
}
