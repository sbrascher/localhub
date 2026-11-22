import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  listProjects: () => Promise<unknown[]>;
  createProject: (input: unknown) => Promise<unknown>;
  updateProject: (id: string, input: unknown) => Promise<unknown>;
  deleteProject: (id: string) => Promise<boolean>;
  refreshProjectGit: (id: string) => Promise<unknown>;
  refreshAllGit: () => Promise<unknown[]>;
  inspectDirectory: (dirPath: string) => Promise<unknown>;
  selectDirectory: () => Promise<string | null>;
  selectCoverImage: () => Promise<{ filePath: string; previewDataUrl: string } | null>;
  openInExplorer: (dirPath: string) => Promise<boolean>;
  openInVSCode: (dirPath: string) => Promise<boolean>;
  getDbConfig: () => Promise<{ dbPath: string; defaultDbPath: string; isCustom: boolean }>;
  selectDbFolder: () => Promise<{ dbPath: string; defaultDbPath: string; isCustom: boolean; projects: unknown[] } | null>;
  selectDbFile: () => Promise<{ dbPath: string; defaultDbPath: string; isCustom: boolean; projects: unknown[] } | null>;
  resetDbPath: () => Promise<{ dbPath: string; defaultDbPath: string; isCustom: boolean; projects: unknown[] }>;
}

const api: ElectronAPI = {
  listProjects: () => ipcRenderer.invoke('projects:list'),
  createProject: (input) => ipcRenderer.invoke('projects:create', input),
  updateProject: (id, input) => ipcRenderer.invoke('projects:update', id, input),
  deleteProject: (id) => ipcRenderer.invoke('projects:delete', id),
  refreshProjectGit: (id) => ipcRenderer.invoke('projects:refresh-git', id),
  refreshAllGit: () => ipcRenderer.invoke('projects:refresh-all-git'),
  inspectDirectory: (dirPath) => ipcRenderer.invoke('git:inspect-directory', dirPath),
  selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  selectCoverImage: () => ipcRenderer.invoke('dialog:select-cover'),
  openInExplorer: (dirPath) => ipcRenderer.invoke('shell:open-explorer', dirPath),
  openInVSCode: (dirPath) => ipcRenderer.invoke('shell:open-vscode', dirPath),
  getDbConfig: () => ipcRenderer.invoke('settings:get-db-config'),
  selectDbFolder: () => ipcRenderer.invoke('settings:select-db-folder'),
  selectDbFile: () => ipcRenderer.invoke('settings:select-db-file'),
  resetDbPath: () => ipcRenderer.invoke('settings:reset-db-path'),
};

contextBridge.exposeInMainWorld('electronAPI', api);
