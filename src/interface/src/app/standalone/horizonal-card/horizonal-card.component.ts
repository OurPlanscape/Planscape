import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-horizonal-card',
  templateUrl: './horizonal-card.component.html',
  styleUrls: ['./horizonal-card.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class HorizonalCardComponent {
  @Input() title: string = '';
  @Input() content: string = '';
  @Input() iconsrc: string = '';
  @Input() outboundLink: string = '';

  constructor() {}

  handleClick() {
    window.open(this.outboundLink, '_blank');
  }
}
