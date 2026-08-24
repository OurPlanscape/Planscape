import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateWorkspacePayload,
  Pagination,
  UpdateWorkspacePayload,
  Workspace,
} from '@types';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class WorkspacesService {
  readonly v2Path = environment.backend_endpoint + '/v2/workspaces/';

  constructor(private http: HttpClient) {}

  listWorkspaces(search?: string): Observable<Pagination<Workspace>> {
    const params: Record<string, string> = {};
    if (search) {
      params['search'] = search;
    }
    return this.http.get<Pagination<Workspace>>(this.v2Path, {
      withCredentials: true,
      params,
    });
  }

  getWorkspace(id: number): Observable<Workspace> {
    return this.http.get<Workspace>(`${this.v2Path}${id}/`, {
      withCredentials: true,
    });
  }

  createWorkspace(payload: CreateWorkspacePayload): Observable<Workspace> {
    return this.http.post<Workspace>(this.v2Path, payload, {
      withCredentials: true,
    });
  }

  updateWorkspace(
    id: number,
    payload: UpdateWorkspacePayload
  ): Observable<Workspace> {
    return this.http.patch<Workspace>(`${this.v2Path}${id}/`, payload, {
      withCredentials: true,
    });
  }

  deleteWorkspace(id: number): Observable<void> {
    return this.http.delete<void>(`${this.v2Path}${id}/`, {
      withCredentials: true,
    });
  }
}
