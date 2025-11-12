<script lang="ts" context="module">
  export type { RunTimerProps } from './types';
</script>

<script lang="ts">
  import type { RunTimerProps } from './types';

  export let label: RunTimerProps['label'] = 'Current Run';
  export let elapsed: RunTimerProps['elapsed'] = 0;
  export let isRunning: RunTimerProps['isRunning'] = false;

  let minutes = '00';
  let seconds = '00';

  $: minutes = Math.floor(elapsed / 60)
    .toString()
    .padStart(2, '0');
  $: seconds = Math.floor(elapsed % 60)
    .toString()
    .padStart(2, '0');
</script>

<div class="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-slate-200 shadow-card">
  <div class="flex items-center justify-between">
    <h3 class="text-base font-semibold text-white">{label}</h3>
    <span class={`inline-flex items-center gap-2 text-xs uppercase tracking-widest ${isRunning ? 'text-sky-300' : 'text-slate-500'}`}>
      <span class="relative flex h-2 w-2">
        <span class={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${isRunning ? 'bg-sky-400' : 'bg-slate-500'}`}></span>
        <span class={`relative inline-flex h-2 w-2 rounded-full ${isRunning ? 'bg-sky-400' : 'bg-slate-500'}`}></span>
      </span>
      {isRunning ? 'Live' : 'Paused'}
    </span>
  </div>
  <div class="text-4xl font-bold tracking-tight text-white">{minutes}:{seconds}</div>
  <div class="flex flex-wrap gap-2 text-xs text-slate-400">
    <button class="chip muted" disabled>Start</button>
    <button class="chip muted" disabled>Split</button>
    <button class="chip muted" disabled>Reset</button>
  </div>
</div>
