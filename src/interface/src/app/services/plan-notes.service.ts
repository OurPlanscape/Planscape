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

export interface NoteModel {
  name: string;
  urlMultiple: (modelObjectId: number) => string;
  urlSingle: (modelObjectId: number, noteId: number) => string;
}

const noteModels: NoteModel[] = [
  {
    name: 'planning_area',
    urlMultiple: (planningAreaId: number) =>
      `/planning/planning_area/${planningAreaId}/note`,
    urlSingle: (planningAreaId: number, noteId: number) =>
      `/planning/planning_area/${planningAreaId}/note/${noteId}`,
  },
];

function getMultipleUrl(
  modelName: string,
  modelObjectId: number
): string | undefined {
  const model = noteModels.find((m) => m.name === modelName);
  return model ? model.urlMultiple(modelObjectId) : undefined;
}

function getSingleUrl(
  modelName: string,
  modelObjectId: number,
  noteId: number
): string | undefined {
  const model = noteModels.find((m) => m.name === modelName);
  return model ? model.urlSingle(modelObjectId, noteId) : undefined;
}

@Injectable({
  providedIn: 'root',
})
export class NotesService {
  constructor(private http: HttpClient) {}

  getNotes(modelName: string, objectId: number) {
    const url = getMultipleUrl(modelName, objectId);
    if (!url) {
      throw new Error(`Model ${modelName} not found`);
    }
    return this.http.get<Note[]>(environment.backend_endpoint.concat(url), {
      withCredentials: true,
    });
  }

  addNote(modelName: string, objectId: number, note: string) {
    const url = getMultipleUrl(modelName, objectId);
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

  deleteNote(modelName: string, objectId: number, noteId: number) {
    const url = getSingleUrl(modelName, objectId, noteId);
    if (!url) {
      throw new Error(`Model ${modelName} not found`);
    }
    return this.http.delete<Note>(environment.backend_endpoint.concat(url), {
      withCredentials: true,
    });
  }
}
