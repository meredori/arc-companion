import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import type { PageLoad } from './$types';

const withBase = (path: string) => `${base}${path}`.replace(/\/{2,}/g, '/');

export const load: PageLoad = async () => {
  throw redirect(307, withBase('/admin/passes'));
};
