import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import initSqlJs, { Database as SqlJsDatabase, SqlValue } from 'sql.js';

export interface ProjectRecord {
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

export class DbService {
  private readonly db: SqlJsDatabase;
  private readonly dbPath: string;
  private readonly coversDir: string;

  private constructor(db: SqlJsDatabase, dbPath: string, coversDir: string) {
    this.db = db;
    this.dbPath = dbPath;
    this.coversDir = coversDir;
    this.migrate();
  }

  static async create(dbFilePath: string): Promise<DbService> {
    const dbDir = path.dirname(dbFilePath);
    fs.mkdirSync(dbDir, { recursive: true });
    const coversDir = path.join(dbDir, 'covers');
    fs.mkdirSync(coversDir, { recursive: true });

    const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
    const SQL = await initSqlJs({
      locateFile: () => wasmPath,
      useOldExtensionFunctions: false,
    });

    const existingBuffer = fs.existsSync(dbFilePath) ? fs.readFileSync(dbFilePath) : undefined;
    const db = existingBuffer ? new SQL.Database(existingBuffer) : new SQL.Database();

    return new DbService(db, dbFilePath, coversDir);
  }

  getDbPath(): string {
    return this.dbPath;
  }

  getCoversDir(): string {
    return this.coversDir;
  }

  private persist(): void {
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }

  private migrate(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        directory_path TEXT NOT NULL,
        cover_file_name TEXT,
        has_local_git INTEGER NOT NULL DEFAULT 0,
        has_remote_git INTEGER NOT NULL DEFAULT 0,
        remote_url TEXT,
        git_branch TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    this.persist();
  }

  private queryAll(sql: string, params: SqlValue[] = []): Record<string, SqlValue>[] {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows: Record<string, SqlValue>[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  private mapRow(row: Record<string, SqlValue>): ProjectRecord {
    const coverFileName = (row['cover_file_name'] as string | null) ?? null;
    return {
      id: String(row['id']),
      name: String(row['name']),
      description: (row['description'] as string | null) ?? null,
      directoryPath: String(row['directory_path']),
      coverFileName,
      coverUrl: coverFileName ? `app-cover://covers/${encodeURIComponent(coverFileName)}` : null,
      hasLocalGit: Number(row['has_local_git']) === 1,
      hasRemoteGit: Number(row['has_remote_git']) === 1,
      remoteUrl: (row['remote_url'] as string | null) ?? null,
      gitBranch: (row['git_branch'] as string | null) ?? null,
      createdAt: String(row['created_at']),
      updatedAt: String(row['updated_at']),
    };
  }

  private saveCoverFile(sourcePath: string | null | undefined): string | null {
    if (!sourcePath || !fs.existsSync(sourcePath)) return null;
    const ext = path.extname(sourcePath).toLowerCase() || '.png';
    const fileName = `${randomUUID()}${ext}`;
    const destPath = path.join(this.coversDir, fileName);
    fs.copyFileSync(sourcePath, destPath);
    return fileName;
  }

  private deleteCoverFile(fileName: string | null | undefined): void {
    if (!fileName) return;
    const safeName = path.basename(fileName);
    const fullPath = path.join(this.coversDir, safeName);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  listProjects(): ProjectRecord[] {
    const rows = this.queryAll('SELECT * FROM projects ORDER BY datetime(updated_at) DESC');
    return rows.map((row) => this.mapRow(row));
  }

  getProject(id: string): ProjectRecord | null {
    const rows = this.queryAll('SELECT * FROM projects WHERE id = ?', [id]);
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  createProject(input: CreateProjectInput): ProjectRecord {
    const id = randomUUID();
    const now = new Date().toISOString();
    const coverFileName = this.saveCoverFile(input.coverSourcePath);

    this.db.run(
      `INSERT INTO projects (
        id, name, description, directory_path, cover_file_name,
        has_local_git, has_remote_git, remote_url, git_branch,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.name.trim(),
        input.description?.trim() || null,
        input.directoryPath.trim(),
        coverFileName,
        input.hasLocalGit ? 1 : 0,
        input.hasRemoteGit ? 1 : 0,
        input.remoteUrl?.trim() || null,
        input.gitBranch?.trim() || null,
        now,
        now,
      ],
    );

    this.persist();
    return this.getProject(id)!;
  }

  updateProject(id: string, input: UpdateProjectInput): ProjectRecord | null {
    const existing = this.getProject(id);
    if (!existing) return null;

    let coverFileName = existing.coverFileName;
    if (input.removeCover) {
      this.deleteCoverFile(existing.coverFileName);
      coverFileName = null;
    } else if (input.coverSourcePath) {
      this.deleteCoverFile(existing.coverFileName);
      coverFileName = this.saveCoverFile(input.coverSourcePath);
    }

    const now = new Date().toISOString();
    this.db.run(
      `UPDATE projects SET
        name = ?,
        description = ?,
        directory_path = ?,
        cover_file_name = ?,
        has_local_git = ?,
        has_remote_git = ?,
        remote_url = ?,
        git_branch = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        input.name.trim(),
        input.description?.trim() || null,
        input.directoryPath.trim(),
        coverFileName,
        input.hasLocalGit ? 1 : 0,
        input.hasRemoteGit ? 1 : 0,
        input.remoteUrl?.trim() || null,
        input.gitBranch?.trim() || null,
        now,
        id,
      ],
    );

    this.persist();
    return this.getProject(id);
  }

  updateGitStatus(
    id: string,
    git: { hasLocalGit: boolean; hasRemoteGit: boolean; remoteUrl: string | null; branch: string | null },
  ): ProjectRecord | null {
    const existing = this.getProject(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    this.db.run(
      `UPDATE projects SET
        has_local_git = ?,
        has_remote_git = ?,
        remote_url = ?,
        git_branch = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        git.hasLocalGit ? 1 : 0,
        git.hasRemoteGit ? 1 : 0,
        git.remoteUrl,
        git.branch,
        now,
        id,
      ],
    );

    this.persist();
    return this.getProject(id);
  }

  deleteProject(id: string): boolean {
    const existing = this.getProject(id);
    if (!existing) return false;
    this.deleteCoverFile(existing.coverFileName);
    this.db.run('DELETE FROM projects WHERE id = ?', [id]);
    this.persist();
    return true;
  }

  close(): void {
    this.persist();
    this.db.close();
  }
}
