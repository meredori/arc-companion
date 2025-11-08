import type { Actions, PageServerLoad } from './$types';
import { executePass, listStageBatches, readPipelineMeta, updateApproval } from '$lib/server/pipeline';
import { fail } from '@sveltejs/kit';

const APPROVAL_TOKEN = process.env.ADMIN_APPROVAL_TOKEN ?? 'let-me-in';
const STAGE_KEYS = ['pass-a', 'pass-b', 'pass-c', 'pass-d'];

export const load: PageServerLoad = async () => {
  const meta = await readPipelineMeta();
  const stages = Object.fromEntries(
    await Promise.all(
      STAGE_KEYS.map(async (key) => {
        const batches = await listStageBatches(key);
        return [key, batches];
      })
    )
  );

  return { meta, stages };
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
