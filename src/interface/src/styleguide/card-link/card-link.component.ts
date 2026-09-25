import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type CardLinkHeight = 'normal' | 'tall' | 'xxl';

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
  @Input() height: CardLinkHeight = 'normal';
  @Input() collapseContentOnSmall = true;
  @Output() navigate = new EventEmitter();

  @HostBinding('class.tall')
  get isTall() {
    return this.height === 'tall';
  }

  @HostBinding('class.xxl')
  get isXxl() {
    return this.height === 'xxl';
  }

  @HostBinding('class.collapseHeight')
  get shouldCollapseContentOnSmall() {
    return this.collapseContentOnSmall;
  }
}
