import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Actions, PageServerLoad } from './$types';
import type { PipelineMeta } from '$lib/types';
import {
  executePass,
  readPipelineMeta,
  readStageRecords,
  updateApproval
} from '$lib/server/pipeline';
import { fail } from '@sveltejs/kit';

const APPROVAL_TOKEN = process.env.ADMIN_APPROVAL_TOKEN ?? 'let-me-in';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');
const itemsPath = path.join(projectRoot, 'static', 'data', 'items.json');
const STAGE_KEYS = ['pass-a', 'pass-b', 'pass-c', 'pass-d'] as const;

export const load: PageServerLoad = async () => {
  const meta = await readPipelineMeta();
  const stageEntries = await Promise.all(
    STAGE_KEYS.map(async (key) => {
      const batches = await readStageRecords(key);
      return [key, batches] as const;
    })
  );

  const stageRecords = Object.fromEntries(stageEntries);
  const stages = Object.fromEntries(
    stageEntries.map(([key, batches]) => [
      key,
      batches.map(({ file, count }) => ({ file, count }))
    ])
  );

  const itemsRaw = await fs.readFile(itemsPath, 'utf8').catch(() => '[]');
  const items = JSON.parse(itemsRaw);
  const categories = Array.from(
    new Set(
      Array.isArray(items)
        ? items
            .map((item) => item?.category)
            .filter((value): value is string => Boolean(value && typeof value === 'string'))
        : []
    )
  ).sort((a, b) => a.localeCompare(b));

  return {
    meta,
    stages,
    stageRecords,
    categories,
    items
  } satisfies {
    meta: PipelineMeta;
    stages: Record<string, Array<{ file: string; count: number }>>;
    stageRecords: Record<string, Array<{ file: string; count: number; records: unknown[] }>>;
    categories: string[];
    items: unknown[];
  };
};

export const actions: Actions = {
  rerun: async ({ request }) => {
    const form = await request.formData();
    const pass = String(form.get('pass') ?? '').toUpperCase();
    if (!pass) {
      return fail(400, { message: 'Pass is required.' });
    }
    const approve = form.get('approve') === 'true';
    const result = await executePass(pass, { approve });
    return { success: true, output: result.stdout };
  },
  finalize: async () => {
    const result = await executePass('F');
    return { success: true, output: result.stdout };
  },
  approve: async ({ request }) => {
    const form = await request.formData();
    const pass = String(form.get('pass') ?? '').toUpperCase();
    const approved = form.get('approved') === 'true';
    const token = String(form.get('token') ?? '');
    if (!pass) {
      return fail(400, { message: 'Pass is required.' });
    }
    if (token !== APPROVAL_TOKEN) {
      return fail(401, { message: 'Invalid approval token.' });
    }
    const entry = await updateApproval(pass, approved);
    return { success: true, entry };
  }
};
