export interface Invite {
  id: number;
  inviter: number;
  object_pk: number;
  role: string;
  email: string;
  collaborator?: number;
  collaborator_name?: string;
}

export type INVITE_ROLE = 'Viewer' | 'Collaborator' | 'Owner';
