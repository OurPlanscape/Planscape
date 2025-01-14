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

@Injectable({
  providedIn: 'root',
})
export abstract class BaseNotesService {
  constructor(protected http: HttpClient) {}
  protected abstract baseUrl: string;
  protected resource = '/note/';

  getNotes(objectId: string | number) {
    objectId = objectId.toString();
    return this.http.get<Note[]>(
      environment.backend_endpoint.concat(
        this.baseUrl,
        objectId,
        this.resource
      ),
      {
        withCredentials: true,
      }
    );
  }

  addNote(objectId: string | number, noteContent: string | number) {
    objectId = objectId.toString();
    return this.http.post<Note>(
      environment.backend_endpoint.concat(
        this.baseUrl,
        objectId,
        this.resource
      ),
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
      environment.backend_endpoint.concat(
        this.baseUrl,
        objectId,
        this.resource,
        noteId
      ),
      {
        withCredentials: true,
      }
    );
  }
}

@Injectable()
export class PlanningAreaNotesService extends BaseNotesService {
  protected baseUrl = '/planning/planning_area/';
}
@Injectable()
export class ProjectAreaNotesService extends BaseNotesService {
  protected baseUrl = '/v2/project-areas/';
}
@Injectable()
export class TreatmentPlanNotesService extends BaseNotesService {
  protected baseUrl = '/v2/treatment_plans/';
}
