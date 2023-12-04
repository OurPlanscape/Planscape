import { Component, Input, OnInit } from '@angular/core';
//import { FormMessageType } from '../../types/data.types';

@Component({
  selector: 'app-form-message',
  templateUrl: './form-message-box.component.html',
  styleUrls: ['./form-message-box.component.scss'],
})
export class FormMessageBoxComponent implements OnInit {
  @Input() title!: string;
  @Input() message?: string;
  @Input() showMessage: boolean = false;
  @Input() messageType: string = '';

  constructor() {}

  getMessageIcon(): string {
    switch (this.messageType) {
      case 'ALERT':
        return 'assets/svg/icons/exclamation-square-fill.svg';
      case 'ERROR':
        return 'assets/svg/icons/warning-icon-fill.svg';
      case 'SUCCESS':
        return 'assets/svg/icons/checkmark-round-fill.svg';
      default: // alert is default
        return 'assets/svg/icons/exclamation-square-fill.svg';
    }
  }

  getBoxClass(): string {
    switch (this.messageType) {
      case 'ALERT':
        return 'alert';
      case 'ERROR':
        return 'error';
      case 'SUCCESS':
        return 'success';
      default:
        return 'alert';
    }
  }

  ngOnInit(): void {
    this.getBoxClass();
    this.getMessageIcon();
  }
}
