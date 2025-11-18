import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
  const target = url.pathname.replace(/\/blueprints$/, '/what-i-have');

  throw redirect(308, target);
};
