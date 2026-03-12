import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '@styleguide/button/button.component';

@Component({
  selector: 'sg-action-card',
  standalone: true,
  imports: [ButtonComponent, MatCardModule, MatIconModule, NgIf],
  templateUrl: './action-card.component.html',
  styleUrl: './action-card.component.scss',
})
export class ActionCardComponent {
  /* Mat Icon */
  @Input() icon: string = '';

  /* path to local svg icon */
  @Input() svgIcon: string = '';

  @Input() title: string = 'Action Card';

  @Input() description: string = '';

  @Input() buttonText: string = 'Click';

  @Input() buttonIcon: string = '';

  @Output() buttonClick = new EventEmitter<Event>();

  handleClick(e: Event) {
    this.buttonClick.emit(e);
  }
}
