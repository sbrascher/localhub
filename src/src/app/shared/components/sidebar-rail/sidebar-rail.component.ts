import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { GitFilter } from '../../../core/models/project.model';

@Component({
  selector: 'app-sidebar-rail',
  standalone: true,
  templateUrl: './sidebar-rail.component.html',
  styleUrl: './sidebar-rail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarRailComponent {
  readonly activeFilter = input.required<GitFilter>();
  readonly refreshingAll = input(false);
  readonly stats = input.required<{
    total: number;
    withRemote: number;
    localOnly: number;
    withoutGit: number;
  }>();

  readonly filterChange = output<GitFilter>();
  readonly refreshAll = output<void>();
  readonly createNew = output<void>();
  readonly openSettings = output<void>();
}
