import * as migration_20260712_171023_initial from './20260712_171023_initial';

export const migrations = [
  {
    up: migration_20260712_171023_initial.up,
    down: migration_20260712_171023_initial.down,
    name: '20260712_171023_initial'
  },
];
