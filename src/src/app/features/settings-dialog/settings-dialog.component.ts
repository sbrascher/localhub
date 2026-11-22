import { A11yModule } from '@angular/cdk/a11y';
import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ProjectsStore } from '../../core/store/projects.store';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [A11yModule],
  templateUrl: './settings-dialog.component.html',
  styleUrl: './settings-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsDialogComponent implements OnInit {
  readonly store = inject(ProjectsStore);
  private readonly dialogRef = inject(DialogRef<void>);

  readonly busy = signal(false);
  readonly feedback = signal<string | null>(null);

  ngOnInit(): void {
    void this.store.loadDbConfig();
  }

  async chooseFolder(): Promise<void> {
    this.busy.set(true);
    this.feedback.set(null);
    try {
      const changed = await this.store.selectDbFolder();
      if (changed) {
        this.feedback.set('Pasta do banco de dados atualizada com sucesso.');
      }
    } finally {
      this.busy.set(false);
    }
  }

  async chooseExistingFile(): Promise<void> {
    this.busy.set(true);
    this.feedback.set(null);
    try {
      const changed = await this.store.selectDbFile();
      if (changed) {
        this.feedback.set('Banco de dados carregado com sucesso.');
      }
    } finally {
      this.busy.set(false);
    }
  }

  async resetToDefault(): Promise<void> {
    this.busy.set(true);
    this.feedback.set(null);
    try {
      const changed = await this.store.resetDbPath();
      if (changed) {
        this.feedback.set('Caminho restaurado para o padrão do aplicativo.');
      }
    } finally {
      this.busy.set(false);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
