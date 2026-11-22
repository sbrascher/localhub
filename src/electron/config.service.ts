import * as fs from 'node:fs';
import * as path from 'node:path';

export interface AppConfig {
  dbPath: string | null;
}

export class ConfigService {
  private readonly configPath: string;
  private readonly defaultDbPath: string;

  constructor(userDataPath: string) {
    fs.mkdirSync(userDataPath, { recursive: true });
    this.configPath = path.join(userDataPath, 'config.json');
    this.defaultDbPath = path.join(userDataPath, 'projects.db');
  }

  getDefaultDbPath(): string {
    return this.defaultDbPath;
  }

  readConfig(): AppConfig {
    try {
      if (!fs.existsSync(this.configPath)) {
        return { dbPath: null };
      }
      const raw = fs.readFileSync(this.configPath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<AppConfig>;
      return {
        dbPath: typeof parsed.dbPath === 'string' && parsed.dbPath.trim() ? parsed.dbPath.trim() : null,
      };
    } catch {
      return { dbPath: null };
    }
  }

  getEffectiveDbPath(): string {
    const cfg = this.readConfig();
    return cfg.dbPath ?? this.defaultDbPath;
  }

  setDbPath(dbPath: string | null): void {
    const next: AppConfig = { dbPath: dbPath ? dbPath.trim() : null };
    fs.writeFileSync(this.configPath, JSON.stringify(next, null, 2), 'utf-8');
  }
}
