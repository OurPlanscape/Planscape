// shape TODO
export interface Workspace {
  id: number;
  name: string;
  creator: string;
  created_at: string;
}

export interface CreateWorkspacePayload {
  name: string;
}
