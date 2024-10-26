import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface Note {
  id: number;
  user_id: number;
  user_name: string;
  content: string;
  created_at: string;
  can_delete?: boolean;
}

export type NotesModelName = 'planning_area' | 'project_area';

export interface INotesService {
  getNotes(objectId: string | number): Observable<Note[]>;
  addNote(objectId: string | number, noteContent: string): Observable<Note>;
  deleteNote(
    objectId: string | number,
    noteId: string | number
  ): Observable<Note>;
}

@Injectable({
  providedIn: 'root',
})
export abstract class BaseNotesService implements INotesService {
  constructor(private http: HttpClient) {}

  protected abstract multipleUrl: (objectId: string) => string;
  protected abstract singleUrl: (objectId: string, noteId: string) => string;
  protected abstract modelName: NotesModelName;

  getNotes(objectId: string | number) {
    objectId = objectId.toString();
    return this.http.get<Note[]>(
      environment.backend_endpoint.concat(this.multipleUrl(objectId)),
      {
        withCredentials: true,
      }
    );
  }

  addNote(objectId: string | number, noteContent: string | number) {
    objectId = objectId.toString();
    return this.http.post<Note>(
      environment.backend_endpoint.concat(this.multipleUrl(objectId)),
      { content: noteContent },
      {
        withCredentials: true,
      }
    );
  }

  deleteNote(objectId: string | number, noteId: string | number) {
    objectId = objectId.toString();
    noteId = noteId.toString();
    return this.http.delete<Note>(
      environment.backend_endpoint.concat(this.singleUrl(objectId, noteId)),
      {
        withCredentials: true,
      }
    );
  }
}

@Injectable()
export class PlanningAreaNotesService extends BaseNotesService {
  protected modelName: NotesModelName = 'planning_area';
  protected multipleUrl = (objectId: string) =>
    `/planning/planning_area/${objectId}/note`;
  protected singleUrl = (objectId: string, noteId: string) =>
    `/planning/planning_area/${objectId}/note/${noteId}`;
}
@Injectable()
export class ProjectAreaNotesService extends BaseNotesService {
  protected modelName: NotesModelName = 'planning_area';
  protected multipleUrl = (objectId: string) =>
    `/project_area_note/${objectId}/note`;
  protected singleUrl = (objectId: string, noteId: string) =>
    `/project_area_note/${objectId}/note/${noteId}`;
}
