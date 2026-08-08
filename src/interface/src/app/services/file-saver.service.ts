import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FileSaverService {
  constructor(private http: HttpClient) {}

  async loadFileSaver() {
    const { default: saveAs } = await import('file-saver');
    return saveAs;
  }

  async saveAs(data: Blob | string, filename?: string) {
    const saveAs = await this.loadFileSaver();
    saveAs(data, filename);
  }

  downloadGeopackage(geoPackageUrl: string): Observable<any> {
    return this.http.get(geoPackageUrl, {
      responseType: 'arraybuffer',
    });
  }
}
