import { A11yModule } from '@angular/cdk/a11y';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from '../../core/models/project.model';
import { ElectronBridgeService } from '../../core/services/electron-bridge.service';

export interface ProjectDialogResult {
  mode: 'create' | 'edit';
  projectId?: string;
  payload: CreateProjectInput | UpdateProjectInput;
}

@Component({
  selector: 'app-project-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, A11yModule],
  templateUrl: './project-dialog.component.html',
  styleUrl: './project-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly bridge = inject(ElectronBridgeService);
  private readonly dialogRef = inject(DialogRef<ProjectDialogResult>);
  readonly existingProject = inject<Project | null>(DIALOG_DATA, { optional: true });

  readonly isEditMode = Boolean(this.existingProject);
  readonly detectingGit = signal(false);
  readonly coverPreviewUrl = signal<string | null>(this.existingProject?.coverUrl ?? null);
  readonly coverSourcePath = signal<string | null>(null);
  readonly removeCover = signal(false);
  readonly gitMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: [this.existingProject?.name ?? '', [Validators.required, Validators.maxLength(120)]],
    description: [this.existingProject?.description ?? ''],
    directoryPath: [this.existingProject?.directoryPath ?? '', [Validators.required]],
    hasLocalGit: [this.existingProject?.hasLocalGit ?? false],
    hasRemoteGit: [this.existingProject?.hasRemoteGit ?? false],
    remoteUrl: [this.existingProject?.remoteUrl ?? ''],
    gitBranch: [this.existingProject?.gitBranch ?? ''],
  });

  ngOnInit(): void {
    if (this.existingProject?.directoryPath) {
      this.gitMessage.set(
        this.existingProject.hasLocalGit
          ? 'Status Git carregado do projeto.'
          : 'Diretório sem Git detectado.',
      );
    }
  }

  async pickDirectory(): Promise<void> {
    const selected = await this.bridge.selectDirectory();
    if (!selected) return;

    this.form.controls.directoryPath.setValue(selected);
    if (!this.form.controls.name.value.trim()) {
      const folderName = selected.split(/[/\\]/).filter(Boolean).pop() ?? '';
      if (folderName) {
        this.form.controls.name.setValue(folderName);
      }
    }

    await this.detectGitFromPath(selected);
  }

  async detectGit(): Promise<void> {
    const dirPath = this.form.controls.directoryPath.value.trim();
    if (!dirPath) return;
    await this.detectGitFromPath(dirPath);
  }

  private async detectGitFromPath(dirPath: string): Promise<void> {
    this.detectingGit.set(true);
    try {
      const result = await this.bridge.inspectDirectory(dirPath);
      if (!result.exists) {
        this.gitMessage.set('Diretório não encontrado no disco.');
        return;
      }

      this.form.patchValue({
        hasLocalGit: result.hasLocalGit,
        hasRemoteGit: result.hasRemoteGit,
        remoteUrl: result.remoteUrl ?? '',
        gitBranch: result.branch ?? '',
      });

      if (result.hasLocalGit && result.hasRemoteGit) {
        this.gitMessage.set('Git Local e Remoto detectados automaticamente.');
      } else if (result.hasLocalGit) {
        this.gitMessage.set('Git Local detectado (nenhum remoto configurado).');
      } else {
        this.gitMessage.set('Nenhum repositório Git encontrado nesta pasta.');
      }
    } finally {
      this.detectingGit.set(false);
    }
  }

  async pickCover(): Promise<void> {
    const selection = await this.bridge.selectCoverImage();
    if (!selection) return;
    this.coverSourcePath.set(selection.filePath);
    this.coverPreviewUrl.set(selection.previewDataUrl);
    this.removeCover.set(false);
  }

  clearCover(): void {
    this.coverSourcePath.set(null);
    this.coverPreviewUrl.set(null);
    this.removeCover.set(true);
  }

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const basePayload = {
      name: raw.name.trim(),
      description: raw.description.trim() || null,
      directoryPath: raw.directoryPath.trim(),
      coverSourcePath: this.coverSourcePath(),
      hasLocalGit: raw.hasLocalGit,
      hasRemoteGit: raw.hasRemoteGit,
      remoteUrl: raw.remoteUrl.trim() || null,
      gitBranch: raw.gitBranch.trim() || null,
    };

    if (this.isEditMode && this.existingProject) {
      this.dialogRef.close({
        mode: 'edit',
        projectId: this.existingProject.id,
        payload: {
          ...basePayload,
          removeCover: this.removeCover(),
        } satisfies UpdateProjectInput,
      });
    } else {
      this.dialogRef.close({
        mode: 'create',
        payload: basePayload satisfies CreateProjectInput,
      });
    }
  }
}
