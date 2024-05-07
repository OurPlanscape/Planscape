import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Invite, INVITE_ROLE } from '@types';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class InvitesService {
  constructor(private http: HttpClient) {}

  inviteUsers(
    emails: string[],
    role: INVITE_ROLE,
    planningAreaId: number,
    message?: string
  ) {
    return this.http.post<Invite>(
      environment.backend_endpoint.concat('/invites/create_invite/'),
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

  getInvites(planningAreaId: number) {
    return this.http.get<Invite[]>(
      environment.backend_endpoint.concat(
        `/invites/invitations/planningarea/${planningAreaId}`
      ),
      {
        withCredentials: true,
      }
    );
  }

  changeRole(inviteId: number, newRole: INVITE_ROLE) {
    return this.http.patch<Invite>(
      environment.backend_endpoint.concat(`/invites/invitations/${inviteId}`),
      {
        role: newRole,
      },
      {
        withCredentials: true,
      }
    );
  }

  deleteInvite(inviteId: number) {
    return this.http.delete<Invite[]>(
      environment.backend_endpoint.concat(`/invites/invitations/${inviteId}`),
      {
        withCredentials: true,
      }
    );
  }
}
