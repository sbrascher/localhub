import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from 'electron';
import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ConfigService } from './config.service';
import { CreateProjectInput, DbService, UpdateProjectInput } from './db.service';
import { inspectDirectoryGit } from './git.service';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app-cover',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;
let dbService: DbService | null = null;
let configService: ConfigService | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#181816',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devUrl = process.env['ELECTRON_START_URL'] || (process.argv.includes('--dev') ? 'http://localhost:4200' : '');
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    const indexPath = path.join(__dirname, '../dist/gerenciador-projetos/browser/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function switchDatabase(targetDbPath: string, copyFromCurrentIfMissing: boolean): Promise<void> {
  const currentDb = dbService;
  const currentPath = currentDb?.getDbPath();

  if (currentDb) {
    currentDb.close();
  }

  if (copyFromCurrentIfMissing && currentPath && fs.existsSync(currentPath) && !fs.existsSync(targetDbPath)) {
    fs.mkdirSync(path.dirname(targetDbPath), { recursive: true });
    fs.copyFileSync(currentPath, targetDbPath);

    const oldCoversDir = path.join(path.dirname(currentPath), 'covers');
    const newCoversDir = path.join(path.dirname(targetDbPath), 'covers');
    if (fs.existsSync(oldCoversDir)) {
      fs.mkdirSync(newCoversDir, { recursive: true });
      for (const file of fs.readdirSync(oldCoversDir)) {
        const src = path.join(oldCoversDir, file);
        const dest = path.join(newCoversDir, file);
        if (fs.statSync(src).isFile() && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
        }
      }
    }
  }

  dbService = await DbService.create(targetDbPath);
}

function registerIpcHandlers(): void {
  ipcMain.handle('projects:list', () => dbService?.listProjects() ?? []);

  ipcMain.handle('projects:create', (_event, input: CreateProjectInput) => {
    if (!dbService) throw new Error('Database não inicializado');
    return dbService.createProject(input);
  });

  ipcMain.handle('projects:update', (_event, id: string, input: UpdateProjectInput) => {
    if (!dbService) throw new Error('Database não inicializado');
    return dbService.updateProject(id, input);
  });

  ipcMain.handle('projects:delete', (_event, id: string) => {
    return dbService?.deleteProject(id) ?? false;
  });

  ipcMain.handle('projects:refresh-git', async (_event, id: string) => {
    if (!dbService) return null;
    const project = dbService.getProject(id);
    if (!project) return null;
    const git = await inspectDirectoryGit(project.directoryPath);
    return dbService.updateGitStatus(id, {
      hasLocalGit: git.hasLocalGit,
      hasRemoteGit: git.hasRemoteGit,
      remoteUrl: git.remoteUrl,
      branch: git.branch,
    });
  });

  ipcMain.handle('projects:refresh-all-git', async () => {
    if (!dbService) return [];
    const projects = dbService.listProjects();
    await Promise.all(
      projects.map(async (project) => {
        const git = await inspectDirectoryGit(project.directoryPath);
        dbService?.updateGitStatus(project.id, {
          hasLocalGit: git.hasLocalGit,
          hasRemoteGit: git.hasRemoteGit,
          remoteUrl: git.remoteUrl,
          branch: git.branch,
        });
      }),
    );
    return dbService.listProjects();
  });

  ipcMain.handle('git:inspect-directory', async (_event, dirPath: string) => {
    return inspectDirectoryGit(dirPath);
  });

  ipcMain.handle('dialog:select-directory', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecionar diretório do projeto',
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('dialog:select-cover', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecionar imagem de capa',
      properties: ['openFile'],
      filters: [{ name: 'Imagens', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;

    const filePath = result.filePaths[0];
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    const buffer = await fs.promises.readFile(filePath);
    const previewDataUrl = `data:${mime};base64,${buffer.toString('base64')}`;

    return { filePath, previewDataUrl };
  });

  ipcMain.handle('shell:open-explorer', async (_event, dirPath: string) => {
    if (!dirPath || !fs.existsSync(dirPath)) return false;
    const errorMsg = await shell.openPath(dirPath);
    return errorMsg === '';
  });

  ipcMain.handle('shell:open-vscode', async (_event, dirPath: string) => {
    if (!dirPath || !fs.existsSync(dirPath)) return false;
    return new Promise<boolean>((resolve) => {
      execFile('code', [dirPath], { shell: true, windowsHide: true }, (error) => {
        resolve(!error);
      });
    });
  });

  ipcMain.handle('settings:get-db-config', () => {
    if (!configService || !dbService) {
      return { dbPath: '', defaultDbPath: '', isCustom: false };
    }
    const cfg = configService.readConfig();
    return {
      dbPath: dbService.getDbPath(),
      defaultDbPath: configService.getDefaultDbPath(),
      isCustom: Boolean(cfg.dbPath),
    };
  });

  ipcMain.handle('settings:select-db-folder', async () => {
    if (!mainWindow || !configService) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Escolher pasta para armazenar o banco SQLite (projects.db)',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;

    const targetDbPath = path.join(result.filePaths[0], 'projects.db');
    await switchDatabase(targetDbPath, true);
    configService.setDbPath(targetDbPath);

    return {
      dbPath: targetDbPath,
      defaultDbPath: configService.getDefaultDbPath(),
      isCustom: true,
      projects: dbService?.listProjects() ?? [],
    };
  });

  ipcMain.handle('settings:select-db-file', async () => {
    if (!mainWindow || !configService) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Abrir arquivo de banco SQLite existente',
      properties: ['openFile'],
      filters: [{ name: 'Banco SQLite', extensions: ['db', 'sqlite', 'sqlite3'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;

    const targetDbPath = result.filePaths[0];
    await switchDatabase(targetDbPath, false);
    configService.setDbPath(targetDbPath);

    return {
      dbPath: targetDbPath,
      defaultDbPath: configService.getDefaultDbPath(),
      isCustom: true,
      projects: dbService?.listProjects() ?? [],
    };
  });

  ipcMain.handle('settings:reset-db-path', async () => {
    if (!configService) {
      return { dbPath: '', defaultDbPath: '', isCustom: false, projects: [] };
    }
    const defaultPath = configService.getDefaultDbPath();
    await switchDatabase(defaultPath, false);
    configService.setDbPath(null);

    return {
      dbPath: defaultPath,
      defaultDbPath: defaultPath,
      isCustom: false,
      projects: dbService?.listProjects() ?? [],
    };
  });
}

app.whenReady().then(async () => {
  const userDataPath = app.getPath('userData');
  configService = new ConfigService(userDataPath);
  const initialDbPath = configService.getEffectiveDbPath();
  dbService = await DbService.create(initialDbPath);

  protocol.handle('app-cover', (request) => {
    const coversDir = dbService?.getCoversDir() ?? path.join(userDataPath, 'covers');
    const url = new URL(request.url);
    const safeFileName = path.basename(decodeURIComponent(url.pathname));
    const targetPath = path.join(coversDir, safeFileName);
    return net.fetch(pathToFileURL(targetPath).toString());
  });

  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  dbService?.close();
});
