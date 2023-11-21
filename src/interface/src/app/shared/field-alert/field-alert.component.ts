import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-field-alert',
  templateUrl: './field-alert.component.html',
  styleUrls: ['./field-alert.component.scss'],
})
export class FieldAlertComponent implements OnInit {
  @Input() visible: boolean = false;
  @Input() message!: string;
  @Input() title!: string;

  constructor() {}

  ngOnInit(): void {
    if (this.message) {
      this.visible = true;
    }
  }
}
