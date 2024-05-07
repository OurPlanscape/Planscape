import { Component, Input } from '@angular/core';
import { FormMessageType } from '@types';

@Component({
  selector: 'app-form-message',
  templateUrl: './form-message-box.component.html',
  styleUrls: ['./form-message-box.component.scss'],
})
export class FormMessageBoxComponent {
  @Input() title?: string | null;
  @Input() message?: string | null;
  @Input() messageType: FormMessageType = FormMessageType.ALERT;

  icons: Record<FormMessageType, string> = {
    [FormMessageType.SUCCESS]: 'assets/svg/icons/checkmark-round-fill.svg',
    [FormMessageType.ERROR]: 'assets/svg/icons/warning-icon-fill.svg',
    [FormMessageType.ALERT]: 'assets/svg/icons/exclamation-square-fill.svg',
  };

  boxClass: Record<FormMessageType, string> = {
    [FormMessageType.SUCCESS]: 'success',
    [FormMessageType.ERROR]: 'error',
    [FormMessageType.ALERT]: 'alert',
  };
}
