export const cs = {
  // App & Document
  'app.title': 'Uhlíky Vaelu',

  // Title / Pause Menu
  'menu.aria_label': 'Hlavní menu',
  'menu.nav_aria_label': 'Hlavní nabídka',
  'menu.subtitle': '„Když velká říše Vaelu lehla popelem, zůstala jen jiskra v tvé lucerně.“',
  'menu.continue': 'Pokračovat ve výpravě',
  'menu.new_game': 'Nová výprava',
  'menu.custom_seed': 'Vlastní seed světa',
  'menu.seed_placeholder': 'Např. ASH-8492',
  'menu.seed_launch': '[ Spustit ]',
  'menu.language_label': 'Jazyk',
  'menu.chronicle': 'Kronika a ovládání',
  'menu.quit': 'Ukončit hru',
  'menu.audio_aria_label': 'Nastavení zvuku',
  'menu.audio_heading': '-- ZVUK --',
  'menu.audio_ambient': 'Hudba / Ambient',
  'menu.audio_sfx': 'Efekty',
  'menu.footer_hint': '[↑/↓] Výběr · [Enter] Potvrdit',
  'menu.save_active': 'Aktivní výprava · Seed {seed}',
  'menu.save_info': 'Seed {seed} · {time}',
  'menu.quit_browser_toast': 'Pro ukončení v prohlížeči zavři tuto kartu.',

  // Chronicle & Controls Modal
  'chronicle.aria_label': 'Kronika a ovládání',
  'chronicle.title': 'KRONIKA A OVLÁDÁNÍ',
  'chronicle.close_hint': '[Esc] Zavřít',
  'chronicle.lore_heading': '-- KRONIKA VAELU --',
  'chronicle.lore_p1':
    'Před třemi věky stála říše Vaelu na třech pilířích: na bílém mramoru Aethelgardu, železných výhních Kael’Varru a solných baštách Siltmooru. Pak přišla Noc popela — obloha zčernala, z rozsedlin vystoupily stíny a lucerny strážců pohasly.',
  'chronicle.lore_p2':
    'Jsi posledním poutníkem, který nese živý uhlík. Bloudíš rozvalinami a pustinami, hlídáš hladinu oleje ve své lucerně, sbíráš zapomenuté relikvie a hledáš pravdu o pádu Vaelu.',
  'chronicle.controls_heading': '-- PŘEHLED OVLÁDÁNÍ --',
  'chronicle.ctrl_move_key': '[W A S D] / [Šipky]',
  'chronicle.ctrl_move': 'Pohyb poutníka',
  'chronicle.ctrl_sprint_key': '[Shift]',
  'chronicle.ctrl_sprint': 'Běh (spotřebovává výdrž)',
  'chronicle.ctrl_stealth_key': '[C]',
  'chronicle.ctrl_stealth': 'Plížení (tichý krok v porostu)',
  'chronicle.ctrl_attack_key': '[LMB] / [Mezerník]',
  'chronicle.ctrl_attack': 'Útok zbraní / úder',
  'chronicle.ctrl_dash_key': '[RMB]',
  'chronicle.ctrl_dash': 'Úskok (Dash) směrem kurzoru',
  'chronicle.ctrl_lantern_key': '[F]',
  'chronicle.ctrl_lantern': 'Zapnout / zhasnout lucernu',
  'chronicle.ctrl_interact_key': '[E]',
  'chronicle.ctrl_interact': 'Interakce (tabule, poutníci, relikvie)',
  'chronicle.ctrl_inventory_key': '[I] / [Tab]',
  'chronicle.ctrl_inventory': 'Inventář a výbava',
  'chronicle.ctrl_map_key': '[M]',
  'chronicle.ctrl_map': 'Mapa prozkoumaného světa',
  'chronicle.ctrl_journal_key': '[J]',
  'chronicle.ctrl_journal': 'Deník úkolů',
  'chronicle.ctrl_zoom_key': '[Kolečko myši]',
  'chronicle.ctrl_zoom': 'Přiblížení / oddálení kamery',
  'chronicle.ctrl_mute_key': '[N] / [Esc]',
  'chronicle.ctrl_mute': 'Ztlumit zvuk / Menu',
  'chronicle.close_btn': '[Esc] Zavřít kroniku',

  // HUD
  'hud.stat.hp': 'HP',
  'hud.stat.st': 'ST',
  'hud.stat.oil': 'OL',
  'hud.quest_heading': 'AKTIVNÍ ÚKOL',
  'hud.quest_none': 'Žádný aktivní úkol',
  'hud.quest_all_done': 'Všechny hlavní úkoly splněny',
  'hud.quest_board_hint': 'Úkolová tabule [!] na mýtině',
  'hud.quest_board_inspect': '[E] Prohlédnout tabuli',
  'hud.quest_board_dir': 'Tabule: {dir} · ~{dist} buněk',
  'hud.ctrl.attack': 'Útok',
  'hud.ctrl.dash': 'Úskok',
  'hud.ctrl.action': 'Akce',
  'hud.ctrl.quests': 'Úkoly',
  'hud.ctrl.lantern': 'Lucerna',
  'hud.ctrl.sneak': 'Plížení',
  'hud.ctrl.sneak_active': 'PLÍŽENÍ',
  'hud.ctrl.inventory': 'Inventář',
  'hud.ctrl.map': 'Mapa',
  'hud.ctrl.time_weather': 'Čas/Počasí',
  'hud.ctrl.menu': 'Menu',
  'hud.ctrl.mute': 'Mute',
  'hud.ctrl.mute_active': 'Mute (Ztlumeno)',
  'hud.ctrl.zoom': 'Zoom',

  // HUD Status tags
  'hud.tag.fallen': 'PADL',
  'hud.tag.dash': 'ÚSKOK',
  'hud.tag.no_oil': 'BEZ OLEJE',
  'hud.tag.lantern': 'LUCERNA',
  'hud.tag.lantern_off': 'LUCERNA ZHASNUTA',
  'hud.tag.sneak': 'PLÍŽENÍ',
  'hud.tag.sneak_cover': 'PLÍŽENÍ (KRYT)',
  'hud.tag.sprint': 'BĚH',
  'hud.tag.exhausted': 'VYČERPÁN',
  'hud.tag.frost': 'MRÁZ',
  'hud.tag.torch': 'POCHODEŇ',
  'hud.tag.blade': 'MEČ',
  'hud.tag.relic': 'RELIKVIE',
  'hud.tag.relic_multi': 'RELIKVIE ×{count}',
  'hud.tag.mute': 'MUTE',

  // Prompts, Signposts & Death
  'prompt.collect_relic': '[E] Sebrat relikvii: {name}',
  'prompt.talk_npc': '[E] Promluvit: {name} ({glyph})',
  'prompt.quest_turn_in': '[E] Promluvit / Odevzdat splněný úkol [!]',
  'prompt.quest_board': '[E] Prohlédnout úkolovou tabuli [!]',
  'signpost.header': '[ ROZCESTNÍK ]',
  'signpost.fallback': 'V: Pohraniční stezka',
  'signpost.crossroads': 'Křižovatka starých stezek',
  'death.title': '+--- PADL JSI V POPELU ---+',
  'death.sub_prefix': 'Stiskni',
  'death.sub_suffix': 'pro návrat k útočišti',

  // Toasts & System Messages
  'toast.saved': 'Uloženo (Seed: {seed})',
  'toast.new_world': 'Nový svět vygenerován · Seed: {seed}',
  'toast.loaded': 'Načtena hra · Seed: {seed}',
  'toast.stealth_on': 'Plížení zapnuto (tichý krok)',
  'toast.stealth_off': 'Plížení vypnuto',
  'toast.muted': 'Zvuk ztlumen',
  'toast.unmuted': 'Zvuk zapnut',
  'toast.time_of_day': 'Denní doba: {label}',
  'toast.weather': 'Počasí: {label}',
  'toast.respawn': 'Povstal jsi u startovního útočiště.',
  'toast.lava_death': 'Spálila tě láva… Stiskni [R] pro návrat k rozcestí.',
  'toast.poison_death': 'Udusila tě alchymistická mlha… Stiskni [R] pro návrat k rozcestí.',
  'toast.ash_death': 'Padl jsi v popelu… Stiskni [R] pro návrat k rozcestí.',
  'toast.water_exhausted': 'Jsi vyčerpaný proudem!',
  'toast.enemy_defeated': 'Porazil jsi: {name}',
  'toast.loot_pickup': 'Sebráno: {name}',
  'toast.loot_pickup_qty': 'Sebráno: {name} ×{qty}',
  'toast.tracked_quest': 'Sledovaný úkol: {title}',
  'toast.gained_item': 'Získáno: {name}',
  'toast.sketch_revealed': 'Nákres odhalil: {name} na mapě [M]',

  // Combat Floating Text
  'combat.no_stamina': 'Bez výdrže!',
  'combat.dodge': 'ÚSKOK!',
  'combat.enemy_fell': '{name} padl',
  'combat.lava': 'Láva',
  'combat.poison': 'Jed',
  'combat.boss.hammer_label': 'DRTIVÉ KLADIVO!',
  'combat.boss.hammer_short': 'KLADIVO!',
  'combat.boss.furnace_nova': 'VÝBUCH PECE!',
  'combat.boss.poison_mist': 'JEDOVATÁ MLHA!',
  'combat.boss.light_lunge': 'SVĚTELNÝ VÝPAD!',

  // Environment: Weather & Time Phases
  'weather.sunny': 'Jasno',
  'weather.overcast': 'Šero',
  'weather.fog': 'Mlha',
  'weather.rain': 'Déšť',
  'weather.storm': 'Déšť a mlha',
  'phase.dawn': 'Úsvit',
  'phase.sunny_day': 'Slunečný den',
  'phase.day': 'Den',
  'phase.dusk': 'Soumrak',
  'phase.deep_night': 'Temná noc',

  // Compass Directions
  'compass.n': 'S',
  'compass.ne': 'SV',
  'compass.e': 'V',
  'compass.se': 'JV',
  'compass.s': 'J',
  'compass.sw': 'JZ',
  'compass.w': 'Z',
  'compass.nw': 'SZ',

  // Zones & Biomes
  'zone.starting_clearing': 'Startovní mýtina',
  'biome.moor_forest': 'Popelavá louka',
  'biome.marsh': 'Mrtvá bažina',
  'biome.ash': 'Popelavá pustina',
  'biome.quarry': 'Skalnatý kamenolom',
  'biome.blood_forest': 'Prokletý krvavý les',
  'biome.volcanic': 'Sopečná trhlina',
  'biome.frost': 'Zmrzlá pustina',
  'biome.bone_plain': 'Kostěná pláň',

  // POIs (Full Names & Map Short Labels)
  'poi.shelter.name': 'Startovní útočiště',
  'poi.shelter.short': 'ÚTOČIŠTĚ',
  'poi.cathedral.name': 'Znesvěcená katedrála',
  'poi.cathedral.short': 'KATEDRÁLA',
  'poi.fortress.name': 'Rozvaliny tvrze',
  'poi.fortress.short': 'TVRZ',
  'poi.graveyard.name': 'Hřbitov',
  'poi.graveyard.short': 'HŘBITOV',
  'poi.village.name': 'Zatopená vesnice',
  'poi.village.short': 'VESNICE',
  'poi.watchtower.name': 'Stará strážní věž',
  'poi.watchtower.short': 'STRÁŽNÍ VĚŽ',
  'poi.abbey_crypt.name': 'Opatská krypta',
  'poi.abbey_crypt.short': 'KRYPTA',
  'poi.cave.name': 'Vstup do jeskyně',
  'poi.cave.short': 'JESKYNĚ',
  'poi.city_kaelvarr.name': 'Kael’Varr — Železná výheň',
  'poi.city_kaelvarr.short': "KAEL'VARR",
  'poi.city_siltmoor.name': 'Siltmoor — Kalný přístav',
  'poi.city_siltmoor.short': 'SILTMOOR',
  'poi.city_aethelgard.name': 'Aethelgard — Bílý relikviář',
  'poi.city_aethelgard.short': 'AETHELGARD',

  // Enemies & Bosses
  'enemy.ghoul': 'Ghúl',
  'enemy.ghoul_veteran': 'Krvavý ghúl',
  'enemy.ghoul_elite': 'Krvežíznivý ghúl',
  'enemy.skeleton': 'Kostlivec',
  'enemy.skeleton_veteran': 'Prastarý kostlivec',
  'enemy.skeleton_elite': 'Rytíř popela',
  'enemy.boss_ghoul_fallback': 'Prastarý ghúl',
  'enemy.boss_skeleton_fallback': 'Pán popela',
  'boss.shelter': 'Strážce mýtiny',
  'boss.cathedral': 'Kněz popela',
  'boss.fortress': 'Pán rozvalin',
  'boss.graveyard': 'Strážce krypty',
  'boss.village': 'Utopený netvor',
  'boss.watchtower': 'Kapitán hlídky',
  'boss.abbey_crypt': 'Opat z kostí',
  'boss.cave': 'Hlídač sluje',
  'boss.city_kaelvarr': 'Železný slévač',
  'boss.city_siltmoor': 'Alchymista z hlubin',
  'boss.city_aethelgard': 'Poslední inkvizitor',

  // Inventory Modal & Actions
  'inv.aria_label': 'Inventář',
  'inv.title': 'INVENTÁŘ POUTNÍKA',
  'inv.close_hint': '[I / Tab / Esc] Zavřít',
  'inv.pane_bag': '-- BATOH --',
  'inv.pane_detail': '-- DETAIL PŘEDMĚTU --',
  'inv.group.gear': 'VÝBAVA A RELIKVIE',
  'inv.group.consumables': 'ZÁSOBY A ELIXÍRY',
  'inv.group.lore_loot': 'ZÁPISY A TROFEJE',
  'inv.empty_bag': '(Batoh zeje prázdnotou)',
  'inv.tag_new': '[NOVÉ]',
  'inv.tag_equipped': '[NASAZENO]',
  'inv.meta_equipped': 'NASAZENO',
  'inv.meta_qty': '{qty} ks',
  'inv.meta_in_bag': 'V batohu',
  'inv.no_item': 'Žádný předmět',
  'inv.no_item_desc': 'V batohu již nic nezbývá.',
  'inv.effect_prefix': 'Efekt: {text}',
  'inv.close_btn': '[Esc] Zavřít',
  'inv.default_log': 'Vyber předmět šipkami nebo myší. [Enter] použije či nasadí.',
  'inv.action.equip': 'Nasadit',
  'inv.action.unequip': 'Sundat',
  'inv.action.light': 'Zapálit',
  'inv.action.extinguish': 'Uhasit',
  'inv.action.drink': 'Vypít',
  'inv.action.use': 'Použít',
  'inv.action.refill': 'Dolít',
  'inv.action.read': 'Přečíst',
  'inv.action.inspect': 'Prohlédnout',
  'inv.msg.empty': 'Batoh je prázdný.',
  'inv.msg.hp_full': 'Zdraví je již plné — odvar není třeba plýtvat.',
  'inv.msg.used_heal': 'Použil jsi {name} (+{amount} HP).',
  'inv.msg.oil_full': 'Nádržka lucerny je již plná oleje.',
  'inv.msg.refilled_oil': 'Dolil jsi olej do lucerny (+{amount} oleje).',
  'inv.msg.relic_equipped': 'Nasadil jsi relikvii {name}. {effect}',
  'inv.msg.relic_unequipped': 'Sundal jsi relikvii {name}. Její pasivní bonus byl pozastaven.',
  'inv.msg.torch_lit': 'Zapálil jsi {name}. Okolí ozářil slabý plamen.',
  'inv.msg.torch_out': 'Uhasil jsi {name}. Tma se opět přiblížila.',
  'inv.msg.weapon_equipped': 'Nasadil jsi {name} (+{bonus} útok).',
  'inv.msg.weapon_unequipped': 'Uložil jsi {name} zpět do batohu.',
  'inv.msg.inspected_loot': 'Prohlédl sis {name} — temná trofej z padlého nepřítele.',
  'inv.msg.cannot_use': 'Předmět {name} nelze použít.',

  // Inventory Stats & Buffs
  'stats.heading': 'STATISTIKY POSTAVY',
  'stats.buffs_heading': 'AKTIVNÍ EFEKTY / BUFFY',
  'stats.hp': 'Zdraví (HP)',
  'stats.stamina': 'Výdrž (ST)',
  'stats.stamina_regen': 'Regen výdrže',
  'stats.attack': 'Útok (DMG)',
  'stats.defense': 'Odolnost',
  'stats.light_range': 'Dosah světla',
  'stats.oil_drain': 'Spotřeba oleje',
  'stats.walk_speed': 'Rychlost chůze',
  'stats.detection': 'Odhalení',
  'stats.unit_cells': 'pol.',
  'stats.unit_cells_sec': 'pol./s',
  'stats.light_off': 'Zhasnuta ({val} pol.{bonus})',
  'stats.oil_off_suffix': '(zhasnuta)',
  'stats.detect.sneak_cover': 'plížení C + kryt',
  'stats.detect.sneak': 'plížení C',
  'stats.detect.cover': 'kryt v porostu',
  'stats.detect.lit': 'světlo',
  'stats.detect.unlit': 'zhasnuto',
  'stats.buff_relic_meta': 'Relikvie',
  'stats.buff_empty': 'Žádné aktivní efekty',
  'stats.passive_prefix_regex': '^Pasivní:\\s*',

  // Status Effects / Buffs
  'buff.wet.name': 'Promočený',
  'buff.wet.desc': '-15 % regenerace výdrže · -10 % rychlost chůze',
  'buff.warmed.name': 'Ohřátý u ohniště',
  'buff.warmed.desc': '+20 % regenerace výdrže',
  'buff.elixir.herbs.name': 'Účinek léčivých bylin',
  'buff.elixir.mire.name': 'Bahenní vitalita',
  'buff.elixir.crimson.name': 'Síla karmínového odvaru',
  'buff.elixir.desc': '+1.5 HP/s · +15 % regenerace výdrže',
  'buff.exhausted.name': 'Vyčerpaný',
  'buff.exhausted.time': 'do 18 ST',
  'buff.exhausted.desc': 'Nelze sprintovat ani útočit, dokud se výdrž neobnoví.',
  'buff.frost.name': 'Mráz',
  'buff.frost.time': 'zóna',
  'buff.frost.desc': '-58 % rychlost regenerace výdrže.',
  'buff.sneak.name': 'Plížení',
  'buff.sneak.name_cover': 'Plížení (Kryt)',
  'buff.sneak.desc': '-44 % dosah odhalení · pomalejší chůze',
  'buff.sneak.desc_cover': '-70 % dosah odhalení v porostu · pomalejší chůze',

  // Items
  'item.rusted-fang.name': 'Zrezivělý tesák',
  'item.rusted-fang.cat': 'Zbraň',
  'item.rusted-fang.desc':
    'Oprýskaná krátká čepel nalezená v popelu staré hlásky. Rez jí vzala lesk, ne však hlad po krvi.',
  'item.rusted-fang.effect': '+4 k útoku · Jednoruční zbraň (lze nasadit)',

  'item.steel-guard-sword.name': 'Ocelový meč strážce',
  'item.steel-guard-sword.cat': 'Zbraň',
  'item.steel-guard-sword.desc':
    'Kalená čepel dávných strážců pohraničí. Na rukojeti jsou vyryté ochranné runy proti nemrtvým.',
  'item.steel-guard-sword.effect': '+10 k útoku · Jednoruční zbraň (lze nasadit)',

  'item.crimson-draught.name': 'Lahvička karmínového odvaru',
  'item.crimson-draught.cat': 'Elixír',
  'item.crimson-draught.desc':
    'Hustá trpká tekutina v zakaleném skle. Na okamžik zažene lezavý chlad z kostí a scelí rány.',
  'item.crimson-draught.effect': 'Obnoví +35 Zdraví (HP) · Spotřebuje 1 ks',

  'item.old-parchment.name': 'Starý pergamen',
  'item.old-parchment.cat': 'Zápis',
  'item.old-parchment.desc':
    'Zčernalý svitek svázaný hrubou nití. Okraje jsou ožehnuté a písmo se třese spěchem.',
  'item.old-parchment.effect': 'Obsahuje zašlý vzkaz o severních ruinách',
  'item.old-parchment.lore':
    '„Pod severním obloukem spí popel, který nezapomíná. Nevstupuj do průchodu bez plamene.“',

  'item.dying-torch.name': 'Dohořívající pochodeň',
  'item.dying-torch.cat': 'Světlo',
  'item.dying-torch.desc':
    'Smolná hůl omotaná zetlelým suknem. Její slabý jantarový plamen rozhání nejhlubší šero.',
  'item.dying-torch.effect': 'Po zapálení zesílí dosvit nebo poslouží bez lucerny',

  'item.lantern-oil-flask.name': 'Lahvička oleje do lucerny',
  'item.lantern-oil-flask.cat': 'Palivo',
  'item.lantern-oil-flask.desc':
    'Tmavý smolný olej v opletené baňce. Hoří pomalu a vydává teplý, neklidný jantarový svit.',
  'item.lantern-oil-flask.effect': 'Doplní +50 Oleje do lucerny · Spotřebuje 1 ks',

  'item.healing-herbs.name': 'Léčivé byliny z Vaelu',
  'item.healing-herbs.cat': 'Elixír',
  'item.healing-herbs.desc':
    'Svazek sušených horských bylin a popelavého mechu, převázaný konopnou nití. Rychle tiší bolest a zaceluje rány.',
  'item.healing-herbs.effect': 'Obnoví +45 Zdraví (HP) · Spotřebuje 1 ks',

  'item.ember-shard.name': 'Žhavý uhlík',
  'item.ember-shard.cat': 'Surovina',
  'item.ember-shard.desc':
    'Tlející krystal popelavého jádra, jenž si uchovává jiskru dávných výhní. Poutníci za něj směňují zásoby.',
  'item.ember-shard.effect': 'Cenná surovina pro směnu u pocestných',

  'item.relic-iron-hearth.name': 'Srdce železné výhně',
  'item.relic-iron-hearth.cat': 'Relikvie Vaelu',
  'item.relic-iron-hearth.desc':
    'Těžký železný medailon s věčně žhavým uhlíkem z Kael’Varru. Zpevňuje zbroj a zpomaluje spotřebu oleje.',
  'item.relic-iron-hearth.effect': 'Pasivní: +35 % výdrže oleje · -22 % utrpěného poškození',

  'item.relic-mire-alembic.name': 'Alchymistický destilátor z hlubin',
  'item.relic-mire-alembic.cat': 'Relikvie Vaelu',
  'item.relic-mire-alembic.desc':
    'Křivule ze Siltmooru naplněná světélkujícím bahenním výtažkem. Dodává tělu neúnavný dech a šetří olej.',
  'item.relic-mire-alembic.effect': 'Pasivní: +45 % regenerace výdrže · +20 % výdrže oleje',

  'item.relic-old-light.name': 'Relikvie starého světla',
  'item.relic-old-light.cat': 'Relikvie Vaelu',
  'item.relic-old-light.desc':
    'Posvátný sluneční prstenec z Bílého relikviáře Aethelgardu. Rozšiřuje svit lucerny a odhaluje skryté nepřátele v temnotě.',
  'item.relic-old-light.effect': 'Pasivní: +45 % dosahu lucerny · Odhaluje nepřátele v temnotě',

  'item.crude-coal-oil.name': 'Surový uhelný olej',
  'item.crude-coal-oil.cat': 'Palivo',
  'item.crude-coal-oil.desc': 'Hustý hořlavý olej z kováren Kael’Varru. Hoří sytým oranžovým plamenem.',
  'item.crude-coal-oil.effect': 'Doplní +70 Oleje do lucerny · Spotřebuje 1 ks',

  'item.mire-elixir.name': 'Bahenní elixír regenerace',
  'item.mire-elixir.cat': 'Elixír',
  'item.mire-elixir.desc': 'Čirý zelenkavý destilát ze vzácných bažinných bylin Siltmooru.',
  'item.mire-elixir.effect': 'Obnoví +55 Zdraví (HP) · Spotřebuje 1 ks',

  'item.lore-white-reliquary.name': 'Kronika bílého relikviáře',
  'item.lore-white-reliquary.cat': 'Vzácný svitek',
  'item.lore-white-reliquary.desc':
    'Bledý pergamen se zlatou pečetí Aethelgardu, popisující poslední dny tří velkých měst Vaelu.',
  'item.lore-white-reliquary.effect': 'Obsahuje záznam o pádu Kael’Varru, Siltmooru a Aethelgardu',
  'item.lore-white-reliquary.lore':
    '„Kael’Varr ukoval poslední brány, Siltmoor utopil své poklady v bažinách a Aethelgard zapečetil světlo před přílivem tmy.“',

  'item.ghoul-claw.name': 'Ghúlí dráp',
  'item.ghoul-claw.cat': 'Kořist',
  'item.ghoul-claw.desc':
    'Zčernalý, zakřivený pařát vytržený hřbitovnímu ghúlovi. Páchne hlínou a zatuchlým masem.',
  'item.ghoul-claw.effect': 'Trofej z padlého ghúla · Cenný alchymistický úlomek',

  'item.ancient-bone-shard.name': 'Úlomek prastaré kosti',
  'item.ancient-bone-shard.cat': 'Kořist',
  'item.ancient-bone-shard.desc':
    'Zkamenělý kus žeberního pancíře kostlivého strážce, popsaný zašlou runou věčné stráže.',
  'item.ancient-bone-shard.effect': 'Trofej z padlého kostlivce · Temná relikvie',

  'item.ashen-chalice.name': 'Zčernalý relikviář',
  'item.ashen-chalice.cat': 'Vzácná kořist',
  'item.ashen-chalice.desc':
    'Těžký stříbrný kalich nalezený v odlehlých končinách pohraničí. Stále z něj sálá chlad dávných rituálů.',
  'item.ashen-chalice.effect': 'Vzácná relikvie ze vzdálené lokace',

  'item.relic-chalice.name': 'Popelavý kalich',
  'item.relic-chalice.cat': 'Relikvie',
  'item.relic-chalice.desc':
    'Zčernalý obřadní kalich vytepaný ze starého zlata. V jeho středu doutná studený popel.',
  'item.relic-chalice.effect': 'Úkolový předmět — odevzdej u úkolové tabule na startovní mýtině',

  'item.relic-key.name': 'Zrezivělý klíč od krypty',
  'item.relic-key.cat': 'Relikvie',
  'item.relic-key.desc':
    'Těžký železný klíč pokrytý modravou rzí a runami dávné stráže pohraničí.',
  'item.relic-key.effect': 'Úkolový předmět — odevzdej u úkolové tabule na startovní mýtině',

  'item.relic-medallion.name': 'Stříbrný medailon',
  'item.relic-medallion.cat': 'Relikvie',
  'item.relic-medallion.desc':
    'Zašlý medailon s vyrytým znakem luny, jenž tiše světélkuje i v hluboké tmě.',
  'item.relic-medallion.effect': 'Úkolový předmět — odevzdej u úkolové tabule na startovní mýtině',

  // Quests, Quest Board & Journal
  'quest.board.aria_label': 'Úkolová tabule',
  'quest.board.title': 'ÚKOLOVÁ TABULE HLÍDKY [!]',
  'quest.board.close_hint': '[E / Esc] Zavřít',
  'quest.board.pane_list': '-- NABÍDKA ÚKOLŮ --',
  'quest.board.pane_detail': '-- ZÁPIS HLÍDKY --',
  'quest.board.close_btn': '[Esc] Odejít',
  'quest.board.default_log': 'Vyber úkol ze seznamu. [Enter] přijme nebo odevzdá splněný úkol.',
  'quest.board.btn_accept': '[Enter] Přijmout úkol',
  'quest.board.btn_turn_in': '[Enter] Odevzdat a získat odměnu',
  'quest.board.btn_track': '[Enter] Sledovat v HUDu',
  'quest.board.btn_completed': '[ Dokončeno ]',
  'quest.board.tracking_log': 'Sleduješ úkol: {title}.',

  'quest.journal.aria_label': 'Deník úkolů',
  'quest.journal.title': 'DENÍK POUTNÍKA — ÚKOLY',
  'quest.journal.close_hint': '[J / Esc] Zavřít',
  'quest.journal.pane_list': '-- ÚKOLY --',
  'quest.journal.pane_detail': '-- PODROBNOSTI CÍLE --',
  'quest.journal.btn_track': '[Enter] Sledovat v HUDu',
  'quest.journal.btn_tracked': '[ Sledováno v HUDu ]',
  'quest.journal.btn_accept_board': 'Přijmi u úkolové tabule [!]',
  'quest.journal.btn_completed': '[ Splněno ]',
  'quest.journal.close_btn': '[Esc] Zavřít',
  'quest.journal.footer_tip': '| Cíle aktivních úkolů jsou zvýrazněny symbolem [!] na mapě světa [M].',
  'quest.journal.pinned_tag': ' · [SLEDOVÁN]',

  'quest.status.ready': 'Připraveno k odevzdání',
  'quest.status.active': 'Aktivní úkol',
  'quest.status.completed': 'Splněno',
  'quest.status.available': 'Nový úkol',
  'quest.tag.ready': '[ODEVZDAT]',
  'quest.tag.active': '[AKTIVNÍ]',
  'quest.tag.completed': '[SPLNĚNO]',
  'quest.tag.available': '[NOVÝ]',
  'quest.giver_line': 'Zadavatel: Úkolová tabule hlídky (Startovní mýtina)',
  'quest.objectives_heading': 'Cíle ({done}/{total})',
  'quest.status_line': 'Stav: {status}{extra}',
  'quest.repeat_count': ' · Splněno {count}×',
  'quest.reward_line': 'Odměna: {reward}',
  'quest.obj_dir': '({dir}, ~{dist} buněk)',
  'quest.map_turn_in': 'ODEVZDAT',

  'quest.cleanse.title': 'Očištění prokletých míst',
  'quest.cleanse.quote':
    '„Temnota se probudila v dalekých rozvalinách. Pokud nepadnou jejich strážci, mlha pohltí i toto útočiště.“',
  'quest.cleanse.desc':
    'Vypátrej a poraz prastaré strážce (mini-bosse) v těchto třech vzdálených lokacích (250–600 buněk od startu): {pois}.',
  'quest.cleanse.reward': 'Ocelový meč strážce (+10 útok), +25 Max HP, 2× Karmínový odvar',
  'quest.cleanse.reward_log': 'Odměna: Ocelový meč strážce (+10), +25 Max HP, 2× Karmínový odvar.',

  'quest.relics.title': 'Zapomenuté relikvie',
  'quest.relics.quote':
    '„Poutníci před tebou ztratili v troskách tři posvátné předměty. Jejich slabá záře stále volá z temnoty.“',
  'quest.relics.desc':
    'Prohledej označené lokace, najdi tři zářící relikvie (*) a posbírej je pomocí klávesy [E].',
  'quest.relics.reward': '+25 Max Stamina, 3× Olej do lucerny, 2× Karmínový odvar',
  'quest.relics.reward_log': 'Odměna: +25 Max Stamina, 3× Olej do lucerny, 2× Karmínový odvar.',

  'quest.hunt.title': 'Lovecký kontrakt',
  'quest.hunt.quote':
    '„Okolní stezky se hemží nemrtvými. Každý padlý ghúl či kostlivec znamená bezpečnější noc pro poutníky.“',
  'quest.hunt.desc_any':
    'Vyraz do pohraničí a pobij 5 nepřátel (ghúlů nebo kostlivců), poté se vrať pro odměnu.',
  'quest.hunt.desc_ghoul': 'Vyraz do okolí hřbitova či vesnice a zneškodni 5 rychlých ghúlů.',
  'quest.hunt.desc_skeleton': 'Vydej se do ruin a rozdrť 5 kostlivých strážců.',
  'quest.hunt.obj_any': 'Zabij nepřátele v pohraničí',
  'quest.hunt.obj_ghoul': 'Zabij 5 ghúlů v pohraničí',
  'quest.hunt.obj_skeleton': 'Zabij 5 kostlivců v pohraničí',
  'quest.hunt.reward_first': '2× Karmínový odvar, 2× Olej do lucerny (+5 Max HP poprvé)',
  'quest.hunt.reward_repeat': '2× Karmínový odvar, 2× Olej do lucerny (+20 HP)',
  'quest.hunt.reward_log_first': 'Odměna: +5 Max HP, 2× Karmínový odvar, 2× Olej do lucerny.',
  'quest.hunt.reward_log_repeat': 'Odměna: 2× Karmínový odvar, 2× Olej do lucerny (+20 HP).',

  'quest.msg.not_found': 'Úkol nebyl nalezen.',
  'quest.msg.already_accepted': 'Tento úkol již byl přijat nebo dokončen.',
  'quest.msg.accepted_ready': 'Úkol přijat a připraven k odevzdání: {title}!',
  'quest.msg.accepted': 'Přijal jsi úkol: {title}.',
  'quest.msg.not_ready': 'Cíle tohoto úkolu ještě nejsou splněny.',
  'quest.msg.completed': 'Úkol splněn! {rewardLog}',
  'quest.msg.ready_toast': 'Úkol připraven k odevzdání: {title}!',
  'quest.msg.relic_collected_ready': 'Sebrána relikvie: {name} — vrať se k úkolové tabuli!',
  'quest.msg.relic_collected_prog': 'Sebrána relikvie: {name} ({done}/{total})',
  'quest.msg.relic_collected': 'Sebrána relikvie: {name}',
  'quest.tracker.ready_prog': 'Splněno · Odevzdej u tabule [!]',
  'quest.tracker.ready_near': 'Útočiště (u tabule [E])',
  'quest.tracker.ready_dir': 'Směr: {dir} · ~{dist} buněk',
  'quest.tracker.hunt_nav': 'Pohraničí a prokleté lokace',
  'quest.tracker.fallback_prog': 'Postup: {done}/{total}',
  'quest.tracker.fallback_nav': 'Odevzdej u úkolové tabule',
  'quest.tracker.target_nav': 'Cíl: {dir} · ~{dist} buněk',

  // World Map Overlay
  'map.aria_label': 'Mapa světa',
  'map.title': 'MAPA SVĚTA (NEKONEČNÁ)',
  'map.controls_hint': '[Tažení] Posun · [Kolečko] Zoom · [M / Esc]',
  'map.recenter_btn': '[ Vycentrovat ]',
  'map.close_btn': '[ Zavřít ]',
  'map.meta': 'Pozice: {x},{y} · {zone} · Prozkoumáno: {chunks} chunků · Zoom: {zoom}×',
  'map.legend.you': 'TY',
  'map.legend.quest': 'Úkol',
  'map.legend.ruins': 'Ruiny',
  'map.legend.roads': 'Cesty',
  'map.legend.river': 'Řeka',
  'map.legend.bridges': 'Lávky/Brody',
  'map.legend.grove': 'Lesní háj',
  'map.legend.marsh': 'Bažina',
  'map.legend.rocks': 'Skály',
  'map.legend.ash': 'Popel',
  'map.legend.bloodwood': 'Krvavý les',
  'map.legend.lava': 'Láva',
  'map.legend.frost': 'Mráz',
  'map.legend.bones': 'Bojiště',
  'map.legend.sketch': 'Nákres',

  // Roadside Travelers (NPCs)
  'npc.aria_label': 'Rozhovor s pocestným',
  'npc.default_title': 'POUTNÍK U CESTY',
  'npc.modal_hint': '[1–{count} / Myš] Volba · [Esc] Rozloučit se',
  'npc.pane_topics': '-- TÉMA ROZHOVORU --',
  'npc.pane_trade': '-- SMĚNA ZÁSOB --',
  'npc.pane_reply': '-- ODPOVĚĎ POUTNÍKA --',
  'npc.close_btn': '[Esc] Odejít',
  'npc.default_log': 'Zvol odpověď [1–4], šipkami nebo myší. [Esc] zavře rozhovor.',
  'npc.meta_biome': '{title} · Biom: {biome}',
  'npc.stock_label': 'Nabízené suroviny/relikvie: {list}',
  'npc.stock_none': 'Žádné (najdi *, ,, U nebo ?)',
  'npc.btn_no_payment': '[ Chybí surovina či relikvie ]',
  'npc.log.history': '{name} vzpomíná na starý Vael a pád říše.',
  'npc.log.survival': '{name} ti poradil, jak přežít v divočině.',
  'npc.log.trade_open': 'Vyber zásoby ke směně [1–{max}] nebo [{back}] pro návrat.',
  'npc.log.no_payment': 'Nemáš žádný Žhavý uhlík, relikvii ani trofej ke směně.',
  'npc.log.traded': 'Směněno: 1× {paid} za 1× {received}.',
  'npc.log.no_ruins': 'Poutník v okolí nenašel žádné neznámé ruiny k zakreslení.',
  'npc.quote.sketch':
    '„Zanesl jsem ti do mapy polohu lokace {poi} směrem na {dir} (~{dist} buněk). Otevři přehledovou mapu [M].“',
  'npc.log.sketch': 'Nákres: {poi} ({dir}, ~{dist} b.) · Odhaleno {chunks} úseků mapy.',

  // NPC Roles
  'npc.role.pilgrim.name': 'Osamělý poutník',
  'npc.role.pilgrim.title': 'Tichý chodec cestami Vaelu',
  'npc.role.ember_gatherer.name': 'Sběrač uhlíků',
  'npc.role.ember_gatherer.title': 'Znavený sběrač popela u ohniště',
  'npc.role.cartographer.name': 'Starý kartograf',
  'npc.role.cartographer.title': 'Poutník se svitky map a měřidly',

  // NPC Main Dialog Options
  'npc.opt.history.label': 'Vyptat se na starý Vael a pád říše',
  'npc.opt.history.title': 'Kronika starého Vaelu',
  'npc.opt.history.effect': 'Odhalí útržky historie říše před bitvou s nestvůrami',
  'npc.opt.history.btn': '[Enter] Vyptat se',
  'npc.opt.survival.label': 'Zeptat se na přežití v divočině',
  'npc.opt.survival.title': 'Rady pro přežití v divočině',
  'npc.opt.survival.effect': 'Praktické rady k plížení [C], lucerně [F], hluku a brodění',
  'npc.opt.survival.btn': '[Enter] Vyslechnout radu',
  'npc.opt.trade.label': 'Obchodovat / Vyměnit zásoby',
  'npc.opt.trade.title': 'Směna zásob u ohniště',
  'npc.opt.trade.effect': 'Vyměň suroviny/relikvie za olej, byliny či nákres mapy [M]',
  'npc.opt.trade.btn': '[Enter] Otevřít směnu',
  'npc.opt.farewell.label': 'Rozloučit se',
  'npc.opt.farewell.title': 'Odchod na stezku',
  'npc.opt.farewell.effect': 'Ukončí rozhovor s poutníkem',
  'npc.opt.farewell.btn': '[Enter] Rozloučit se',

  // NPC Trade Options
  'npc.trade.oil.label': 'Směnit za olej do lucerny (+1 ks)',
  'npc.trade.oil.title': 'Doplnění paliva do lucerny',
  'npc.trade.oil.effect': 'Cena: 1× surovina/relikvie -> 1× Lahvička oleje do lucerny',
  'npc.trade.oil.btn': '[Enter] Směnit za olej',
  'npc.trade.herbs.label': 'Směnit za léčivé byliny (+45 HP)',
  'npc.trade.herbs.title': 'Sušené léčivé byliny z Vaelu',
  'npc.trade.herbs.effect': 'Cena: 1× surovina/relikvie -> 1× Léčivé byliny z Vaelu',
  'npc.trade.herbs.btn': '[Enter] Směnit za byliny',
  'npc.trade.sketch.label': 'Získat nákres okolí (mapa M)',
  'npc.trade.sketch.title': 'Nákres zapomenutých ruin a oltářů',
  'npc.trade.sketch.effect': 'Cena: 1× surovina/relikvie -> Odhalí úsek mapy [M] a vyznačí [♦]',
  'npc.trade.sketch.btn': '[Enter] Koupit nákres',
  'npc.trade.kaelvarr.label': 'Nákres: Kael’Varr (Železná výheň)',
  'npc.trade.kaelvarr.title': 'Nákres cesty ke Kael’Varru',
  'npc.trade.kaelvarr.effect': 'Cena: 1× surovina/relikvie -> Odhalí na mapě [M] železnou metropoli Kael’Varr',
  'npc.trade.kaelvarr.btn': '[Enter] Koupit nákres Kael’Varru',
  'npc.trade.siltmoor.label': 'Nákres: Siltmoor (Kalný přístav)',
  'npc.trade.siltmoor.title': 'Nákres cesty k Siltmooru',
  'npc.trade.siltmoor.effect': 'Cena: 1× surovina/relikvie -> Odhalí na mapě [M] bažinný přístav Siltmoor',
  'npc.trade.siltmoor.btn': '[Enter] Koupit nákres Siltmooru',
  'npc.trade.aethelgard.label': 'Nákres: Aethelgard (Bílý relikviář)',
  'npc.trade.aethelgard.title': 'Nákres cesty k Aethelgardu',
  'npc.trade.aethelgard.effect': 'Cena: 1× surovina/relikvie -> Odhalí na mapě [M] bílý Aethelgard',
  'npc.trade.aethelgard.btn': '[Enter] Koupit nákres Aethelgardu',
  'npc.trade.back.label': 'Zpět k rozhovoru',
  'npc.trade.back.title': 'Návrat k tématům rozhovoru',
  'npc.trade.back.effect': 'Vrátí se k otázkám o historii Vaelu a přežití v divočině',
  'npc.trade.back.btn': '[Enter] Zpět',

  // NPC Biome Warnings
  'npc.warn.moor_forest':
    'Varování: Popelavá louka klame klidem; v remízcích hlídkují ghúlové, ale husté kapradí (♣, ♠) kryje plížení.',
  'npc.warn.marsh':
    'Varování: Mrtvá bažina zpomaluje krok a hlasité brodění vodou láká stvůry z rákosí.',
  'npc.warn.ash':
    'Varování: Popelavá pustina je otevřená a holá — bez krytu tě hlídky s lucernou uvidí z velké dálky.',
  'npc.warn.quarry':
    'Varování: Ve skalnatém kamenolomu se zvuk kroků nese mezi balvany. Postupuj tiše a vyhni se hlídkám.',
  'npc.warn.blood_forest':
    'Varování: Prokletý krvavý les je plný hladových ghúlů; pliž se pod rudými korunami bez rozsvícené lucerny.',
  'npc.warn.volcanic':
    'Varování: Sopečná trhlina pálí lávovými průrvami. Přes pukliny skákej úskokem [RMB], ale dej pozor na hluk.',
  'npc.warn.frost':
    'Varování: Zmrzlá pustina zpomaluje obnovu výdrže. Neplýtvej zbytečně během, pokud nemusíš.',
  'npc.warn.bone_plain':
    'Varování: Kostěná pláň je posetá strážci popela. Sleduj hlídky a využívej stín před bojem.',

  // NPC Role Dialogue Lines (Greetings, History, Survival, Farewells)
  'npc.pilgrim.greet.0':
    '„Pokoj tvému kroku, poutníku. Přisedni na chvíli k ohni, než noc znovu probudí stíny Vaelu.“',
  'npc.pilgrim.greet.1':
    '„Tvá lucerna ještě hoří… To je v těchto končinách vzácné znamení. Co tě vede po starých cestách?“',
  'npc.pilgrim.greet.2':
    '„Dlouho jsem nepotkal živou duši, která by nepatřila k těm prokletým hlídkám. Pověz, co hledáš?“',
  'npc.ember_gatherer.greet.0':
    '„Stůj, příteli — u mého ohniště jsi v bezpečí. Máš v batohu nějaké uhlíky či staré relikvie?“',
  'npc.ember_gatherer.greet.1':
    '„Popel ještě nevychladl a v troskách se pořád leskne olej i železo. Chceš si odpočinout, nebo směnit zásoby?“',
  'npc.ember_gatherer.greet.2':
    '„Tiše, ať nepřilákáme ghúly z remízku. Ohřej se u plamene a řekni, co potřebuješ na další cestu.“',
  'npc.cartographer.greet.0':
    '„Vítej u mého táboráku! Pergamen mi vlhne mlhou, ale staré cesty Vaelu mám stále v oku.“',
  'npc.cartographer.greet.1':
    '„Pozoruhodné, že jsi došel až sem bez škrábance. Zajímá tě historie této říše, nebo chceš zakreslit ruiny?“',
  'npc.cartographer.greet.2':
    '„Mapy zlatého věku už jsou jen cáry papíru, přesto v nich čtu stopy dávných staveb. Ptej se, pocestný.“',

  'npc.pilgrim.history.0':
    '„Kdysi byl Vael říší kamenných silnic, učených měst a věží, jejichž lucerny zářily do noci jako hvězdy. Lidé tu žili v hojnosti a míru.“',
  'npc.pilgrim.history.1':
    '„Tři klenoty říše — železná metropole Kael’Varr, přístav Siltmoor a bílý Aethelgard — nesly světlo Vaelu. Pak přišla bitva s nestvůrami a všechna tři města padla.“',
  'npc.pilgrim.history.2':
    '„Jakmile utichly zvony, příroda, popel a nestvůry si zemi vzaly zpět. V Aethelgardu prý Poslední inkvizitor stále střeží relikvii starého světla.“',
  'npc.ember_gatherer.history.0':
    '„Před válkou tu stály bohaté dílny, kovárny a sklady oleje. V železné výhni Kael’Varru kovali zbroj i lampy pro celé království.“',
  'npc.ember_gatherer.history.1':
    '„Když se valily hordy nestvůr, obránci zapálili zásobárny a prchali do útočišť. V Kael’Varru u vyhaslých pecí prý stále duní kladivo Železného slévače.“',
  'npc.ember_gatherer.history.2':
    '„Dnes bohaté rozvaliny hlídají stíny a nemrtví z oné bitvy — v bažinách Siltmooru se pak skrývá šílený alchymista se svými jedovatými výpary.“',
  'npc.cartographer.history.0':
    '„Moje staré mapy kvetoucího Vaelu už neplatí. Kde bývaly rušné obchodní stezky do Kael’Varru, Siltmooru a Aethelgardu, tam dnes roste jen trní a křoví.“',
  'npc.cartographer.history.1':
    '„Bitva s nestvůrami rozbila kamenné mosty přes řeky a zaplavila přístav Siltmoor. Dnes nad černou vodou vedou jen ztrouchnivělé lávky se zelenými lucernami.“',
  'npc.cartographer.history.2':
    '„Na severu stojí Aethelgard — Bílý relikviář z bledého mramoru, zatímco na východě doutná Kael’Varr. Přineseš-li uhlík či relikvii, zakreslím ti cestu k nim do mapy [M].“',

  'npc.pilgrim.survival.0':
    '„Když spatříš hlídku nestvůr, zhasni lucernu [F] a přikrč se klávesou [C]. V tichém plížení v podrostu (♣, ♠, ↟) kolem nich proklouzneš bez boje.“',
  'npc.pilgrim.survival.1':
    '„Rozsvícená lucerna [F] v noci a husté mlze září daleko — nestvůry tě pak zpozorují mnohem dříve než za dne.“',
  'npc.pilgrim.survival.2':
    '„Dávej pozor na zvuk svých kroků! Rychlý běh [Shift], boj i úskok [RMB] šíří vlny hluku, které přilákají nepřátele z okolí.“',
  'npc.ember_gatherer.survival.0':
    '„Při přebrodění řeky bez mostu šetři výdrž a neplýtvej silami — voda zpomaluje krok a hlasité šplouchání budí ghúly daleko od břehu.“',
  'npc.ember_gatherer.survival.1':
    '„Potřebuješ-li projít kolem přesily, zhasni lucernu [F], skloň se do plížení [C] a drž se lesního podrostu.“',
  'npc.ember_gatherer.survival.2':
    '„Každý úder mečem i prudký úskok [RMB] dělá hluk. V ruinách nejprve poslouchej, než vyvoláš zbytečný souboj.“',
  'npc.cartographer.survival.0':
    '„V neznámém terénu sleduj směrovky a šetři síly před broděním řek — vyčerpaný poutník v proudu se stává snadnou kořistí.“',
  'npc.cartographer.survival.1':
    '„Klávesou [C] nebo krátkým klepnutím na [Shift] přepneš tiché plížení. Bez světla lucerny [F] v noci téměř zmizíš ze zraku hlídek.“',
  'npc.cartographer.survival.2':
    '„Pokud uslyšíš či zahlédneš zvukové vlny z běhu nebo boje, počítej s tím, že nejbližší stvůry vyrazí místo prozkoumat.“',

  'npc.pilgrim.farewell.0': '„Kéž tvůj plamen nezhasne dřív, než najdeš útočiště.“',
  'npc.pilgrim.farewell.1': '„Choď tiše, poutníku. Starý Vael na tebe ještě nezapomněl.“',
  'npc.ember_gatherer.farewell.0': '„Ať ti olej vydrží a popel pod nohama zůstane klidný.“',
  'npc.ember_gatherer.farewell.1': '„Najdeš-li další uhlíky, víš, u kterého ohně mě hledat.“',
  'npc.cartographer.farewell.0': '„Šťastnou cestu a pevné stezky pod nohama, cestovateli.“',
  'npc.cartographer.farewell.1': '„Nezapomeň občas nahlédnout do mapy [M] — divočina ráda mate.“',
} as const;

export type TranslationKey = keyof typeof cs;
export type TranslationDictionary = Record<TranslationKey, string>;
