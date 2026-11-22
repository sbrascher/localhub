export interface Project {
  id: string;
  name: string;
  description: string | null;
  directoryPath: string;
  coverFileName: string | null;
  coverUrl: string | null;
  hasLocalGit: boolean;
  hasRemoteGit: boolean;
  remoteUrl: string | null;
  gitBranch: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string | null;
  directoryPath: string;
  coverSourcePath?: string | null;
  hasLocalGit: boolean;
  hasRemoteGit: boolean;
  remoteUrl?: string | null;
  gitBranch?: string | null;
}

export interface UpdateProjectInput {
  name: string;
  description?: string | null;
  directoryPath: string;
  coverSourcePath?: string | null;
  removeCover?: boolean;
  hasLocalGit: boolean;
  hasRemoteGit: boolean;
  remoteUrl?: string | null;
  gitBranch?: string | null;
}

export interface GitInspectionResult {
  exists: boolean;
  hasLocalGit: boolean;
  hasRemoteGit: boolean;
  remoteUrl: string | null;
  branch: string | null;
  isDirty: boolean;
}

export type GitFilter = 'all' | 'remote' | 'local-only' | 'none';

export interface CoverSelection {
  filePath: string;
  previewDataUrl: string;
}

export interface DbConfig {
  dbPath: string;
  defaultDbPath: string;
  isCustom: boolean;
}

export interface DbSwitchResult extends DbConfig {
  projects: Project[];
}
