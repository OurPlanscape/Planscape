import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { environment } from '@env/environment';
import {
  Pagination,
  WorkspaceDataLayer,
  WorkspaceDataLayerCreated,
  WorkspaceDataLayerDetail,
  WorkspaceDataLayerUpdate,
} from '@types';
import { filter, map, Observable } from 'rxjs';

export const DATALAYER_UPLOAD_MIMETYPE = 'image/tiff';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceDataLayersService {
  constructor(private http: HttpClient) {}

  listDataLayers(workspaceId: number, limit: number, offset: number) {
    return this.http.get<Pagination<WorkspaceDataLayer>>(
      this.path(workspaceId),
      { params: { limit, offset }, withCredentials: true }
    );
  }

  createUpload(
    workspaceId: number,
    body: { name: string; original_name: string; size: number }
  ) {
    return this.http.post<WorkspaceDataLayerCreated>(
      this.path(workspaceId),
      body,
      { withCredentials: true }
    );
  }

  getDataLayer(workspaceId: number, dataLayerId: number) {
    return this.http.get<WorkspaceDataLayerDetail>(
      `${this.path(workspaceId)}${dataLayerId}/`,
      { withCredentials: true }
    );
  }

  updateDataLayer(
    workspaceId: number,
    dataLayerId: number,
    changes: WorkspaceDataLayerUpdate
  ) {
    return this.http.patch<WorkspaceDataLayerDetail>(
      `${this.path(workspaceId)}${dataLayerId}/`,
      changes,
      { withCredentials: true }
    );
  }

  deleteDataLayer(workspaceId: number, dataLayerId: number) {
    return this.http.delete<void>(`${this.path(workspaceId)}${dataLayerId}/`, {
      withCredentials: true,
    });
  }

  /** PUTs the file to the GCS upload session, emitting progress from 0 to 1. */
  uploadFile(uploadUrl: string, file: File): Observable<number> {
    return this.http
      .put(uploadUrl, file, {
        headers: { 'Content-Type': DATALAYER_UPLOAD_MIMETYPE },
        reportProgress: true,
        observe: 'events',
      })
      .pipe(
        filter(
          (event) =>
            event.type === HttpEventType.UploadProgress ||
            event.type === HttpEventType.Response
        ),
        map((event) =>
          event.type === HttpEventType.UploadProgress && event.total
            ? event.loaded / event.total
            : event.type === HttpEventType.Response
              ? 1
              : 0
        )
      );
  }

  /** A DELETE that outlives the page, for discarding an upload on unload. */
  discardOnUnload(workspaceId: number, dataLayerId: number) {
    fetch(`${this.path(workspaceId)}${dataLayerId}/`, {
      method: 'DELETE',
      credentials: 'include',
      keepalive: true,
    }).catch(() => undefined);
  }

  private path(workspaceId: number) {
    return `${environment.backend_endpoint}/v2/workspaces/${workspaceId}/datalayers/`;
  }
}
