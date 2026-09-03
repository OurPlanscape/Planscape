export type WorkspaceRole = 'OWNER' | 'COLLABORATOR' | 'VIEWER';

export interface Workspace {
  id: number;
  name: string;
  /** Snapshot of the creator's name, static even if they leave the workspace. */
  creator: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  planning_areas_count: number;
  collaborators_count: number;
  role: WorkspaceRole | null;
  permissions: string[];
}

/** An accepted member has a `user_id`; a pending invite only has an email. */
export type WorkspaceMemberStatus = 'ACTIVE' | 'PENDING';

export interface WorkspaceMember {
  /** Access row id. The handle for pending invites, which have no user yet. */
  id: number;
  user_id: number | null;
  email: string;
  first_name: string;
  last_name: string;
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
}

export interface CreateWorkspacePayload {
  name: string;
}

export interface UpdateWorkspacePayload {
  name: string;
}
