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

@Injectable({
  providedIn: 'root',
})
export class PlanNotesService {
  constructor(private http: HttpClient) {}

  getNotes(planningAreaId: number) {
    return this.http.get<Note[]>(
      environment.backend_endpoint.concat(
        `/planning/planning_area/${planningAreaId}/note`
      ),
      {
        withCredentials: true,
      }
    );
  }

  addNote(planningAreaId: number, note: string) {
    return this.http.post<Note>(
      environment.backend_endpoint.concat(
        `/planning/planning_area/${planningAreaId}/note`
      ),
      { content: note },
      {
        withCredentials: true,
      }
    );
  }

  deleteNote(planningAreaId: number, noteId: number) {
    return this.http.delete<Note>(
      environment.backend_endpoint.concat(
        `/planning/planning_area/${planningAreaId}/note/${noteId}`
      ),
      {
        withCredentials: true,
      }
    );
  }
}
