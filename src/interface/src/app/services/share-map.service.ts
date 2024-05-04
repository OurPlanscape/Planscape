import { Inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BackendConstants } from '../backend-constants';
import { HttpClient } from '@angular/common/http';
import { WINDOW } from './window.service';
import { MapConfig, MapViewOptions, Region } from '@types';

interface ViewState {
  mapViewOptions: MapViewOptions | null;
  mapConfig: MapConfig[];
  region: Region;
}

interface CreatedLink {
  created_at: string;
  link_code: string;
  updated_at: string;
  user_id?: string;
  view_state: ViewState;
}

@Injectable({
  providedIn: 'root',
})
export class ShareMapService {
  constructor(
    private http: HttpClient,
    @Inject(WINDOW) private readonly window: Window
  ) {}

  getSharedLink(mapData: ViewState): Observable<string> {
    const origin = this.window.location.origin;
    return this.createShareLink(mapData).pipe(
      map((createdLink) => origin + '/map?link=' + createdLink.link_code)
    );
  }

  createShareLink(mapData: ViewState): Observable<CreatedLink> {
    return this.http.post<CreatedLink>(
      BackendConstants.END_POINT + '/planning/create_link/',
      {
        view_state: mapData,
      },
      { withCredentials: true }
    );
  }

  getMapDataFromLink(link: string) {
    return this.loadSharedLink(link).pipe(map((data) => data.view_state));
  }

  loadSharedLink(link: string) {
    return this.http.get<CreatedLink>(
      BackendConstants.END_POINT.concat('/planning/shared_link/', link),
      { withCredentials: true }
    );
  }
}
