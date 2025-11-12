<script lang="ts">
  import '../app.postcss';
  import { page } from '$app/stores';
  import { base } from '$app/paths';

  export let data;
  export let form;
  export let params;
  const __layoutProps = { data, form, params };
  void __layoutProps;

  const links = [
    { href: '/what-to-do', label: 'What To Do' },
    { href: '/what-i-have', label: 'What I Have' },
    { href: '/what-i-want', label: 'What I Want' },
    { href: '/blueprints', label: 'Blueprints' },
    { href: '/run', label: 'Run' },
    { href: '/runs', label: 'Runs' },
    { href: '/previews', label: 'Previews' },
    { href: '/admin', label: 'Admin' }
  ];

  const stripBase = (pathname: string) => {
    if (!base || !pathname.startsWith(base)) {
      return pathname;
    }

    const trimmed = pathname.slice(base.length);
    return trimmed ? trimmed : '/';
  };

  const withBase = (href: string) => `${base}${href}`.replace(/\/{2,}/g, '/');

  const isActive = (href: string, pathname: string) => {
    const normalized = stripBase(pathname);
    return normalized === href || (href !== '/' && normalized.startsWith(`${href}/`));
  };
</script>

<main class="app-shell">
  <header class="app-header">
    <div class="app-container flex items-center justify-between gap-6 py-5">
      <a class="brand" href={withBase('/')}>
        <span class="brand-mark" aria-hidden="true"></span>
        <span class="brand-name">ARC Companion</span>
      </a>
      <nav aria-label="Primary" class="nav-links">
        {#each links as link}
          <a
            class:active-link={isActive(link.href, $page.url.pathname)}
            href={withBase(link.href)}
            aria-current={isActive(link.href, $page.url.pathname) ? 'page' : undefined}
            >{link.label}</a
          >
        {/each}
      </nav>
    </div>
  </header>
  <section class="app-container pb-16 pt-10">
    <slot />
  </section>
</main>
