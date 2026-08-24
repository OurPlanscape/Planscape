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

export interface CreateWorkspacePayload {
  name: string;
}

export interface UpdateWorkspacePayload {
  name: string;
}
