import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { CreateWorkspacePayload, Workspace } from '@types';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * TODO: mocked until the backend endpoints exist.
 */
@Injectable({
  providedIn: 'root',
})
export class WorkspacesService {
  private readonly mockLatency = 600;

  createWorkspace(payload: CreateWorkspacePayload): Observable<Workspace> {
    const workspace: Workspace = {
      id: this.mockId(),
      name: payload.name,
      creator: '',
      created_at: new Date().toISOString(),
    };

    return of(workspace).pipe(delay(this.mockLatency));
  }

  getWorkspace(id: number): Observable<Workspace> {
    // Mocking an error
    if (id === 404) {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            statusText: 'Not Found',
            error: {
              detail: 'Workspace not found',
            },
          })
      ).pipe(delay(this.mockLatency));
    }

    // Mocking a workspace
    const workspace: Workspace = {
      id,
      name: 'Mock Workspace',
      creator: 'Han Solo',
      created_at: new Date().toISOString(),
    };

    return of(workspace).pipe(delay(this.mockLatency));
  }

  private mockId(): number {
    return Math.floor(Math.random() * 100000);
  }
}
