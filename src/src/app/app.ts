import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import {
  CreateProjectInput,
  GitFilter,
  Project,
  UpdateProjectInput,
} from './core/models/project.model';
import { ElectronBridgeService } from './core/services/electron-bridge.service';
import { ProjectsStore } from './core/store/projects.store';
import { ProjectCardComponent } from './features/project-card/project-card.component';
import {
  ProjectDialogComponent,
  ProjectDialogResult,
} from './features/project-dialog/project-dialog.component';
import { SettingsDialogComponent } from './features/settings-dialog/settings-dialog.component';
import { SidebarRailComponent } from './shared/components/sidebar-rail/sidebar-rail.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DialogModule, SidebarRailComponent, ProjectCardComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  readonly store = inject(ProjectsStore);
  private readonly bridge = inject(ElectronBridgeService);
  private readonly dialog = inject(Dialog);

  ngOnInit(): void {
    void this.store.loadProjects();
    void this.store.loadDbConfig();
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.store.searchQuery.set(value);
  }

  setFilter(filter: GitFilter): void {
    this.store.gitFilter.set(filter);
  }

  openCreateDialog(): void {
    this.openProjectDialog(null);
  }

  openEditDialog(project: Project): void {
    this.openProjectDialog(project);
  }

  openSettingsDialog(): void {
    this.dialog.open(SettingsDialogComponent, {
      backdropClass: 'tactile-backdrop',
      panelClass: 'tactile-dialog-panel',
    });
  }

  private openProjectDialog(project: Project | null): void {
    const ref = this.dialog.open<ProjectDialogResult>(ProjectDialogComponent, {
      data: project,
      backdropClass: 'tactile-backdrop',
      panelClass: 'tactile-dialog-panel',
    });

    ref.closed.subscribe((result) => {
      if (!result) return;
      if (result.mode === 'create') {
        void this.store.createProject(result.payload as CreateProjectInput);
      } else if (result.mode === 'edit' && result.projectId) {
        void this.store.updateProject(result.projectId, result.payload as UpdateProjectInput);
      }
    });
  }

  onDeleteProject(project: Project): void {
    void this.store.deleteProject(project.id);
  }

  onRefreshProjectGit(project: Project): void {
    void this.store.refreshProjectGit(project.id);
  }

  onRefreshAllGit(): void {
    void this.store.refreshAllGit();
  }

  onOpenFolder(project: Project): void {
    void this.bridge.openInExplorer(project.directoryPath);
  }

  onOpenVSCode(project: Project): void {
    void this.bridge.openInVSCode(project.directoryPath);
  }
}
