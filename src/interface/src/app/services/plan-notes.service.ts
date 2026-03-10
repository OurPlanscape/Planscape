import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { switchMap, shareReplay, tap } from 'rxjs/operators';

export interface Note {
  id: number;
  user_id: number;
  user_name: string;
  content: string;
  created_at: string;
  can_delete?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PlanNotesService {
  private _notes$: BehaviorSubject<Note[]> = new BehaviorSubject<Note[]>([]);
  public notes$: Observable<Note[]> = this._notes$.asObservable();

  constructor(private http: HttpClient) {}

  getNotes(planningAreaId: number): Observable<Note[]> {
    return this.http
      .get<Note[]>(
        environment.backend_endpoint.concat(
          `/planning/planning_area/${planningAreaId}/note`
        ),
        {
          withCredentials: true,
        }
      )
      .pipe(
        shareReplay(1),
        tap((notes: Note[]) => {
          this._notes$.next(notes);
        })
      );
  }

  addNote(planningAreaId: number, noteContent: string): Observable<Note[]> {
    return this.http
      .post<Note>(
        environment.backend_endpoint.concat(
          `/planning/planning_area/${planningAreaId}/note`
        ),
        { content: noteContent },
        {
          withCredentials: true,
        }
      )
      .pipe(switchMap(() => this.getNotes(planningAreaId)));
  }

  deleteNote(planningAreaId: number, noteId: number): Observable<Note[]> {
    return this.http
      .delete<Note>(
        environment.backend_endpoint.concat(
          `/planning/planning_area/${planningAreaId}/note/${noteId}`
        ),
        {
          withCredentials: true,
        }
      )
      .pipe(
        switchMap(() => this.getNotes(planningAreaId)) // Refresh the notes after deletion and return the notes array
      );
  }
}
