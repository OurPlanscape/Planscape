import { Component, Input, OnInit } from '@angular/core';

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

  constructor() {}

  ngOnInit(): void {
    console.log('ok');
  }
}
