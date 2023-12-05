import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-horizonal-card',
  templateUrl: './horizonal-card.component.html',
  styleUrls: ['./horizonal-card.component.scss'],
})
export class HorizonalCardComponent {
  @Input() title: string = 'HELLO I AM A TITLE';
  @Input() content: string = '';
  @Input() icon: string = '';

  constructor() {}
}
