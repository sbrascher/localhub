import { Injectable } from '@angular/core';
import {
  CoverSelection,
  CreateProjectInput,
  DbConfig,
  DbSwitchResult,
  GitInspectionResult,
  Project,
  UpdateProjectInput,
} from '../models/project.model';

interface ElectronAPIWindow {
  listProjects: () => Promise<Project[]>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  updateProject: (id: string, input: UpdateProjectInput) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  refreshProjectGit: (id: string) => Promise<Project | null>;
  refreshAllGit: () => Promise<Project[]>;
  inspectDirectory: (dirPath: string) => Promise<GitInspectionResult>;
  selectDirectory: () => Promise<string | null>;
  selectCoverImage: () => Promise<CoverSelection | null>;
  openInExplorer: (dirPath: string) => Promise<boolean>;
  openInVSCode: (dirPath: string) => Promise<boolean>;
  getDbConfig: () => Promise<DbConfig>;
  selectDbFolder: () => Promise<DbSwitchResult | null>;
  selectDbFile: () => Promise<DbSwitchResult | null>;
  resetDbPath: () => Promise<DbSwitchResult>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPIWindow;
  }
}

@Injectable({ providedIn: 'root' })
export class ElectronBridgeService {
  private get api(): ElectronAPIWindow | null {
    return window.electronAPI ?? null;
  }

  get isElectron(): boolean {
    return this.api !== null;
  }

  async listProjects(): Promise<Project[]> {
    if (!this.api) return [];
    return this.api.listProjects();
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    if (!this.api) {
      throw new Error('Electron API indisponível fora do aplicativo desktop.');
    }
    return this.api.createProject(input);
  }

  async updateProject(id: string, input: UpdateProjectInput): Promise<Project | null> {
    if (!this.api) {
      throw new Error('Electron API indisponível fora do aplicativo desktop.');
    }
    return this.api.updateProject(id, input);
  }

  async deleteProject(id: string): Promise<boolean> {
    if (!this.api) return false;
    return this.api.deleteProject(id);
  }

  async refreshProjectGit(id: string): Promise<Project | null> {
    if (!this.api) return null;
    return this.api.refreshProjectGit(id);
  }

  async refreshAllGit(): Promise<Project[]> {
    if (!this.api) return [];
    return this.api.refreshAllGit();
  }

  async inspectDirectory(dirPath: string): Promise<GitInspectionResult> {
    if (!this.api) {
      return {
        exists: false,
        hasLocalGit: false,
        hasRemoteGit: false,
        remoteUrl: null,
        branch: null,
        isDirty: false,
      };
    }
    return this.api.inspectDirectory(dirPath);
  }

  async selectDirectory(): Promise<string | null> {
    if (!this.api) return null;
    return this.api.selectDirectory();
  }

  async selectCoverImage(): Promise<CoverSelection | null> {
    if (!this.api) return null;
    return this.api.selectCoverImage();
  }

  async openInExplorer(dirPath: string): Promise<boolean> {
    if (!this.api) return false;
    return this.api.openInExplorer(dirPath);
  }

  async openInVSCode(dirPath: string): Promise<boolean> {
    if (!this.api) return false;
    return this.api.openInVSCode(dirPath);
  }

  async getDbConfig(): Promise<DbConfig> {
    if (!this.api) {
      return { dbPath: '', defaultDbPath: '', isCustom: false };
    }
    return this.api.getDbConfig();
  }

  async selectDbFolder(): Promise<DbSwitchResult | null> {
    if (!this.api) return null;
    return this.api.selectDbFolder();
  }

  async selectDbFile(): Promise<DbSwitchResult | null> {
    if (!this.api) return null;
    return this.api.selectDbFile();
  }

  async resetDbPath(): Promise<DbSwitchResult | null> {
    if (!this.api) return null;
    return this.api.resetDbPath();
  }
}
