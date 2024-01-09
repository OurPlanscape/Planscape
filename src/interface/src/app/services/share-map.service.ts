import { Inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BackendConstants } from '../backend-constants';
import { HttpClient } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';

interface CreatedLink {
  created_at: string;
  link_code: string;
  updated_at: string;
  user_id?: string;
  view_state: any;
}

@Injectable({
  providedIn: 'root',
})
export class ShareMapService {
  constructor(
    private http: HttpClient,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  getSharedLink(mapData: any): Observable<string> {
    const origin = this.document.location.origin;
    return this.createShareLink(mapData).pipe(
      map((createdLink) => origin + '/map/' + createdLink.link_code)
    );
  }

  private createShareLink(mapData: any): Observable<CreatedLink> {
    return this.http.post<CreatedLink>(
      BackendConstants.END_POINT + '/planning/create_link/',
      {
        view_state: mapData,
      },
      { withCredentials: true }
    );
  }
}
