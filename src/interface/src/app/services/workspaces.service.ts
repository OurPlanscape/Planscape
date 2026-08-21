import { Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { CreateWorkspacePayload, Workspace } from '@types';

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

  private mockId(): number {
    return Math.floor(Math.random() * 100000);
  }
}
