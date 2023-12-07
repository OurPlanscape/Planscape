import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-field-alert',
  templateUrl: './field-alert.component.html',
  styleUrls: ['./field-alert.component.scss'],
})
export class FieldAlertComponent {
  @Input() visible: boolean = false;
  @Input() message!: string;
  @Input() title!: string;

  constructor() {}
}
