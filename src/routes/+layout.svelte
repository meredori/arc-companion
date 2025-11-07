<script lang="ts">
  import '../app.postcss';
  import { page } from '$app/stores';

  const links = [
    { href: '/what-to-do', label: 'What To Do' },
    { href: '/track', label: 'Track' },
    { href: '/blueprints', label: 'Blueprints' },
    { href: '/run', label: 'Run' },
    { href: '/runs', label: 'Runs' },
    { href: '/previews', label: 'Previews' },
    { href: '/admin', label: 'Admin' }
  ];

  const isActive = (href: string, pathname: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
</script>

<main class="app-shell">
  <header class="app-header">
    <div class="app-container flex items-center justify-between gap-6 py-5">
      <a class="brand" href="/">
        <span class="brand-mark" aria-hidden="true"></span>
        <span class="brand-name">ARC Companion</span>
      </a>
      <nav aria-label="Primary" class="nav-links">
        {#each links as link}
          <a
            class:active-link={isActive(link.href, $page.url.pathname)}
            href={link.href}
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
