import * as migration_20260712_171023_initial from './20260712_171023_initial';
import * as migration_20260713_164823_add_page_hero_and_layout_blocks from './20260713_164823_add_page_hero_and_layout_blocks';
import * as migration_20260713_174609_add_stream_videos from './20260713_174609_add_stream_videos';
import * as migration_20260713_182719_add_section_header_block from './20260713_182719_add_section_header_block';
import * as migration_20260713_195809_add_header_footer_globals from './20260713_195809_add_header_footer_globals';
import * as migration_20260713_200448_add_media_folders from './20260713_200448_add_media_folders';
import * as migration_20260716_183642_add_hero_video_playback from './20260716_183642_add_hero_video_playback';
import * as migration_20260805_014135_add_pricing_blocks from './20260805_014135_add_pricing_blocks';

export const migrations = [
  {
    up: migration_20260712_171023_initial.up,
    down: migration_20260712_171023_initial.down,
    name: '20260712_171023_initial',
  },
  {
    up: migration_20260713_164823_add_page_hero_and_layout_blocks.up,
    down: migration_20260713_164823_add_page_hero_and_layout_blocks.down,
    name: '20260713_164823_add_page_hero_and_layout_blocks',
  },
  {
    up: migration_20260713_174609_add_stream_videos.up,
    down: migration_20260713_174609_add_stream_videos.down,
    name: '20260713_174609_add_stream_videos',
  },
  {
    up: migration_20260713_182719_add_section_header_block.up,
    down: migration_20260713_182719_add_section_header_block.down,
    name: '20260713_182719_add_section_header_block',
  },
  {
    up: migration_20260713_195809_add_header_footer_globals.up,
    down: migration_20260713_195809_add_header_footer_globals.down,
    name: '20260713_195809_add_header_footer_globals',
  },
  {
    up: migration_20260713_200448_add_media_folders.up,
    down: migration_20260713_200448_add_media_folders.down,
    name: '20260713_200448_add_media_folders',
  },
  {
    up: migration_20260716_183642_add_hero_video_playback.up,
    down: migration_20260716_183642_add_hero_video_playback.down,
    name: '20260716_183642_add_hero_video_playback',
  },
  {
    up: migration_20260805_014135_add_pricing_blocks.up,
    down: migration_20260805_014135_add_pricing_blocks.down,
    name: '20260805_014135_add_pricing_blocks'
  },
];
