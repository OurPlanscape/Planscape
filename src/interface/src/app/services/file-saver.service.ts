import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FileSaverService {
  constructor() {}

  async saveAs(data: Blob | string, filename?: string) {
    const FileSaver = await import('file-saver');
    FileSaver.saveAs(data, filename);
  }
}
