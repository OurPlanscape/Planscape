import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FileSaverService {
  constructor() {}

  async saveAs(data: Blob | string, filename?: string) {
    const { default: saveAs } = await import('file-saver');
    saveAs(data, filename);
  }
}
