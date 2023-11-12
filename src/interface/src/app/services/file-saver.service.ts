import { Injectable } from '@angular/core';
import FileSaver from 'file-saver';

@Injectable({
  providedIn: 'root',
})
export class FileSaverService {
  constructor() {}

  saveAs(data: Blob | string, filename?: string) {
    FileSaver.saveAs(data, filename);
  }
}
