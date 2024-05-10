import { Component, Input } from '@angular/core';
import { FormMessageType } from '@types';

@Component({
  selector: 'app-field-alert',
  templateUrl: './field-alert.component.html',
  styleUrls: ['./field-alert.component.scss'],
})
export class FieldAlertComponent {
  @Input() message!: string | null;
  @Input() title!: string;
  @Input() messageType: FormMessageType = FormMessageType.ERROR;

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
