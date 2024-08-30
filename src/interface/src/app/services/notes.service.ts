import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
export interface Note {
  id: number;
  user_id: number;
  user_name: string;
  content: string;
  created_at: string;
  can_delete?: boolean;
}

export type NotesModelName = 'planning_area' | 'project_area';

export interface NoteModel {
  name: string;
  urlMultiple: (modelObjectId: number) => string;
  urlSingle: (modelObjectId: number, noteId: number) => string;
}

@Injectable({
  providedIn: 'root',
})
export abstract class BaseNotesService {
  constructor(private http: HttpClient) {}

  protected abstract multipleUrl: (objectId: number) => string;
  protected abstract singleUrl: (objectId: number, noteId: number) => string;
  protected abstract modelName: NotesModelName;

  getNotes(objectId: number) {
    return this.http.get<Note[]>(
      environment.backend_endpoint.concat(this.multipleUrl(objectId)),
      {
        withCredentials: true,
      }
    );
  }

  addNote(objectId: number, noteContent: string) {
    return this.http.post<Note>(
      environment.backend_endpoint.concat(this.multipleUrl(objectId)),
      { content: noteContent },
      {
        withCredentials: true,
      }
    );
  }

  deleteNote(objectId: number, noteId: number) {
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
  protected multipleUrl = (objectId: number) =>
    `/planning/planning_area/${objectId}/note`;
  protected singleUrl = (objectId: number, noteId: number) =>
    `/planning/planning_area/${objectId}/note/${noteId}`;
}
@Injectable()
export class ProjectAreaNotesService extends BaseNotesService {
  protected modelName: NotesModelName = 'planning_area';
  protected multipleUrl = (objectId: number) =>
    `/project_area_note/${objectId}/note`;
  protected singleUrl = (objectId: number, noteId: number) =>
    `/project_area_note/${objectId}/note/${noteId}`;
}
