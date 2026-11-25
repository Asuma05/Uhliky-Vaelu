import type { InventoryItem } from './types';

export interface AsciiGlyph {
  glyph: string;
  color: string;
}

export interface AsciiPreview {
  art: string;
  color: string;
}

/**
 * Returns the compact colored ASCII/Unicode symbol for an inventory row.
 */
export function getItemAsciiGlyph(item: InventoryItem): AsciiGlyph {
  if (item.category === 'weapon') {
    return {
      glyph: '†',
      color: item.id === 'steel-guard-sword' ? '#9fd8f0' : '#c98a6b',
    };
  }
  if (item.category === 'light') {
    return {
      glyph: 'i',
      color: item.equipped ? '#ffb347' : '#7b7f8c',
    };
  }
  if (item.category === 'relic') {
    if (item.id === 'relic-mire-alembic') return { glyph: '♦', color: '#62f2a2' };
    if (item.id === 'relic-old-light') return { glyph: '♦', color: '#ffe885' };
    return { glyph: '♦', color: '#f0944d' };
  }
  if (item.category === 'consumable') {
    if (item.oilAmount) {
      return {
        glyph: '≈',
        color: item.id === 'crude-coal-oil' ? '#f0843c' : '#e3b04b',
      };
    }
    if (item.id === 'healing-herbs') {
      return { glyph: '!', color: '#79d48b' };
    }
    if (item.id === 'mire-elixir') {
      return { glyph: '!', color: '#5ce3b8' };
    }
    return { glyph: '!', color: '#e05a5a' };
  }
  if (item.category === 'lore') {
    return {
      glyph: '≡',
      color: item.id === 'lore-white-reliquary' ? '#ebe2cc' : '#b8a98a',
    };
  }
  // Loot / resources
  if (item.id === 'ember-shard') return { glyph: '♦', color: '#ff7a38' };
  if (item.id === 'ghoul-claw') return { glyph: '♦', color: '#9ec488' };
  if (item.id === 'ancient-bone-shard') return { glyph: '♦', color: '#cfc9bc' };
  if (item.id === 'ashen-chalice') return { glyph: '♦', color: '#e5b864' };
  return { glyph: '♦', color: '#b5afa4' };
}

function fitAsciiBlock(lines: readonly string[]): string {
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return lines.join('\n');
  const minIndent = Math.min(...nonEmpty.map((l) => l.length - l.trimStart().length));
  return lines.map((l) => l.slice(minIndent).replace(/\s+$/, '')).join('\n');
}

/**
 * Returns a stylized 5-6 line ASCII illustration in a muted tone for the Detail pane.
 */
export function getItemAsciiPreview(item: InventoryItem): AsciiPreview {
  const raw = getRawAsciiPreview(item);
  return { color: raw.color, art: fitAsciiBlock(raw.lines) };
}

function getRawAsciiPreview(item: InventoryItem): { color: string; lines: string[] } {
  switch (item.id) {
    case 'rusted-fang':
      return {
        color: '#a87d68',
        lines: [
          '    /|',
          '   / |',
          '  /  |',
          '==+==',
          '  ||',
          '  ()',
        ],
      };

    case 'steel-guard-sword':
      return {
        color: '#8ab4c9',
        lines: [
          '   /\\',
          '   ||',
          '   ||',
          ' ==++==',
          '   ||',
          '   ()',
        ],
      };

    case 'dying-torch':
      return item.equipped
        ? {
            color: '#d9954c',
            lines: [
              '  (  )',
              ' ( () )',
              '  \\||/',
              ' [====]',
              '   ||',
              '   ||',
            ],
          }
        : {
            color: '#7c7e8a',
            lines: [
              '  .  .',
              '   ..',
              '  \\||/',
              ' [====]',
              '   ||',
              '   ||',
            ],
          };

    case 'crimson-draught':
      return {
        color: '#b85c5c',
        lines: [
          '  [==]',
          '   )(',
          " .'  '.",
          '/ ~~~~ \\',
          '| ~~~~ |',
          "'------'",
        ],
      };

    case 'mire-elixir':
      return {
        color: '#5ca88e',
        lines: [
          '  [==]',
          '   )(',
          " .'  '.",
          '/ ~~~~ \\',
          '| ~~~~ |',
          "'------'",
        ],
      };

    case 'healing-herbs':
      return {
        color: '#6ca379',
        lines: [
          ' \\ | /',
          '-.\\|/.-',
          ' \\| |/',
          ' =[▓]=',
          '  / \\',
          ' /   \\',
        ],
      };

    case 'lantern-oil-flask':
    case 'crude-coal-oil':
      return {
        color: item.id === 'crude-coal-oil' ? '#c27948' : '#b8944f',
        lines: [
          '  _||_',
          ' / __ \\',
          '| ≈≈≈≈ |',
          '| ≈≈≈≈ |',
          '|______|',
          " '----'",
        ],
      };

    case 'old-parchment':
    case 'lore-white-reliquary':
      return {
        color: item.id === 'lore-white-reliquary' ? '#c4bca8' : '#9c9078',
        lines: [
          '.------.',
          '| ~~~~ |',
          '| ~~~  |',
          '| ~~~~ |',
          '| ____ |',
          "'------'",
        ],
      };

    case 'ember-shard':
      return {
        color: '#c46c43',
        lines: [
          '   /\\',
          '  /♦ \\',
          ' / ♦♦ \\',
          ' \\ ♦♦ /',
          '  \\  /',
          '   \\/',
        ],
      };

    case 'ghoul-claw':
      return {
        color: '#859e78',
        lines: [
          '    __',
          "  .' /",
          " / .'",
          '/ /',
          '|_/',
          '(_)',
        ],
      };

    case 'ancient-bone-shard':
      return {
        color: '#a8a398',
        lines: [
          '()  ()',
          ' \\  /',
          ' |≡≡|',
          ' |  |',
          ' /  \\',
          '()  ()',
        ],
      };

    case 'ashen-chalice':
      return {
        color: '#b89b60',
        lines: [
          '\\______/',
          ' \\    /',
          '  \\  /',
          '   ||',
          '   ||',
          ' _/__\\_',
        ],
      };

    case 'relic-iron-hearth':
      return {
        color: '#c27e4c',
        lines: [
          ' .----.',
          '/  /\\  \\',
          '| (♦♦) |',
          '|  \\/  |',
          '\\      /',
          " '----'",
        ],
      };

    case 'relic-mire-alembic':
      return {
        color: '#5eb586',
        lines: [
          '  _===',
          ' /  __)',
          '/  /',
          '| ≈≈≈ |',
          '| ≈≈≈ |',
          " '---'",
        ],
      };

    case 'relic-old-light':
      return {
        color: '#c9b465',
        lines: [
          '  \\ | /',
          '-- (*) --',
          ' /  |  \\',
          '(   ♦   )',
          ' \\  |  /',
          "  '---'",
        ],
      };

    default:
      return {
        color: '#8f919b',
        lines: [
          '.------.',
          '|      |',
          '|  ♦   |',
          '|      |',
          "'------'",
        ],
      };
  }
}
