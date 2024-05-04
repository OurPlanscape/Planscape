import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BackendConstants } from '../backend-constants';
import { Invite, INVITE_ROLE } from '@types';

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

  getInvites(planningAreaId: number) {
    return this.http.get<Invite[]>(
      BackendConstants.END_POINT.concat(
        `/invites/invitations/planningarea/${planningAreaId}`
      ),
      {
        withCredentials: true,
      }
    );
  }

  changeRole(inviteId: number, newRole: INVITE_ROLE) {
    return this.http.patch<Invite>(
      BackendConstants.END_POINT.concat(`/invites/invitations/${inviteId}`),
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
      BackendConstants.END_POINT.concat(`/invites/invitations/${inviteId}`),
      {
        withCredentials: true,
      }
    );
  }
}
