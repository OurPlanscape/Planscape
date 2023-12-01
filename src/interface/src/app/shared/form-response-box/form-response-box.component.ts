 import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-form-response-box',
  templateUrl: './form-response-box.component.html',
  styleUrls: ['./form-response-box.component.scss']
})

// export const responseBoxTypes: FormResponse[] = [
//   FormResponse.ERROR,
//   FormResponse.WARNING,
//   FormResponse.ALERT,
//   FormResponse.INFO,
//   FormResponse.SUCCESS,
// ];  
  
export class FormMessageBoxComponent implements {
  @Input() headingText!: string;
  @Input() detailsText!: string;
  @Input() boxStyle: string; // error, warning, alert, info, success
  @Input() visible: boolean;

  constructor() { }

}
