# CDM2026

Suivi de matchs en temps réel pour la Coupe du Monde 2026 (USA/Canada/Mexique), adapté au public francophone.

## Architecture

Trois fichiers, aucun build, aucune dépendance npm :

| Fichier | Rôle |
|---|---|
| `index.html` | Liste des matchs + classements de groupe (page principale) |
| `bracket.html` | Tableau de la phase finale en arbre symétrique |
| `shared.js` | Constantes, utilitaires et fetch ESPN partagés entre les deux pages |

Dépendance externe unique : CDN JSDelivr pour `lipis/flag-icons@7.3.2`. Police système.

## Lancer le projet

```bash
python -m http.server 8000
# puis ouvrir http://localhost:8000
```

## Thème visuel

**Vert Pelouse** — palette sombre :

```css
--bg:      #0c1810
--surface: #122016
--surf2:   #1a2e1e
--bd:      rgba(255,255,255,0.06)
--bd2:     rgba(255,255,255,0.11)
--text:    #ecfdf5
--muted:   #4d7a55
--accent:  #4ade80   /* vert vif */
--fr-bg:   rgba(0,35,149,0.20)
--fr-bd:   #002395   /* bleu France */
--nx-bg:   rgba(251,191,36,0.07)
--nx-bd:   #fbbf24   /* or (prochain match) */
--lv-bg:   rgba(248,113,113,0.07)
--lv-bd:   #f87171   /* rouge live (bordure) */
--lv-c:    #f87171   /* rouge live (texte) */
--gold:    #fbbf24   /* or (finale) */
--m6-bg:   rgba(74,222,128,0.12)
--m6-tx:   #86efac
--r:       8px       /* border-radius */
```

## shared.js

- `FLAG` : dict `nom équipe (français) → code ISO` pour les drapeaux (48 équipes)
- `TEAM_EN_FR` : dict `nom ESPN (anglais) → nom français` pour la traduction des noms KO
- `DUR_GROUP = 115 * 60 * 1000` ms, `DUR_KO = 160 * 60 * 1000` ms : durées max pour détection locale "terminé"
- `DAYS` / `MONTHS` : tableaux français pour formatage de dates
- `dayLabel(utc)` : formate en `"Lun 11 juin"` — utilise le locale `en-CA` (format YYYY-MM-DD) puis reconstruit la date UTC pour éviter les dérives de fuseau
- `timeLabel(utc)` : retourne l'heure française (`"21:00"`) via `Intl.DateTimeFormat` timezone `Europe/Paris`
- `parseEspnScores(data, opts)` : parse la réponse ESPN en `scoreMap` (clé `ev.id`) ; `opts.includeVenue = true` ajoute le champ `venue` (utilisé par `index.html` uniquement). ESPN garde `status.type.name === 'STATUS_SHOOTOUT'` même une fois le tirage au but terminé — le flag `status.type.completed` distingue le tirage en cours (`st:'tab'`) du tirage terminé (`st:'ft'`, `extra:'tab'`). Le score des tirs au but (`hso`/`aso`) vient de `competitors[].shootoutScore`.
- `fetchEspnData()` : fetch ESPN avec cache `localStorage` clé `cdm_espn` TTL 20 s ; retourne `null` si hors ligne et pas de cache

ESPN URL : `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=200&dates=20260611-20260719`

## index.html

### Mise en page

Grid 2 colonnes (`1fr 1fr`) + header pleine largeur. Pas de breakpoint mobile dans le CSS actuel.

- **Header** : titre, focus card (match en cours / prochain), heure courante
- **Sidebar gauche** : classements de groupe défilables + lien vers `bracket.html`
- **Colonne droite** : légende + barre de filtre groupe + liste des matchs par jour

### Données MATCHES

72 matchs au total : 48 de poule (Groupes A–L, 4 équipes par groupe) + 24 de phase finale. Chaque entrée :

```js
{
  espnId: "760432",          // ID ESPN — clé primaire du scoreMap
  utc: "2026-06-11T19:00Z",  // heure UTC du coup d'envoi
  m:   "Équipe A - Équipe B",// hardcodé pour la poule ; mis à jour depuis ESPN pour le KO
  g:   "Groupe A",           // ou "16e de finale", "8e de finale", etc.
  tv:  "m6",                 // badge chaîne (optionnel)
  ph:  "ko",                 // présent si phase éliminatoire
  fr:  1,                    // match France (hardcodé pour la poule)
  frIf: ["1I"],              // conditions France pour les phases KO
  final: 1,                  // présent si c'est la finale
}
```

`KO_PHASES = ['16e','8e','Quart','Demi','Petite','Finale']` : préfixes utilisés pour grouper les sections KO.

La France est en **Groupe I**. Les matchs de France en poule ont `fr:1` hardcodé. Pour les matchs KO, `frIf` peut valoir `["1I"]`, `["2I"]` ou `["1I","2I"]` selon le chemin probable.

### State

```js
scoreMap = {}             // espnId → { hs, as, hso, aso, st, min, hname, aname, venue }
activeGroupFilter = null  // nom du groupe filtré ou null
```

### Sections JS

- **ESPN** `fetchScores()` : appelle `parseEspnScores(data, {includeVenue:true})` puis met à jour les noms KO dans `MATCHES` ; peuple `scoreMap` avec `venue`
- **Classements** `computeStandings()` → `{ groups, h2h }` : memoïsée sur `JSON.stringify(scoreMap)` via `_computeStandingsImpl()` — évite le double calcul avec `computeFrancePos()` ; `fifaSort(rows, h2hMap)` : tri officiel FIFA WC 2026 — pts global → H2H (pts/GD/GF) → sous-groupes H2H récursifs → GD global → GF global → alpha
- **Rendu classements** `renderStandings()` : 12 tableaux sur 3 colonnes. Top 2 → `.st-q1` (fond doré). Meilleurs 8 troisièmes qualifiés → `.st-q3ok` (fond orange). Groupe I (France) → `.gtable.fr-group`
- **Filtre groupe** : clic sur l'entête d'un tableau → `toggleGroupFilter(gname)` — filtre les matchs affichés et montre une barre de filtre avec bouton "Tous les matchs"
- **Logique temporelle** `matchState(m)` → `'live'|'ht'|'ft'|'sched'` : ESPN d'abord, fallback local basé sur l'heure écoulée. `liveLabel(m)` : minute ESPN ou label de mi-temps local (fenêtre 46–62 min)
- **Rendu** `render()`, `rowClass()`, `timeCell()`, `matchHtml()` : liste des matchs par jour avec classes `.row.lv/.fr/.nx/.fn`
- **Focus card** `updateStatusBar(next)` : affiche le match live ou le prochain match en haut. `jumpToActive()` : scroll vers le match actif au clic sur la focus card
- **France KO** `computeFrancePos()` → `"1I"|"2I"|"3I"|null` — retourne `null` si scoreMap vide ou si les 3 matchs du groupe ne sont pas tous terminés (`played === 3` pour tous) ; `updateFranceKoFlags()` : qualifié → chemin exact activé, éliminé → `fr=0`, inconnu → tous les parcours possibles allumés. Écrit `localStorage('cdm_fr_pos')` pour `bracket.html`
- **Init** `refresh()` : boucle 30 s si live, 120 s sinon

### Highlights CSS

| Classe | Déclencheur |
|---|---|
| `.row.lv` | match en cours — bordure rouge |
| `.row.fr` | match France — bordure `#002395`, fond bleu |
| `.row.nx` | prochain match — bordure or |
| `.row.fn` | finale — bordure or |
| `.st-q1` | top 2 groupe — fond doré |
| `.st-q3ok` | meilleurs 3es qualifiés — fond orange |
| `.gtable.fr-group` | tableau Groupe I — bordure et header bleus |

## bracket.html

### Mise en page

Bracket double sens, sans défilement, tout en une fenêtre :

```
16es | 8es | Quarts | Demis | Finale | Demis | Quarts | 8es | 16es
      ←— côté gauche —→  centre  ←— côté droit —→
```

La **Finale est au centre** (colonne `#col-rf`, `idx=3`, même niveau que les demis). La petite finale est dans `#third-place` sous la finale, sans connecteur SVG.

### Données MATCHES_KO

Tableau séparé de 32 matchs uniquement (pas de matchs de poule) :

- 16 matchs `g:"r32"` (16es) — 8 côté gauche (indices 0–7), 8 côté droit (indices 8–15)
- 8 matchs `g:"r16"` (8es) — 4 gauche, 4 droite
- 4 matchs `g:"qf"`, 2 `g:"sf"`, 1 `g:"third"`, 1 `g:"final"`

Champs : `espnId, utc, m, g, tv, final`. Pas de `frIf` ni de `fr` hardcodé. Noms mis à jour depuis ESPN dès que connus. Le champ `venue` n'est pas présent dans le `scoreMap` de `bracket.html`.

### State

```js
scoreMap = {}     // espnId → { hs, as, hso, aso, st, min, hname, aname }
currentScale = 1
CARD_H = 66       // mesuré dynamiquement après premier rendu
PAIR_GAP = 6
```

### Positionnement vertical

```js
step(idx)        = 2^idx * (CARD_H + PAIR_GAP)        // distance centre-à-centre
roundGap(idx)    = step(idx) - CARD_H                  // gap CSS entre cartes
firstCenter(idx) = firstCenter(idx-1) + step(idx-1)/2 // Y du 1er centre (base: CARD_H/2)
topOffset(idx)   = firstCenter(idx) - CARD_H/2        // paddingTop de la colonne
```

`CARD_H` est mesuré dynamiquement sur `#r32l .bm` après un premier rendu à gap=0, puis les gaps sont appliqués au second passage. `PAIR_GAP = 6`.

### Auto-scale

```js
currentScale = Math.min(availW / bW, availH / bH, 1.1)
bracket.style.transform = `scale(${currentScale})`
```

Cap à 1.1. Recalculé au `resize`. Les connecteurs SVG sont redessinés après le scale.

### Connecteurs SVG

`drawConnectors()` trace des lignes en L via `getBoundingClientRect`, coordonnées divisées par `currentScale` pour rester dans l'espace SVG non-transformé. `dir='ltr'` (côté gauche) ou `dir='rtl'` (côté droit). L'overlay SVG `#connectors` est en `position:absolute` dans `.bracket`.

### France KO

La mise en évidence France dans `bracket.html` est détectée directement depuis ESPN : `hasFrance = s && (s.hname === 'France' || s.aname === 'France')` dans `cardHtml()`. Il n'y a pas de `updateFranceKoFlags()` ni de lecture de `localStorage` dans ce fichier.

## Conventions

- Variables/fonctions en anglais, UI et commits en français
- Pas de tests automatisés — validation visuelle dans le navigateur
- Horaires stockés en UTC (`.utc`), affichés en heure française
- Tournoi : 11 juin – 19 juillet 2026
- `localStorage` clés : `cdm_espn` (cache ESPN TTL 20 s), `cdm_fr_pos` (position finale France en poule)
