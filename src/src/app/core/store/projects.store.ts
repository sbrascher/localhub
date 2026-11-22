import { computed, inject, Injectable, signal } from '@angular/core';
import {
  CreateProjectInput,
  DbConfig,
  GitFilter,
  Project,
  UpdateProjectInput,
} from '../models/project.model';
import { ElectronBridgeService } from '../services/electron-bridge.service';

@Injectable({ providedIn: 'root' })
export class ProjectsStore {
  private readonly bridge = inject(ElectronBridgeService);

  readonly projects = signal<Project[]>([]);
  readonly loading = signal(false);
  readonly refreshingAll = signal(false);
  readonly searchQuery = signal('');
  readonly gitFilter = signal<GitFilter>('all');
  readonly dbConfig = signal<DbConfig>({ dbPath: '', defaultDbPath: '', isCustom: false });

  readonly stats = computed(() => {
    const list = this.projects();
    const total = list.length;
    const withRemote = list.filter((p) => p.hasLocalGit && p.hasRemoteGit).length;
    const localOnly = list.filter((p) => p.hasLocalGit && !p.hasRemoteGit).length;
    const withoutGit = list.filter((p) => !p.hasLocalGit).length;

    return { total, withRemote, localOnly, withoutGit };
  });

  readonly filteredProjects = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const filter = this.gitFilter();

    return this.projects().filter((project) => {
      if (filter === 'remote' && !(project.hasLocalGit && project.hasRemoteGit)) return false;
      if (filter === 'local-only' && !(project.hasLocalGit && !project.hasRemoteGit)) return false;
      if (filter === 'none' && project.hasLocalGit) return false;

      if (!query) return true;
      const haystack = [
        project.name,
        project.description ?? '',
        project.directoryPath,
        project.gitBranch ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  });

  async loadProjects(): Promise<void> {
    this.loading.set(true);
    try {
      const items = await this.bridge.listProjects();
      this.projects.set(items);
    } finally {
      this.loading.set(false);
    }
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    const created = await this.bridge.createProject(input);
    this.projects.update((list) => [created, ...list]);
    return created;
  }

  async updateProject(id: string, input: UpdateProjectInput): Promise<Project | null> {
    const updated = await this.bridge.updateProject(id, input);
    if (updated) {
      this.projects.update((list) => list.map((item) => (item.id === id ? updated : item)));
    }
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    const ok = await this.bridge.deleteProject(id);
    if (ok) {
      this.projects.update((list) => list.filter((item) => item.id !== id));
    }
  }

  async refreshProjectGit(id: string): Promise<void> {
    const updated = await this.bridge.refreshProjectGit(id);
    if (updated) {
      this.projects.update((list) => list.map((item) => (item.id === id ? updated : item)));
    }
  }

  async refreshAllGit(): Promise<void> {
    this.refreshingAll.set(true);
    try {
      const updated = await this.bridge.refreshAllGit();
      this.projects.set(updated);
    } finally {
      this.refreshingAll.set(false);
    }
  }

  async loadDbConfig(): Promise<void> {
    const cfg = await this.bridge.getDbConfig();
    this.dbConfig.set(cfg);
  }

  async selectDbFolder(): Promise<boolean> {
    const res = await this.bridge.selectDbFolder();
    if (!res) return false;
    this.dbConfig.set({
      dbPath: res.dbPath,
      defaultDbPath: res.defaultDbPath,
      isCustom: res.isCustom,
    });
    this.projects.set(res.projects);
    return true;
  }

  async selectDbFile(): Promise<boolean> {
    const res = await this.bridge.selectDbFile();
    if (!res) return false;
    this.dbConfig.set({
      dbPath: res.dbPath,
      defaultDbPath: res.defaultDbPath,
      isCustom: res.isCustom,
    });
    this.projects.set(res.projects);
    return true;
  }

  async resetDbPath(): Promise<boolean> {
    const res = await this.bridge.resetDbPath();
    if (!res) return false;
    this.dbConfig.set({
      dbPath: res.dbPath,
      defaultDbPath: res.defaultDbPath,
      isCustom: res.isCustom,
    });
    this.projects.set(res.projects);
    return true;
  }
}
