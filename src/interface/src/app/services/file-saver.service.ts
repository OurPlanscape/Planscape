import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FileSaverService {
  async loadFileSaver() {
    const { default: saveAs } = await import('file-saver');
    return saveAs;
  }

  async saveAs(data: Blob | string, filename?: string) {
    const saveAs = await this.loadFileSaver();
    saveAs(data, filename);
  }
}
