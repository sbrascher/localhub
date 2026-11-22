import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Project } from '../../core/models/project.model';

@Component({
  selector: 'app-project-card',
  standalone: true,
  templateUrl: './project-card.component.html',
  styleUrl: './project-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCardComponent {
  readonly project = input.required<Project>();

  readonly edit = output<Project>();
  readonly remove = output<Project>();
  readonly refreshGit = output<Project>();
  readonly openFolder = output<Project>();
  readonly openVSCode = output<Project>();

  readonly confirmingDelete = signal(false);

  readonly monogram = computed(() => {
    const name = this.project().name.trim();
    if (!name) return 'P';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  readonly gitSummaryLabel = computed(() => {
    const p = this.project();
    if (p.hasLocalGit && p.hasRemoteGit) return 'Git Local + Remoto';
    if (p.hasLocalGit) return 'Só Git Local';
    return 'Sem Git';
  });

  readonly gitStatusClass = computed(() => {
    const p = this.project();
    if (p.hasLocalGit && p.hasRemoteGit) return 'status-remote';
    if (p.hasLocalGit) return 'status-local';
    return 'status-none';
  });

  onDeleteClick(): void {
    if (this.confirmingDelete()) {
      this.confirmingDelete.set(false);
      this.remove.emit(this.project());
    } else {
      this.confirmingDelete.set(true);
    }
  }

  cancelDelete(): void {
    this.confirmingDelete.set(false);
  }
}
