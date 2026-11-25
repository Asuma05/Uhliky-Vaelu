import type { TranslationDictionary } from './cs';

export const en: TranslationDictionary = {
  // App & Document
  'app.title': 'Cinders of Vael',

  // Title / Pause Menu
  'menu.aria_label': 'Main Menu',
  'menu.nav_aria_label': 'Main Navigation',
  'menu.subtitle': '“When the great realm of Vael crumbled to ash, only a dying ember remained in your lantern.”',
  'menu.continue': 'Continue Expedition',
  'menu.new_game': 'New Expedition',
  'menu.custom_seed': 'Custom World Seed',
  'menu.seed_placeholder': 'e.g. ASH-8492',
  'menu.seed_launch': '[ Launch ]',
  'menu.language_label': 'Language',
  'menu.chronicle': 'Chronicle & Controls',
  'menu.quit': 'Quit Game',
  'menu.audio_aria_label': 'Audio Settings',
  'menu.audio_heading': '-- AUDIO --',
  'menu.audio_ambient': 'Music / Ambient',
  'menu.audio_sfx': 'Effects',
  'menu.footer_hint': '[↑/↓] Select · [Enter] Confirm',
  'menu.save_active': 'Active Expedition · Seed {seed}',
  'menu.save_info': 'Seed {seed} · {time}',
  'menu.quit_browser_toast': 'Close this browser tab to exit the game.',

  // Chronicle & Controls Modal
  'chronicle.aria_label': 'Chronicle and Controls',
  'chronicle.title': 'CHRONICLE & CONTROLS',
  'chronicle.close_hint': '[Esc] Close',
  'chronicle.lore_heading': '-- CHRONICLE OF VAEL --',
  'chronicle.lore_p1':
    'Three ages past, the realm of Vael stood upon three pillars: the pale marble of Aethelgard, the iron forges of Kael’Varr, and the salt bastions of Siltmoor. Then came the Night of Ash — the sky blackened, horrors rose from the rifts, and the wardens’ lanterns went dark.',
  'chronicle.lore_p2':
    'You are the last wayfarer bearing a living ember. Wander the ruins and wastes, guard the oil in your lantern, gather forgotten relics, and uncover the truth of Vael’s fall.',
  'chronicle.controls_heading': '-- CONTROLS --',
  'chronicle.ctrl_move_key': '[W A S D] / [Arrows]',
  'chronicle.ctrl_move': 'Move wayfarer',
  'chronicle.ctrl_sprint_key': '[Shift]',
  'chronicle.ctrl_sprint': 'Sprint (drains stamina)',
  'chronicle.ctrl_stealth_key': '[C]',
  'chronicle.ctrl_stealth': 'Sneak (silent step in foliage)',
  'chronicle.ctrl_attack_key': '[LMB] / [Space]',
  'chronicle.ctrl_attack': 'Weapon strike / melee',
  'chronicle.ctrl_dash_key': '[RMB]',
  'chronicle.ctrl_dash': 'Dash toward cursor',
  'chronicle.ctrl_lantern_key': '[F]',
  'chronicle.ctrl_lantern': 'Toggle lantern light',
  'chronicle.ctrl_interact_key': '[E]',
  'chronicle.ctrl_interact': 'Interact (board, travelers, relics)',
  'chronicle.ctrl_inventory_key': '[I] / [Tab]',
  'chronicle.ctrl_inventory': 'Inventory & equipment',
  'chronicle.ctrl_map_key': '[M]',
  'chronicle.ctrl_map': 'Explored world map',
  'chronicle.ctrl_journal_key': '[J]',
  'chronicle.ctrl_journal': 'Quest journal',
  'chronicle.ctrl_zoom_key': '[Mouse Wheel]',
  'chronicle.ctrl_zoom': 'Zoom camera in / out',
  'chronicle.ctrl_mute_key': '[N] / [Esc]',
  'chronicle.ctrl_mute': 'Mute audio / Menu',
  'chronicle.close_btn': '[Esc] Close Chronicle',

  // HUD
  'hud.stat.hp': 'HP',
  'hud.stat.st': 'ST',
  'hud.stat.oil': 'OIL',
  'hud.quest_heading': 'ACTIVE QUEST',
  'hud.quest_none': 'No active quest',
  'hud.quest_all_done': 'All main quests complete',
  'hud.quest_board_hint': 'Quest board [!] in clearing',
  'hud.quest_board_inspect': '[E] Inspect quest board',
  'hud.quest_board_dir': 'Board: {dir} · ~{dist} tiles',
  'hud.ctrl.attack': 'Attack',
  'hud.ctrl.dash': 'Dash',
  'hud.ctrl.action': 'Interact',
  'hud.ctrl.quests': 'Quests',
  'hud.ctrl.lantern': 'Lantern',
  'hud.ctrl.sneak': 'Sneak',
  'hud.ctrl.sneak_active': 'SNEAK',
  'hud.ctrl.inventory': 'Inventory',
  'hud.ctrl.map': 'Map',
  'hud.ctrl.time_weather': 'Time/Weather',
  'hud.ctrl.menu': 'Menu',
  'hud.ctrl.mute': 'Mute',
  'hud.ctrl.mute_active': 'Mute (Muted)',
  'hud.ctrl.zoom': 'Zoom',

  // HUD Status tags
  'hud.tag.fallen': 'FALLEN',
  'hud.tag.dash': 'DASH',
  'hud.tag.no_oil': 'NO OIL',
  'hud.tag.lantern': 'LANTERN',
  'hud.tag.lantern_off': 'LANTERN OFF',
  'hud.tag.sneak': 'SNEAK',
  'hud.tag.sneak_cover': 'SNEAK (COVER)',
  'hud.tag.sprint': 'SPRINT',
  'hud.tag.exhausted': 'EXHAUSTED',
  'hud.tag.frost': 'FROST',
  'hud.tag.torch': 'TORCH',
  'hud.tag.blade': 'BLADE',
  'hud.tag.relic': 'RELIC',
  'hud.tag.relic_multi': 'RELICS ×{count}',
  'hud.tag.mute': 'MUTED',

  // Prompts, Signposts & Death
  'prompt.collect_relic': '[E] Claim relic: {name}',
  'prompt.talk_npc': '[E] Speak with: {name} ({glyph})',
  'prompt.quest_turn_in': '[E] Speak / Turn in completed quest [!]',
  'prompt.quest_board': '[E] Inspect quest board [!]',
  'signpost.header': '[ SIGNPOST ]',
  'signpost.fallback': 'E: Borderland Trail',
  'signpost.crossroads': 'Crossroads of Old Paths',
  'death.title': '+--- FALLEN IN ASH ---+',
  'death.sub_prefix': 'Press',
  'death.sub_suffix': 'to rise at the refuge',

  // Toasts & System Messages
  'toast.saved': 'Saved (Seed: {seed})',
  'toast.new_world': 'New world forged · Seed: {seed}',
  'toast.loaded': 'Expedition loaded · Seed: {seed}',
  'toast.stealth_on': 'Sneaking enabled (silent tread)',
  'toast.stealth_off': 'Sneaking disabled',
  'toast.muted': 'Audio muted',
  'toast.unmuted': 'Audio unmuted',
  'toast.time_of_day': 'Time of day: {label}',
  'toast.weather': 'Weather: {label}',
  'toast.respawn': 'You awaken at the Starting Refuge.',
  'toast.lava_death': 'Consumed by molten fissures… Press [R] to return to the refuge.',
  'toast.poison_death': 'Choked by alchemical miasma… Press [R] to return to the refuge.',
  'toast.ash_death': 'You fell into the ash… Press [R] to return to the refuge.',
  'toast.water_exhausted': 'The current drains your strength!',
  'toast.enemy_defeated': 'Vanquished: {name}',
  'toast.loot_pickup': 'Claimed: {name}',
  'toast.loot_pickup_qty': 'Claimed: {name} ×{qty}',
  'toast.tracked_quest': 'Tracked quest: {title}',
  'toast.gained_item': 'Received: {name}',
  'toast.sketch_revealed': 'Sketch charted: {name} on map [M]',

  // Combat Floating Text
  'combat.no_stamina': 'No stamina!',
  'combat.dodge': 'DODGE!',
  'combat.enemy_fell': '{name} fell',
  'combat.lava': 'Lava',
  'combat.poison': 'Poison',
  'combat.boss.hammer_label': 'CRUSHING HAMMER!',
  'combat.boss.hammer_short': 'HAMMER!',
  'combat.boss.furnace_nova': 'FURNACE NOVA!',
  'combat.boss.poison_mist': 'TOXIC MIST!',
  'combat.boss.light_lunge': 'RADIANT LUNGE!',

  // Environment: Weather & Time Phases
  'weather.sunny': 'Clear',
  'weather.overcast': 'Overcast',
  'weather.fog': 'Fog',
  'weather.rain': 'Rain',
  'weather.storm': 'Rain & Fog',
  'phase.dawn': 'Dawn',
  'phase.sunny_day': 'Sunlit Day',
  'phase.day': 'Day',
  'phase.dusk': 'Dusk',
  'phase.deep_night': 'Deep Night',

  // Compass Directions
  'compass.n': 'N',
  'compass.ne': 'NE',
  'compass.e': 'E',
  'compass.se': 'SE',
  'compass.s': 'S',
  'compass.sw': 'SW',
  'compass.w': 'W',
  'compass.nw': 'NW',

  // Zones & Biomes
  'zone.starting_clearing': 'Starting Clearing',
  'biome.moor_forest': 'Ashen Meadow',
  'biome.marsh': 'Dead Marsh',
  'biome.ash': 'Ashen Wastes',
  'biome.quarry': 'Bleak Quarry',
  'biome.blood_forest': 'Cursed Bloodwood',
  'biome.volcanic': 'Volcanic Rift',
  'biome.frost': 'Frostbound Wastes',
  'biome.bone_plain': 'Bone Plain',

  // POIs (Full Names & Map Short Labels)
  'poi.shelter.name': 'Starting Refuge',
  'poi.shelter.short': 'REFUGE',
  'poi.cathedral.name': 'Desecrated Cathedral',
  'poi.cathedral.short': 'CATHEDRAL',
  'poi.fortress.name': 'Ruined Keep',
  'poi.fortress.short': 'KEEP',
  'poi.graveyard.name': 'Graveyard',
  'poi.graveyard.short': 'GRAVEYARD',
  'poi.village.name': 'Drowned Village',
  'poi.village.short': 'VILLAGE',
  'poi.watchtower.name': 'Old Watchtower',
  'poi.watchtower.short': 'WATCHTOWER',
  'poi.abbey_crypt.name': 'Abbey Crypt',
  'poi.abbey_crypt.short': 'CRYPT',
  'poi.cave.name': 'Cavern Mouth',
  'poi.cave.short': 'CAVERN',
  'poi.city_kaelvarr.name': 'Kael’Varr — The Iron Forge',
  'poi.city_kaelvarr.short': "KAEL'VARR",
  'poi.city_siltmoor.name': 'Siltmoor — The Murky Harbor',
  'poi.city_siltmoor.short': 'SILTMOOR',
  'poi.city_aethelgard.name': 'Aethelgard — White Reliquary',
  'poi.city_aethelgard.short': 'AETHELGARD',

  // Enemies & Bosses
  'enemy.ghoul': 'Ghoul',
  'enemy.ghoul_veteran': 'Bloodied Ghoul',
  'enemy.ghoul_elite': 'Ravenous Ghoul',
  'enemy.skeleton': 'Skeleton',
  'enemy.skeleton_veteran': 'Ancient Skeleton',
  'enemy.skeleton_elite': 'Ash Knight',
  'enemy.boss_ghoul_fallback': 'Elder Ghoul',
  'enemy.boss_skeleton_fallback': 'Lord of Ash',
  'boss.shelter': 'Glade Warden',
  'boss.cathedral': 'Priest of Ash',
  'boss.fortress': 'Lord of the Ruins',
  'boss.graveyard': 'Crypt Warden',
  'boss.village': 'Drowned Fiend',
  'boss.watchtower': 'Watch Captain',
  'boss.abbey_crypt': 'Abbot of Bones',
  'boss.cave': 'Hollow Stalker',
  'boss.city_kaelvarr': 'The Iron Founder',
  'boss.city_siltmoor': 'Alchemist of the Mire',
  'boss.city_aethelgard': 'The Last Inquisitor',

  // Inventory Modal & Actions
  'inv.aria_label': 'Inventory',
  'inv.title': 'WAYFARER’S INVENTORY',
  'inv.close_hint': '[I / Tab / Esc] Close',
  'inv.pane_bag': '-- SATCHEL --',
  'inv.pane_detail': '-- ITEM DETAILS --',
  'inv.group.gear': 'GEAR & RELICS',
  'inv.group.consumables': 'SUPPLIES & ELIXIRS',
  'inv.group.lore_loot': 'SCROLLS & TROPHIES',
  'inv.empty_bag': '(Your satchel lies empty)',
  'inv.tag_new': '[NEW]',
  'inv.tag_equipped': '[EQUIPPED]',
  'inv.meta_equipped': 'EQUIPPED',
  'inv.meta_qty': '×{qty}',
  'inv.meta_in_bag': 'In satchel',
  'inv.no_item': 'No item',
  'inv.no_item_desc': 'Nothing remains in your satchel.',
  'inv.effect_prefix': 'Effect: {text}',
  'inv.close_btn': '[Esc] Close',
  'inv.default_log': 'Select an item with arrows or mouse. [Enter] uses or equips.',
  'inv.action.equip': 'Equip',
  'inv.action.unequip': 'Unequip',
  'inv.action.light': 'Light',
  'inv.action.extinguish': 'Extinguish',
  'inv.action.drink': 'Drink',
  'inv.action.use': 'Use',
  'inv.action.refill': 'Refill',
  'inv.action.read': 'Read',
  'inv.action.inspect': 'Inspect',
  'inv.msg.empty': 'Your satchel is empty.',
  'inv.msg.hp_full': 'Your health is full — no need to waste the draught.',
  'inv.msg.used_heal': 'You used {name} (+{amount} HP).',
  'inv.msg.oil_full': 'Your lantern reservoir is already brimful of oil.',
  'inv.msg.refilled_oil': 'You poured oil into the lantern (+{amount} oil).',
  'inv.msg.relic_equipped': 'Equipped relic {name}. {effect}',
  'inv.msg.relic_unequipped': 'Unequipped relic {name}. Its passive blessing rests.',
  'inv.msg.torch_lit': 'You lit the {name}. A faint amber flame pushes back the gloom.',
  'inv.msg.torch_out': 'You snuffed the {name}. Shadows creep closer once more.',
  'inv.msg.weapon_equipped': 'Equipped {name} (+{bonus} attack).',
  'inv.msg.weapon_unequipped': 'Stowed {name} back in your satchel.',
  'inv.msg.inspected_loot': 'You examine the {name} — a grim trophy from a fallen foe.',
  'inv.msg.cannot_use': '{name} cannot be used.',

  // Inventory Stats & Buffs
  'stats.heading': 'CHARACTER STATS',
  'stats.buffs_heading': 'ACTIVE EFFECTS / BUFFS',
  'stats.hp': 'Health (HP)',
  'stats.stamina': 'Stamina (ST)',
  'stats.stamina_regen': 'Stamina Regen',
  'stats.attack': 'Attack (DMG)',
  'stats.defense': 'Resistance',
  'stats.light_range': 'Light Radius',
  'stats.oil_drain': 'Oil Drain',
  'stats.walk_speed': 'Walk Speed',
  'stats.detection': 'Detection',
  'stats.unit_cells': 'tiles',
  'stats.unit_cells_sec': 't/s',
  'stats.light_off': 'Off ({val} tiles{bonus})',
  'stats.oil_off_suffix': '(off)',
  'stats.detect.sneak_cover': 'sneak C + cover',
  'stats.detect.sneak': 'sneak C',
  'stats.detect.cover': 'foliage cover',
  'stats.detect.lit': 'lit',
  'stats.detect.unlit': 'unlit',
  'stats.buff_relic_meta': 'Relic',
  'stats.buff_empty': 'No active effects',
  'stats.passive_prefix_regex': '^Passive:\\s*',

  // Status Effects / Buffs
  'buff.wet.name': 'Drenched',
  'buff.wet.desc': '-15% stamina regen · -10% walk speed',
  'buff.warmed.name': 'Hearth-Warmed',
  'buff.warmed.desc': '+20% stamina regen',
  'buff.elixir.herbs.name': 'Herbal Poultice',
  'buff.elixir.mire.name': 'Mire Vitality',
  'buff.elixir.crimson.name': 'Crimson Surge',
  'buff.elixir.desc': '+1.5 HP/s · +15% stamina regen',
  'buff.exhausted.name': 'Exhausted',
  'buff.exhausted.time': 'until 18 ST',
  'buff.exhausted.desc': 'Cannot sprint or strike until stamina recovers.',
  'buff.frost.name': 'Frostbite',
  'buff.frost.time': 'zone',
  'buff.frost.desc': '-58% stamina regeneration rate.',
  'buff.sneak.name': 'Sneaking',
  'buff.sneak.name_cover': 'Sneaking (Cover)',
  'buff.sneak.desc': '-44% enemy detection · slower pace',
  'buff.sneak.desc_cover': '-70% detection in foliage · slower pace',

  // Items
  'item.rusted-fang.name': 'Rusted Fang',
  'item.rusted-fang.cat': 'Weapon',
  'item.rusted-fang.desc':
    'A pitted short blade pulled from the ashes of an old watchpost. Rust dulled its shine, not its thirst for blood.',
  'item.rusted-fang.effect': '+4 Attack · One-handed blade (equipable)',

  'item.steel-guard-sword.name': 'Warden’s Steel Blade',
  'item.steel-guard-sword.cat': 'Weapon',
  'item.steel-guard-sword.desc':
    'Tempered steel of the ancient border wardens. Warding runes against the dead are etched along its hilt.',
  'item.steel-guard-sword.effect': '+10 Attack · One-handed blade (equipable)',

  'item.crimson-draught.name': 'Vial of Crimson Draught',
  'item.crimson-draught.cat': 'Elixir',
  'item.crimson-draught.desc':
    'A thick, bitter tonic sealed in clouded glass. Drives the chill from aching bones and knits torn flesh.',
  'item.crimson-draught.effect': 'Restores +35 Health (HP) · Consumes 1',

  'item.old-parchment.name': 'Worn Parchment',
  'item.old-parchment.cat': 'Scroll',
  'item.old-parchment.desc':
    'A soot-stained scroll bound with coarse twine. Its edges are singed and the ink trembles with haste.',
  'item.old-parchment.effect': 'Bears a faded warning about the northern ruins',
  'item.old-parchment.lore':
    '“Beneath the northern arch sleeps an ash that never forgets. Enter not the passage without flame.”',

  'item.dying-torch.name': 'Fading Torch',
  'item.dying-torch.cat': 'Light',
  'item.dying-torch.desc':
    'A pitch-soaked stave wrapped in rotted cloth. Its weak amber tongue pushes back the deepest gloom.',
  'item.dying-torch.effect': 'Extends light radius when lit, or guides without lantern',

  'item.lantern-oil-flask.name': 'Flask of Lantern Oil',
  'item.lantern-oil-flask.cat': 'Fuel',
  'item.lantern-oil-flask.desc':
    'Dark resinous oil inside a wicker-bound flask. Burns slow with a warm, restless amber glow.',
  'item.lantern-oil-flask.effect': 'Restores +50 Lantern Oil · Consumes 1',

  'item.healing-herbs.name': 'Vaelish Healing Herbs',
  'item.healing-herbs.cat': 'Elixir',
  'item.healing-herbs.desc':
    'A bundle of dried highland herbs and ash-moss tied with hemp thread. Swiftly numbs pain and seals wounds.',
  'item.healing-herbs.effect': 'Restores +45 Health (HP) · Consumes 1',

  'item.ember-shard.name': 'Glowing Ember',
  'item.ember-shard.cat': 'Resource',
  'item.ember-shard.desc':
    'A smoldering crystal of ash-heart still holding a spark of the old forges. Wayfarers barter supplies for it.',
  'item.ember-shard.effect': 'Prized currency for trading with travelers',

  'item.relic-iron-hearth.name': 'Heart of the Iron Forge',
  'item.relic-iron-hearth.cat': 'Relic of Vael',
  'item.relic-iron-hearth.desc':
    'A heavy iron medallion cradling an undying cinder from Kael’Varr. Hardens resolve and slows oil burn.',
  'item.relic-iron-hearth.effect': 'Passive: +35% oil efficiency · -22% damage taken',

  'item.relic-mire-alembic.name': 'Alembic of the Mire',
  'item.relic-mire-alembic.cat': 'Relic of Vael',
  'item.relic-mire-alembic.desc':
    'A glass retort from Siltmoor filled with luminescent bog-distillate. Grants tireless breath and spares oil.',
  'item.relic-mire-alembic.effect': 'Passive: +45% stamina regen · +20% oil efficiency',

  'item.relic-old-light.name': 'Relic of the Old Light',
  'item.relic-old-light.cat': 'Relic of Vael',
  'item.relic-old-light.desc':
    'A hallowed sun-ring from Aethelgard’s White Reliquary. Widens lantern light and reveals foes lurking in darkness.',
  'item.relic-old-light.effect': 'Passive: +45% lantern range · Reveals foes in darkness',

  'item.crude-coal-oil.name': 'Crude Coal Oil',
  'item.crude-coal-oil.cat': 'Fuel',
  'item.crude-coal-oil.desc': 'Thick combustible oil from Kael’Varr’s foundries. Burns with a fierce orange flame.',
  'item.crude-coal-oil.effect': 'Restores +70 Lantern Oil · Consumes 1',

  'item.mire-elixir.name': 'Mire Elixir of Mending',
  'item.mire-elixir.cat': 'Elixir',
  'item.mire-elixir.desc': 'A clear pale-green distillate brewed from rare marshland herbs of Siltmoor.',
  'item.mire-elixir.effect': 'Restores +55 Health (HP) · Consumes 1',

  'item.lore-white-reliquary.name': 'Chronicle of the White Reliquary',
  'item.lore-white-reliquary.cat': 'Rare Scroll',
  'item.lore-white-reliquary.desc':
    'Pale vellum bearing the golden seal of Aethelgard, chronicling the final days of Vael’s three great cities.',
  'item.lore-white-reliquary.effect': 'Records the fall of Kael’Varr, Siltmoor, and Aethelgard',
  'item.lore-white-reliquary.lore':
    '“Kael’Varr forged the final gates, Siltmoor drowned its vaults in mire, and Aethelgard sealed the light against the rising dark.”',

  'item.ghoul-claw.name': 'Ghoul Claw',
  'item.ghoul-claw.cat': 'Trophy',
  'item.ghoul-claw.desc':
    'A blackened, hooked talon torn from a graveyard ghoul. Reeks of damp earth and rot.',
  'item.ghoul-claw.effect': 'Trophy from a slain ghoul · Prized alchemical reagent',

  'item.ancient-bone-shard.name': 'Ancient Bone Shard',
  'item.ancient-bone-shard.cat': 'Trophy',
  'item.ancient-bone-shard.desc':
    'A petrified sliver from a skeletal warden’s rib-plate, inscribed with a faded oath of eternal watch.',
  'item.ancient-bone-shard.effect': 'Trophy from a fallen skeleton · Grim relic',

  'item.ashen-chalice.name': 'Blackened Reliquary',
  'item.ashen-chalice.cat': 'Rare Trophy',
  'item.ashen-chalice.desc':
    'A heavy silver chalice recovered from the distant marches. It still radiates the chill of forgotten rites.',
  'item.ashen-chalice.effect': 'Rare relic from a distant site',

  'item.relic-chalice.name': 'Ashen Chalice',
  'item.relic-chalice.cat': 'Relic',
  'item.relic-chalice.desc':
    'A scorched ceremonial chalice hammered from antique gold. Cold embers still smolder within its bowl.',
  'item.relic-chalice.effect': 'Quest item — deliver to the quest board in the Starting Clearing',

  'item.relic-key.name': 'Rusted Crypt Key',
  'item.relic-key.cat': 'Relic',
  'item.relic-key.desc':
    'A heavy iron key crusted with blue-green verdigris and runes of the ancient border watch.',
  'item.relic-key.effect': 'Quest item — deliver to the quest board in the Starting Clearing',

  'item.relic-medallion.name': 'Silver Medallion',
  'item.relic-medallion.cat': 'Relic',
  'item.relic-medallion.desc':
    'A tarnished medallion engraved with a crescent sigil that glimmers softly even in pitch darkness.',
  'item.relic-medallion.effect': 'Quest item — deliver to the quest board in the Starting Clearing',

  // Quests, Quest Board & Journal
  'quest.board.aria_label': 'Quest Board',
  'quest.board.title': 'WATCH QUEST BOARD [!]',
  'quest.board.close_hint': '[E / Esc] Close',
  'quest.board.pane_list': '-- AVAILABLE QUESTS --',
  'quest.board.pane_detail': '-- WATCH LEDGER --',
  'quest.board.close_btn': '[Esc] Leave',
  'quest.board.default_log': 'Select a quest from the list. [Enter] accepts or turns in a completed quest.',
  'quest.board.btn_accept': '[Enter] Accept Quest',
  'quest.board.btn_turn_in': '[Enter] Turn In & Claim Reward',
  'quest.board.btn_track': '[Enter] Track on HUD',
  'quest.board.btn_completed': '[ Completed ]',
  'quest.board.tracking_log': 'Now tracking: {title}.',

  'quest.journal.aria_label': 'Quest Journal',
  'quest.journal.title': 'WAYFARER’S JOURNAL — QUESTS',
  'quest.journal.close_hint': '[J / Esc] Close',
  'quest.journal.pane_list': '-- QUESTS --',
  'quest.journal.pane_detail': '-- OBJECTIVE DETAILS --',
  'quest.journal.btn_track': '[Enter] Track on HUD',
  'quest.journal.btn_tracked': '[ Tracked on HUD ]',
  'quest.journal.btn_accept_board': 'Accept at Quest Board [!]',
  'quest.journal.btn_completed': '[ Completed ]',
  'quest.journal.close_btn': '[Esc] Close',
  'quest.journal.footer_tip': '| Active quest objectives are marked with [!] on the World Map [M].',
  'quest.journal.pinned_tag': ' · [TRACKED]',

  'quest.status.ready': 'Ready to turn in',
  'quest.status.active': 'Active quest',
  'quest.status.completed': 'Completed',
  'quest.status.available': 'New quest',
  'quest.tag.ready': '[READY]',
  'quest.tag.active': '[ACTIVE]',
  'quest.tag.completed': '[DONE]',
  'quest.tag.available': '[NEW]',
  'quest.giver_line': 'Giver: Watch Quest Board (Starting Clearing)',
  'quest.objectives_heading': 'Objectives ({done}/{total})',
  'quest.status_line': 'Status: {status}{extra}',
  'quest.repeat_count': ' · Completed {count}×',
  'quest.reward_line': 'Reward: {reward}',
  'quest.obj_dir': '({dir}, ~{dist} tiles)',
  'quest.map_turn_in': 'TURN IN',

  'quest.cleanse.title': 'Cleanse the Cursed Sites',
  'quest.cleanse.quote':
    '“Darkness stirs within the distant ruins. Unless their wardens fall, the mist will swallow even this refuge.”',
  'quest.cleanse.desc':
    'Track down and vanquish the ancient wardens (mini-bosses) across these three distant sites (250–600 tiles from start): {pois}.',
  'quest.cleanse.reward': 'Warden’s Steel Blade (+10 ATK), +25 Max HP, 2× Crimson Draught',
  'quest.cleanse.reward_log': 'Reward: Warden’s Steel Blade (+10), +25 Max HP, 2× Crimson Draught.',

  'quest.relics.title': 'Forgotten Relics',
  'quest.relics.quote':
    '“Wayfarers before you lost three sacred artifacts among the ruins. Their faint light still calls from the dark.”',
  'quest.relics.desc':
    'Search the marked sites, locate three glowing relics (*), and claim them with [E].',
  'quest.relics.reward': '+25 Max Stamina, 3× Lantern Oil, 2× Crimson Draught',
  'quest.relics.reward_log': 'Reward: +25 Max Stamina, 3× Lantern Oil, 2× Crimson Draught.',

  'quest.hunt.title': 'Hunting Contract',
  'quest.hunt.quote':
    '“The surrounding trails swarm with the restless dead. Every fallen ghoul or skeleton buys another quiet night.”',
  'quest.hunt.desc_any':
    'Venture into the borderlands and slay 5 foes (ghouls or skeletons), then return for your bounty.',
  'quest.hunt.desc_ghoul': 'Patrol the graveyard or village outskirts and put down 5 swift ghouls.',
  'quest.hunt.desc_skeleton': 'Delve into the ruins and shatter 5 skeletal wardens.',
  'quest.hunt.obj_any': 'Slay borderland foes',
  'quest.hunt.obj_ghoul': 'Slay 5 borderland ghouls',
  'quest.hunt.obj_skeleton': 'Slay 5 borderland skeletons',
  'quest.hunt.reward_first': '2× Crimson Draught, 2× Lantern Oil (+5 Max HP first time)',
  'quest.hunt.reward_repeat': '2× Crimson Draught, 2× Lantern Oil (+20 HP)',
  'quest.hunt.reward_log_first': 'Reward: +5 Max HP, 2× Crimson Draught, 2× Lantern Oil.',
  'quest.hunt.reward_log_repeat': 'Reward: 2× Crimson Draught, 2× Lantern Oil (+20 HP).',

  'quest.msg.not_found': 'Quest not found.',
  'quest.msg.already_accepted': 'This quest has already been accepted or completed.',
  'quest.msg.accepted_ready': 'Quest accepted and ready to turn in: {title}!',
  'quest.msg.accepted': 'Accepted quest: {title}.',
  'quest.msg.not_ready': 'This quest’s objectives are not yet complete.',
  'quest.msg.completed': 'Quest complete! {rewardLog}',
  'quest.msg.ready_toast': 'Quest ready to turn in: {title}!',
  'quest.msg.relic_collected_ready': 'Relic claimed: {name} — return to the quest board!',
  'quest.msg.relic_collected_prog': 'Relic claimed: {name} ({done}/{total})',
  'quest.msg.relic_collected': 'Relic claimed: {name}',
  'quest.tracker.ready_prog': 'Done · Turn in at board [!]',
  'quest.tracker.ready_near': 'Refuge (at board [E])',
  'quest.tracker.ready_dir': 'Dir: {dir} · ~{dist} tiles',
  'quest.tracker.hunt_nav': 'Borderlands & cursed ruins',
  'quest.tracker.fallback_prog': 'Progress: {done}/{total}',
  'quest.tracker.fallback_nav': 'Turn in at quest board',
  'quest.tracker.target_nav': 'Target: {dir} · ~{dist} tiles',

  // World Map Overlay
  'map.aria_label': 'World Map',
  'map.title': 'WORLD MAP (ENDLESS)',
  'map.controls_hint': '[Drag] Pan · [Wheel] Zoom · [M / Esc]',
  'map.recenter_btn': '[ Recenter ]',
  'map.close_btn': '[ Close ]',
  'map.meta': 'Pos: {x},{y} · {zone} · Explored: {chunks} chunks · Zoom: {zoom}×',
  'map.legend.you': 'YOU',
  'map.legend.quest': 'Quest',
  'map.legend.ruins': 'Ruins',
  'map.legend.roads': 'Roads',
  'map.legend.river': 'River',
  'map.legend.bridges': 'Bridges/Fords',
  'map.legend.grove': 'Grove',
  'map.legend.marsh': 'Marsh',
  'map.legend.rocks': 'Rocks',
  'map.legend.ash': 'Ash',
  'map.legend.bloodwood': 'Bloodwood',
  'map.legend.lava': 'Lava',
  'map.legend.frost': 'Frost',
  'map.legend.bones': 'Battlefield',
  'map.legend.sketch': 'Sketch',

  // Roadside Travelers (NPCs)
  'npc.aria_label': 'Traveler Dialogue',
  'npc.default_title': 'ROADSIDE WAYFARER',
  'npc.modal_hint': '[1–{count} / Mouse] Choose · [Esc] Part ways',
  'npc.pane_topics': '-- DIALOGUE TOPICS --',
  'npc.pane_trade': '-- BARTER SUPPLIES --',
  'npc.pane_reply': '-- WAYFARER’S REPLY --',
  'npc.close_btn': '[Esc] Leave',
  'npc.default_log': 'Choose with [1–4], arrow keys, or mouse. [Esc] ends dialogue.',
  'npc.meta_biome': '{title} · Biome: {biome}',
  'npc.stock_label': 'Barterable goods/relics: {list}',
  'npc.stock_none': 'None (find *, ,, U, or ?)',
  'npc.btn_no_payment': '[ Need Ember or Relic ]',
  'npc.log.history': '{name} recalls old Vael and the fall of the realm.',
  'npc.log.survival': '{name} shares counsel on surviving the wilds.',
  'npc.log.trade_open': 'Pick supplies to barter [1–{max}] or [{back}] to go back.',
  'npc.log.no_payment': 'You carry no Glowing Ember, relic, or trophy to barter.',
  'npc.log.traded': 'Traded: 1× {paid} for 1× {received}.',
  'npc.log.no_ruins': 'The wayfarer knows of no uncharted ruins nearby.',
  'npc.quote.sketch':
    '“I have marked {poi} upon your chart, bearing {dir} (~{dist} tiles). Open your World Map [M] to see it.”',
  'npc.log.sketch': 'Sketch: {poi} ({dir}, ~{dist} t.) · Revealed {chunks} map sectors.',

  // NPC Roles
  'npc.role.pilgrim.name': 'Lone Pilgrim',
  'npc.role.pilgrim.title': 'Quiet walker of Vael’s broken roads',
  'npc.role.ember_gatherer.name': 'Ember Gatherer',
  'npc.role.ember_gatherer.title': 'Weary ash-scavenger by the fire',
  'npc.role.cartographer.name': 'Old Cartographer',
  'npc.role.cartographer.title': 'Wayfarer laden with maps and calipers',

  // NPC Main Dialog Options
  'npc.opt.history.label': 'Ask about old Vael and the realm’s fall',
  'npc.opt.history.title': 'Chronicle of Old Vael',
  'npc.opt.history.effect': 'Uncover fragments of Vael’s history before the war of horrors',
  'npc.opt.history.btn': '[Enter] Inquire',
  'npc.opt.survival.label': 'Ask for survival counsel in the wilds',
  'npc.opt.survival.title': 'Wilderness Survival Lore',
  'npc.opt.survival.effect': 'Counsel on sneaking [C], lantern [F], sound, and fording rivers',
  'npc.opt.survival.btn': '[Enter] Listen',
  'npc.opt.trade.label': 'Barter / Trade supplies',
  'npc.opt.trade.title': 'Fireside Barter',
  'npc.opt.trade.effect': 'Trade embers or relics for oil, herbs, or a map sketch [M]',
  'npc.opt.trade.btn': '[Enter] Open Barter',
  'npc.opt.farewell.label': 'Part ways',
  'npc.opt.farewell.title': 'Return to the Road',
  'npc.opt.farewell.effect': 'End your conversation with the wayfarer',
  'npc.opt.farewell.btn': '[Enter] Farewell',

  // NPC Trade Options
  'npc.trade.oil.label': 'Trade for Lantern Oil (+1)',
  'npc.trade.oil.title': 'Replenish Lantern Fuel',
  'npc.trade.oil.effect': 'Cost: 1× ember/relic -> 1× Flask of Lantern Oil',
  'npc.trade.oil.btn': '[Enter] Trade for Oil',
  'npc.trade.herbs.label': 'Trade for Healing Herbs (+45 HP)',
  'npc.trade.herbs.title': 'Dried Vaelish Healing Herbs',
  'npc.trade.herbs.effect': 'Cost: 1× ember/relic -> 1× Vaelish Healing Herbs',
  'npc.trade.herbs.btn': '[Enter] Trade for Herbs',
  'npc.trade.sketch.label': 'Buy local map sketch (Map M)',
  'npc.trade.sketch.title': 'Sketch of Forgotten Ruins & Shrines',
  'npc.trade.sketch.effect': 'Cost: 1× ember/relic -> Reveals area on Map [M] and marks [♦]',
  'npc.trade.sketch.btn': '[Enter] Buy Sketch',
  'npc.trade.kaelvarr.label': 'Sketch: Kael’Varr (The Iron Forge)',
  'npc.trade.kaelvarr.title': 'Route Sketch to Kael’Varr',
  'npc.trade.kaelvarr.effect': 'Cost: 1× ember/relic -> Reveals the iron city of Kael’Varr on Map [M]',
  'npc.trade.kaelvarr.btn': '[Enter] Buy Kael’Varr Sketch',
  'npc.trade.siltmoor.label': 'Sketch: Siltmoor (Murky Harbor)',
  'npc.trade.siltmoor.title': 'Route Sketch to Siltmoor',
  'npc.trade.siltmoor.effect': 'Cost: 1× ember/relic -> Reveals the sunken harbor of Siltmoor on Map [M]',
  'npc.trade.siltmoor.btn': '[Enter] Buy Siltmoor Sketch',
  'npc.trade.aethelgard.label': 'Sketch: Aethelgard (White Reliquary)',
  'npc.trade.aethelgard.title': 'Route Sketch to Aethelgard',
  'npc.trade.aethelgard.effect': 'Cost: 1× ember/relic -> Reveals pale Aethelgard on Map [M]',
  'npc.trade.aethelgard.btn': '[Enter] Buy Aethelgard Sketch',
  'npc.trade.back.label': 'Return to dialogue',
  'npc.trade.back.title': 'Back to Dialogue Topics',
  'npc.trade.back.effect': 'Return to asking about Vael’s past and wilderness survival',
  'npc.trade.back.btn': '[Enter] Back',

  // NPC Biome Warnings
  'npc.warn.moor_forest':
    'Warning: The Ashen Meadow feigns peace; ghouls prowl the thickets, yet dense fern (♣, ♠) conceals a quiet tread.',
  'npc.warn.marsh':
    'Warning: The Dead Marsh drags at your boots, and loud wading draws lurking horrors from the reeds.',
  'npc.warn.ash':
    'Warning: The Ashen Wastes lie bare and exposed — patrols spot a lit lantern from far across the cinders.',
  'npc.warn.quarry':
    'Warning: In the Bleak Quarry, footsteps echo sharply off the boulders. Tread softly and slip past patrols.',
  'npc.warn.blood_forest':
    'Warning: The Cursed Bloodwood teems with ravenous ghouls; creep beneath the crimson boughs with your lantern doused.',
  'npc.warn.volcanic':
    'Warning: The Volcanic Rift sears with lava fissures. Dash [RMB] across the cracks, but beware the noise.',
  'npc.warn.frost':
    'Warning: The Frostbound Wastes numb your lungs and slow stamina recovery. Do not waste your breath sprinting.',
  'npc.warn.bone_plain':
    'Warning: The Bone Plain is watched by ash-wardens. Study their patrols and cling to shadow before striking.',

  // NPC Role Dialogue Lines (Greetings, History, Survival, Farewells)
  'npc.pilgrim.greet.0':
    '“Peace to your tread, wayfarer. Sit awhile by the fire before night wakes the shadows of Vael once more.”',
  'npc.pilgrim.greet.1':
    '“Your lantern still burns… A rare omen in these parts. What drives you down the old roads?”',
  'npc.pilgrim.greet.2':
    '“Long have I walked without meeting a living soul outside those cursed patrols. Tell me, what do you seek?”',
  'npc.ember_gatherer.greet.0':
    '“Hold, friend — my hearth is safe enough. Do you carry any glowing embers or old relics in your pack?”',
  'npc.ember_gatherer.greet.1':
    '“The ash has not gone cold, and iron and oil still glint in the rubble. Care to rest, or barter supplies?”',
  'npc.ember_gatherer.greet.2':
    '“Hush, lest we draw ghouls from the thicket. Warm your hands by the flame and name what you need.”',
  'npc.cartographer.greet.0':
    '“Welcome to my campfire! The fog warps my parchment, yet Vael’s old highways remain etched in my memory.”',
  'npc.cartographer.greet.1':
    '“Remarkable that you made it this far unscathed. Seek you the history of this realm, or a sketch of its ruins?”',
  'npc.cartographer.greet.2':
    '“Maps of the golden age are tattered scraps now, yet I still read the ghosts of old spires within them. Ask away.”',

  'npc.pilgrim.history.0':
    '“Once, Vael was a realm of stone highways, learned cities, and watchtowers whose lanterns burned like stars. Its people knew peace and plenty.”',
  'npc.pilgrim.history.1':
    '“Three jewels of the realm — iron-walled Kael’Varr, harbor Siltmoor, and pale Aethelgard — bore Vael’s flame. Then came the war of horrors, and all three fell.”',
  'npc.pilgrim.history.2':
    '“Once the bells fell silent, ash, wilds, and fiends reclaimed the land. In Aethelgard, they say the Last Inquisitor still guards the Relic of the Old Light.”',
  'npc.ember_gatherer.history.0':
    '“Before the war, rich workshops, smithies, and oil vaults lined these hills. Kael’Varr’s iron forges armed and lit the entire kingdom.”',
  'npc.ember_gatherer.history.1':
    '“When the hordes surged in, defenders torched the stores and fled to refuges. Amid Kael’Varr’s cold furnaces, the Iron Founder’s hammer is still said to thunder.”',
  'npc.ember_gatherer.history.2':
    '“Now shadows and restless dead watch over the fallen halls — while in Siltmoor’s swamps, a mad alchemist brews choking vapors.”',
  'npc.cartographer.history.0':
    '“My old charts of thriving Vael hold true no longer. Where merchant roads once ran to Kael’Varr, Siltmoor, and Aethelgard, only briar and ruin remain.”',
  'npc.cartographer.history.1':
    '“The war shattered the stone river bridges and drowned Siltmoor Harbor. Today only rotting walkways lit by green lanterns span the black water.”',
  'npc.cartographer.history.2':
    '“North stands Aethelgard — the White Reliquary of pale marble — while Kael’Varr smolders to the east. Bring me an ember or relic, and I shall chart their paths on your map [M].”',

  'npc.pilgrim.survival.0':
    '“When you sight a patrol of fiends, douse your lantern [F] and crouch with [C]. Creeping quietly through undergrowth (♣, ♠, ↟), you can slip past without bloodshed.”',
  'npc.pilgrim.survival.1':
    '“A lit lantern [F] shines far through night and thick fog — beasts will spot your flame long before they would by day.”',
  'npc.pilgrim.survival.2':
    '“Mind the sound of your steps! Sprinting [Shift], clashing steel, and dashing [RMB] send ripples of noise that draw nearby foes.”',
  'npc.ember_gatherer.survival.0':
    '“When fording a river without a bridge, husband your stamina — deep water slows your stride and loud splashing wakes ghouls far from the bank.”',
  'npc.ember_gatherer.survival.1':
    '“If you must slip past superior numbers, snuff your lantern [F], drop into a crouch [C], and keep to the woodland brush.”',
  'npc.ember_gatherer.survival.2':
    '“Every sword swing and sudden dash [RMB] rings out. Inside ruins, pause and listen before provoking a needless fight.”',
  'npc.cartographer.survival.0':
    '“Watch the signposts in uncharted country and save your breath before wading rivers — an exhausted wayfarer in the current is easy prey.”',
  'npc.cartographer.survival.1':
    '“Press [C] or tap [Shift] briefly to toggle silent sneaking. With your lantern [F] doused at night, you nearly vanish from a patrol’s sight.”',
  'npc.cartographer.survival.2':
    '“Whenever you hear or see sound waves from sprinting or combat, expect the nearest horrors to come investigate the noise.”',

  'npc.pilgrim.farewell.0': '“May your flame endure until you find shelter.”',
  'npc.pilgrim.farewell.1': '“Tread softly, wayfarer. Old Vael has not forgotten you.”',
  'npc.ember_gatherer.farewell.0': '“May your oil hold out and the ash stay quiet beneath your boots.”',
  'npc.ember_gatherer.farewell.1': '“Should you find more embers, you know which hearth I keep.”',
  'npc.cartographer.farewell.0': '“Safe roads and firm ground beneath you, traveler.”',
  'npc.cartographer.farewell.1': '“Check your map [M] now and again — the wilds love to lead souls astray.”',
};
