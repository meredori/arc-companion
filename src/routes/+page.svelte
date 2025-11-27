<svelte:head>
  <title>ARC Raiders Companion</title>
  <meta
    name="description"
    content="Planning workspace for the ARC Raiders Companion tool built with SvelteKit."
  />
</svelte:head>

<script lang="ts">
  import { base } from '$app/paths';

  type RootPageData = {
    landing?: {
      cards?: LandingCard[];
    };
    landingCards?: LandingCard[];
  };

  export let data: RootPageData = {};
  export let form;
  export let params;
  const __rootPageProps = { data, form, params };
  void __rootPageProps;

  const withBase = (href: string) => (base ? `${base}${href}` : href);

  type LandingCard = {
    href: string;
    title?: string;
    label?: string;
    heading?: string;
    name?: string;
    description?: string;
    copy?: string;
    body?: string;
  };

  const defaultCards: LandingCard[] = [
    {
      href: '/what-to-do',
      title: 'What To Do',
      description: 'Item recommendations driven by synced data and personalized player goals.'
    },
    {
      href: '/what-i-have',
      title: 'What I Have',
      description: 'Central dashboard to mark quest completions, bench upgrades, and owned schematics.'
    },
    {
      href: '/what-i-want',
      title: 'What I Want',
      description: 'Build a wishlist of future crafts and inspect the materials needed to complete them.'
    },
    {
      href: '/run',
      title: 'Run Analyzer',
      description: 'Live run logging with telemetry overlays.'
    },
    {
      href: '/about',
      title: 'About & Attribution',
      description: 'Copyright, data credits, and tools to clear your saved ARC Companion data.'
    }
  ];

  const incomingCards = Array.isArray(data?.landing?.cards)
    ? (data.landing.cards as LandingCard[])
    : Array.isArray(data?.landingCards)
      ? (data.landingCards as LandingCard[])
      : defaultCards;

  const cards = incomingCards.filter((card) => typeof card?.href === 'string' && card.href !== '/previews');

  const cardTitle = (card: LandingCard) => card.title ?? card.label ?? card.heading ?? card.name ?? card.href;

  const cardDescription = (card: LandingCard) => card.description ?? card.copy ?? card.body ?? '';
</script>

<div class="page-stack">
  <header class="space-y-4">
    <h1 class="text-4xl font-semibold">ARC Raiders Companion</h1>
    <p class="max-w-2xl text-sm text-slate-400">
      This workspace establishes the shared layout, theming tokens, and component scaffolding that power
      each feature vertical. As data pipelines and persistence arrive, these sections will evolve into the
      fully interactive companion experience.
    </p>
  </header>

  <div class="grid gap-5 md:grid-cols-2">
    {#each cards as card}
      <a class="section-card transition-transform duration-200 hover:-translate-y-1" href={withBase(card.href)}>
        <h2 class="text-xl font-semibold">{cardTitle(card)}</h2>
        {#if cardDescription(card)}
          <p class="mt-2 text-sm text-slate-400">{cardDescription(card)}</p>
        {/if}
      </a>
    {/each}
  </div>
</div>
