import { Component, Input, OnInit } from '@angular/core';
//import { FormMessageType } from '../../types/data.types';

@Component({
  selector: 'app-form-message',
  templateUrl: './form-message-box.component.html',
  styleUrls: ['./form-message-box.component.scss'],
})

// export const responseBoxTypes: FormResponse[] = [
//   FormResponse.ERROR,
//   FormResponse.WARNING,
//   FormResponse.ALERT,
//   FormResponse.INFO,
//   FormResponse.SUCCESS,
// ];
export class FormMessageBoxComponent implements OnInit {
  @Input() title!: string;
  @Input() message?: string;
  @Input() showMessage: boolean = false;
  //@Input() messageType: FormMessageType = FormMessageType.ALERT;
  @Input() messageType: String = '';

  constructor() {}

  getMessageIcon(): string {
    switch (this.messageType) {
      case 'ALERT':
        return 'assets/svg/icons/exclamation-square-fill.svg';
      case 'ERROR':
        return 'assets/svg/icons/warning-icon-fill.svg';
      case 'SUCCESS':
        return 'assets/svg/icons/checkmark-round-fill.svg';
      default: // assume error
        return 'assets/svg/icons/warning-icon-fill.svg'; // No class if inputValue doesn't match any case
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
        return 'error';
    }
  }

  ngOnInit(): void {
    // This code will subscribe to the event emitted by the parent component
    console.log('we got inited?');
  }
}
