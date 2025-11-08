#!/usr/bin/env node
import { refreshLootSnapshot } from './load-loot-data.mjs';

try {
  const records = await refreshLootSnapshot();
  console.log(`Snapshot updated with ${records.length} wiki loot rows.`);
} catch (error) {
  console.error(`Failed to refresh loot snapshot: ${error.message}`);
  process.exit(1);
}
