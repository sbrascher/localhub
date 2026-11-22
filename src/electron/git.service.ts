import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface GitInspectionResult {
  exists: boolean;
  hasLocalGit: boolean;
  hasRemoteGit: boolean;
  remoteUrl: string | null;
  branch: string | null;
  isDirty: boolean;
}

async function runGit(args: string[], cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd,
      timeout: 4000,
      windowsHide: true,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function inspectDirectoryGit(dirPath: string): Promise<GitInspectionResult> {
  const empty: GitInspectionResult = {
    exists: false,
    hasLocalGit: false,
    hasRemoteGit: false,
    remoteUrl: null,
    branch: null,
    isDirty: false,
  };

  if (!dirPath) return empty;

  try {
    const stat = await fs.promises.stat(dirPath);
    if (!stat.isDirectory()) return empty;
  } catch {
    return empty;
  }

  const insideWorkTree = await runGit(['rev-parse', '--is-inside-work-tree'], dirPath);
  if (insideWorkTree !== 'true') {
    return { ...empty, exists: true };
  }

  const [originUrl, remotesOutput, currentBranch, shortHead, statusOutput] = await Promise.all([
    runGit(['remote', 'get-url', 'origin'], dirPath),
    runGit(['remote', '-v'], dirPath),
    runGit(['branch', '--show-current'], dirPath),
    runGit(['rev-parse', '--short', 'HEAD'], dirPath),
    runGit(['status', '--porcelain'], dirPath),
  ]);

  let remoteUrl = originUrl || null;
  if (!remoteUrl && remotesOutput) {
    const firstLine = remotesOutput.split(/\r?\n/).find((line) => line.trim().length > 0);
    if (firstLine) {
      const parts = firstLine.trim().split(/\s+/);
      if (parts.length >= 2) {
        remoteUrl = parts[1];
      }
    }
  }

  const hasRemoteGit = Boolean(remoteUrl || (remotesOutput && remotesOutput.length > 0));
  const branch = currentBranch || (shortHead ? `detached@${shortHead}` : null);
  const isDirty = Boolean(statusOutput && statusOutput.length > 0);

  return {
    exists: true,
    hasLocalGit: true,
    hasRemoteGit,
    remoteUrl,
    branch,
    isDirty,
  };
}
