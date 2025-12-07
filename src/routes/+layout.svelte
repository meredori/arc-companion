<script lang="ts">
  import '../app.postcss';
  import { page } from '$app/stores';

  type LayoutData = {
    navigation?: {
      primary?: NavigationLink[];
    };
  };

  export let data: LayoutData = {};
  export let form;
  export let params;
  const __layoutProps = { data, form, params };
  void __layoutProps;

  type NavigationLink = {
    href: string;
    label?: string;
    title?: string;
    name?: string;
  };

  const defaultLinks: NavigationLink[] = [
    { href: '/what-to-do', label: 'What To Do' },
    { href: '/what-i-have', label: 'What I Have' },
    { href: '/what-i-want', label: 'What I Want' },
    { href: '/run', label: 'Run' },
    { href: '/about', label: 'About' }
  ];

  const incomingLinks = Array.isArray(data?.navigation?.primary)
    ? (data.navigation.primary as NavigationLink[])
    : defaultLinks;

  const links = incomingLinks.filter((link) => typeof link?.href === 'string' && link.href !== '/previews');

  const linkLabel = (link: NavigationLink) => link.label ?? link.title ?? link.name ?? link.href;

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
            >{linkLabel(link)}</a
          >
        {/each}
      </nav>
    </div>
  </header>
  <section class="app-container pb-16 pt-10">
    <slot />
  </section>
</main>
