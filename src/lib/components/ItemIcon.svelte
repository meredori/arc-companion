<script lang="ts">
  import { assets, base } from '$app/paths';
  import type { RecommendationAction } from '$lib/types';

  const rarityGradients: Record<string, string> = {
    legendary: 'from-amber-500/20 via-amber-600/20 to-amber-900/40 border-amber-400/60 shadow-amber-500/20',
    epic: 'from-fuchsia-500/20 via-fuchsia-600/20 to-fuchsia-900/40 border-fuchsia-400/60 shadow-fuchsia-500/20',
    rare: 'from-sky-500/20 via-sky-600/20 to-sky-900/40 border-sky-400/60 shadow-sky-500/20',
    uncommon: 'from-emerald-500/20 via-emerald-600/20 to-emerald-900/40 border-emerald-400/60 shadow-emerald-500/20',
    common: 'from-slate-500/10 via-slate-700/10 to-slate-900/30 border-slate-600/60 shadow-slate-700/10',
    default: 'from-slate-900/60 via-slate-900/50 to-slate-950/80 border-slate-800/70 shadow-slate-900/30'
  };

  const TAG_STYLES: Record<RecommendationAction, string> = {
    keep: 'bg-sky-500/90 text-white border border-sky-200/60 shadow-sky-500/40',
    recycle: 'bg-amber-500/90 text-slate-900 border border-amber-200/80 shadow-amber-500/40',
    sell: 'bg-rose-500/90 text-white border border-rose-200/80 shadow-rose-500/40'
  } as const;

  const TAG_LABEL: Record<RecommendationAction, string> = {
    keep: 'Keep',
    recycle: 'Recycle',
    sell: 'Sell'
  } as const;

  export let name: string;
  export let rarity: string | null | undefined = null;
  export let imageUrl: string | null | undefined = null;
  export let tag: RecommendationAction | null | undefined = null;
  export let tooltipId: string | undefined = undefined;
  export let showTooltip = false;
  export let initials = '';
  export let sizeClass = 'h-24 w-24';
  export let roundedClass = 'rounded-3xl';
  export let paddingClass = 'p-2';
  export let className = '';

  $: rarityClass = rarityGradients[rarity?.toLowerCase() ?? 'default'] ?? rarityGradients.default;
  const isAbsolute = (url: string) => /^https?:\/\//i.test(url) || url.startsWith('//');

  $: resolvedImageUrl = (() => {
    if (!imageUrl) return imageUrl;
    if (isAbsolute(imageUrl)) return imageUrl;

    const prefix = assets || base || '';
    const normalized = imageUrl.replace(/\/{2,}/g, '/');

    if (prefix && normalized.startsWith(prefix)) {
      return normalized;
    }

    if (!normalized.startsWith('/')) return normalized;

    return `${prefix}${normalized}`.replace(/\/{2,}/g, '/');
  })();
  $: fallbackInitials = initials ||
    name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();
</script>

<div
  class={`group relative inline-flex w-full items-center justify-center ${className}`}
  aria-describedby={showTooltip ? tooltipId : undefined}
>
  <div
    class={`flex ${sizeClass} items-center justify-center overflow-hidden ${roundedClass} border bg-gradient-to-br text-base font-semibold uppercase tracking-wide text-white ${rarityClass} ${paddingClass}`}
    aria-hidden="true"
  >
    {#if resolvedImageUrl}
      <img src={resolvedImageUrl} alt={name} class="h-full w-full object-contain" loading="lazy" decoding="async" />
    {:else}
      <span>{fallbackInitials}</span>
    {/if}
  </div>

  {#if tag}
    <span
      class={`pointer-events-none absolute bottom-1 right-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-lg ${TAG_STYLES[tag]}`}
    >
      {TAG_LABEL[tag]}
    </span>
  {/if}

  {#if showTooltip}
    <div
      id={tooltipId}
      role="tooltip"
      class="pointer-events-none absolute left-0 right-0 top-full z-20 hidden w-full translate-y-2 rounded-xl border border-slate-800/80 bg-slate-950/95 p-4 text-left text-xs text-slate-100 shadow-2xl shadow-black/60 transition group-hover:flex group-focus-within:flex"
    >
      <slot name="tooltip" />
    </div>
  {/if}
</div>
