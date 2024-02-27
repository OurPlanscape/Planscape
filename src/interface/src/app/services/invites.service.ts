import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BackendConstants } from '../backend-constants';

export type INVITE_ROLE = 'Viewer' | 'Collaborator' | 'Owner';

@Injectable({
  providedIn: 'root',
})
export class InvitesService {
  constructor(private http: HttpClient) {}

  inviteUsers(
    emails: string[],
    role: INVITE_ROLE,
    planningAreaId: number,
    message: string
  ) {
    return this.http.post<any>(
      BackendConstants.END_POINT.concat('/invites/create_invite/'),
      {
        emails,
        role,
        message: message || null,
        object_pk: planningAreaId,
      },
      {
        withCredentials: true,
      }
    );
  }
}
