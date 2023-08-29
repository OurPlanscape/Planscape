import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PopupService {
  constructor() {}

  makeDetailsPopup(data: any): string {
    return `` + `<div>Name: ${data}</div>`;
  }
}
