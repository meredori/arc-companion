import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type { PipelineMeta } from '$lib/types';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');
const dataDir = path.join(projectRoot, 'static', 'data');
const metaPath = path.join(dataDir, 'meta', 'index.json');
const stagingDir = path.join(dataDir, '_staging');

// Pass E (conflict resolution) runs through the finalize script alongside pass F.
const scriptMap: Record<string, string> = {
  A: 'wiki-loot.mjs',
  B: 'wiki-item.mjs',
  C: 'metaforge.mjs',
  D: 'quests.mjs',
  E: 'finalize.mjs',
  F: 'finalize.mjs'
};

export async function readPipelineMeta(): Promise<PipelineMeta> {
  const raw = await fs.readFile(metaPath, 'utf8');
  return JSON.parse(raw) as PipelineMeta;
}

export async function readStageRecords(pass: string) {
  const dir = path.join(stagingDir, pass.toLowerCase());
  const files = await fs.readdir(dir).catch(() => []);
  const batches = [];
  for (const file of files.filter((item) => item.endsWith('.json'))) {
    const full = path.join(dir, file);
    const content = await fs.readFile(full, 'utf8');
    const records = JSON.parse(content);
    batches.push({
      file,
      count: Array.isArray(records) ? records.length : 0,
      records: Array.isArray(records) ? records : []
    });
  }
  return batches;
}

export async function listStageBatches(pass: string) {
  const batches = await readStageRecords(pass);
  return batches.map(({ file, count }) => ({ file, count }));
}

export async function executePass(pass: string, options: { approve?: boolean } = {}) {
  const script = scriptMap[pass.toUpperCase()];
  if (!script) {
    throw new Error(`Unsupported pass: ${pass}`);
  }
  const scriptPath = path.join(projectRoot, 'scripts', 'import', script);
  const args = [scriptPath];
  if (options.approve) {
    args.push('--approve');
  }
  const { stdout, stderr } = await execFileAsync('node', args, { cwd: projectRoot });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

export async function updateApproval(pass: string, approved: boolean) {
  const meta = await readPipelineMeta();
  const key = pass.toUpperCase();
  if (!meta.passes[key]) {
    throw new Error(`Unknown pass: ${pass}`);
  }
  meta.passes[key] = {
    ...meta.passes[key],
    approved,
    lastRunAt: new Date().toISOString()
  };
  meta.generatedAt = new Date().toISOString();
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
  return meta.passes[key];
}
