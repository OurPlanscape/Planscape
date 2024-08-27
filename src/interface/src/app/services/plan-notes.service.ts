import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Note {
  id: number;
  user_id: number;
  user_name: string;
  content: string;
  created_at: string;
}

export type NotesModelName = 'planning_area';

export interface NoteModel {
  name: string;
  urlMultiple: (modelObjectId: number) => string;
  urlSingle: (modelObjectId: number, noteId: number) => string;
}

const noteEndpoints: Record<
  NotesModelName,
  {
    multipleUrl: (objectId: number) => string;
    singleUrl: (objectId: number, noteId: number) => string;
  }
> = {
  planning_area: {
    multipleUrl: (objectId: number) =>
      `/planning/planning_area/${objectId}/note`,
    singleUrl: (objectId: number, noteId: number) =>
      `/planning/planning_area/${objectId}/note/${noteId}`,
  },
};

@Injectable({
  providedIn: 'root',
})
export class NotesService {
  constructor(private http: HttpClient) {}

  getNotes(modelName: NotesModelName, objectId: number) {
    const endpoints = noteEndpoints[modelName];
    const url = endpoints.multipleUrl(objectId);
    if (!url) {
      throw new Error(`Model ${modelName} not found`);
    }
    return this.http.get<Note[]>(environment.backend_endpoint.concat(url), {
      withCredentials: true,
    });
  }

  addNote(modelName: NotesModelName, objectId: number, note: string) {
    const endpoints = noteEndpoints[modelName];
    const url = endpoints.multipleUrl(objectId);
    if (!url) {
      throw new Error(`Model ${modelName} not found`);
    }
    return this.http.post<Note>(
      environment.backend_endpoint.concat(url),
      { content: note },
      {
        withCredentials: true,
      }
    );
  }

  deleteNote(modelName: NotesModelName, objectId: number, noteId: number) {
    const endpoints = noteEndpoints[modelName];
    const url = endpoints.multipleUrl(objectId);

    if (!url) {
      throw new Error(`Model ${modelName} not found`);
    }
    return this.http.delete<Note>(environment.backend_endpoint.concat(url), {
      withCredentials: true,
    });
  }
}
