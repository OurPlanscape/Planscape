import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-horizonal-card',
  templateUrl: './horizonal-card.component.html',
  styleUrls: ['./horizonal-card.component.scss'],
})
export class HorizonalCardComponent {
  @Input() title: string = '';
  @Input() content: string = '';
  @Input() iconsrc: string = '';

  constructor() {}
}
