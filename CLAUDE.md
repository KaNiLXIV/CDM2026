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
--accent:  #4ade80   /* vert vif */
--muted:   #4d7a55
--fr-bd:   #002395   /* bleu France */
--lv-c:    #f87171   /* rouge live */
--gold:    #fbbf24   /* or (finale, prochain match) */
```

## shared.js

- `FLAG` : dict `nom équipe (français) → code ISO` pour les drapeaux
- `DUR_GROUP = 115 min`, `DUR_KO = 160 min` : durées max pour détection locale "terminé"
- `utcKey(utc)` : tronque à la minute (`"2026-06-11T19:00Z"`) pour matcher les clés ESPN
- `dayLabel(utc)` : formate en `"Lun 11 juin"` via `Intl.DateTimeFormat` (timezone `Europe/Paris`)
- `fetchEspnData()` : fetch ESPN avec cache `localStorage` TTL 20 s ; retourne `null` si hors ligne et pas de cache

ESPN URL : `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=200&dates=20260611-20260719`

## index.html

### Mise en page

Grid 2 colonnes (`1fr 1fr`) + header pleine largeur. Mobile : 1 colonne sous 680 px.

- **Header** : titre, focus card (match en cours / prochain), heure courante
- **Sidebar gauche** : classements de groupe défilables + lien vers `bracket.html`
- **Colonne droite** : légende + liste des matchs par jour

### Données MATCHES

Tableau de tous les matchs de poule et de phase finale. Chaque entrée :

```js
{
  utc: "2026-06-11T19:00Z",  // heure UTC du coup d'envoi
  t:   "21:00",              // heure française affichée
  m:   "Équipe A - Équipe B",
  g:   "Groupe A",           // ou "16e de finale", "8e de finale", etc.
  tv:  "m6",                 // badge chaîne (optionnel)
  v:   "Stade - Ville",
  ph:  "ko",                 // présent si phase éliminatoire
  fr:  1,                    // match France (hardcodé pour la poule)
  frIf: ["1I"],              // conditions France pour les phases KO
  final: 1,                  // présent si c'est la finale
}
```

`KO_PHASES = ['16e','8e','Quart','Demi','Petite','Finale']` : ordre d'affichage des sections KO.

### State

```js
scoreMap    = {}   // utcKey → { hs, as, st, min, hname, aname }
scoreMapArr = {}   // utcKey → [entrée, entrée, ...] (matchs simultanés)
```

`scoreMapArr` résout les matchs simultanés (même `utcKey`) : chaque entrée est dans l'ordre d'apparition ESPN. `bucketIdx` sert à les consommer dans l'ordre lors de `computeStandings()` et de la mise à jour des noms KO.

### Sections JS

- **ESPN** `fetchScores()` : peuple `scoreMap` et `scoreMapArr` (avec `hname`/`aname` dans chaque entrée) ; met à jour `m.m` pour les matchs KO via `bucketIdx` pour éviter les collisions simultanées
- **Classements** `computeStandings()` / `renderStandings()` : calcule pts/GD/GF par groupe depuis les `ft` de `scoreMapArr` ; highlights `.st-q1` (top 2), `.st-q3ok` (meilleurs 3es qualifiés), `.st-fr` (France)
- **Logique temporelle** `matchState(m)` → `'live'|'ht'|'ft'|'sched'` : ESPN d'abord, fallback local basé sur l'heure écoulée. `liveLabel(m)` : minute ESPN ou label de mi-temps local (fenêtre 46–62 min, alignée sur `matchState`)
- **Rendu** `render()`, `rowClass()`, `timeCell()`, `matchHtml()` : liste des matchs par jour avec classes `.row.lv/.fr/.nx/.fn`
- **Focus card** `updateStatusBar()` : affiche le match live ou le prochain match en haut
- **France KO** `computeFrancePos()` → `"1I"|"2I"|"3I"|null` ; `updateFranceKoFlags()` écrit en `localStorage('cdm_fr_pos')` et met à jour `m.fr` sur les matchs KO via `frIf`
- **Init** `refresh()` : boucle 30 s si live, 120 s sinon

### Highlights CSS

| Classe | Déclencheur |
|---|---|
| `.row.lv` | match en cours — bordure rouge |
| `.row.fr` | match France — bordure `#002395`, fond bleu |
| `.row.nx` | prochain match — bordure or |
| `.row.fn` | finale — bordure or |
| `.st-q1` | top 2 groupe — fond doré |
| `.st-q3ok` | meilleurs 3es — fond orange |
| `.st-fr` | ligne France — fond bleu |

## bracket.html

### Mise en page

Bracket double sens, sans défilement, tout en une fenêtre :

```
16es | 8es | Quarts | Demis | Finale | Demis | Quarts | 8es | 16es
      ←— côté gauche —→  centre  ←— côté droit —→
```

La **Finale est au centre** avec la petite finale en dessous (sans connecteur). Les colonnes miroir sont rendues séparément avec le même algorithme de positionnement.

### Données MATCHES_KO

- 16 matchs `g:"r32"` (16es, #1–#16)
- 8 matchs `g:"r16"` (8es, #1–#8)
- 4 matchs `g:"qf"`, 2 `g:"sf"`, 1 `g:"final"`, 1 `g:"third"`

Même structure que `MATCHES`. Noms mis à jour depuis ESPN dès que connus.

### Positionnement vertical

```js
step(idx)        = 2^idx * (CARD_H + PAIR_GAP)        // distance centre-à-centre
roundGap(idx)    = step(idx) - CARD_H                  // gap CSS entre cartes
firstCenter(idx) = firstCenter(idx-1) + step(idx-1)/2 // Y du 1er centre
topOffset(idx)   = firstCenter(idx) - CARD_H/2        // paddingTop de la colonne
```

`CARD_H` est mesuré dynamiquement après un premier rendu à gap=0. `PAIR_GAP = 6`. La Finale utilise `idx=3` (même niveau que les demis).

### Auto-scale

```js
currentScale = Math.min(availW / bW, availH / bH, 1.1)
bracket.style.transform = `scale(${currentScale})`
```

Cap à 1.1. Recalculé au `resize`. Les connecteurs SVG sont redessinés après le scale.

### Connecteurs SVG

`drawConnectors()` trace des lignes en L via `getBoundingClientRect`, coordonnées divisées par `currentScale` pour rester dans l'espace SVG. `dir='ltr'` (côté gauche) ou `dir='rtl'` (côté droit).

### France KO

`updateFranceKoFlags()` lit `localStorage('cdm_fr_pos')` (écrit par `index.html`) et met à jour `m.fr` via `frIf`. Appelé avant chaque `render()`.

## Conventions

- Variables/fonctions en anglais, UI et commits en français
- Pas de tests automatisés — validation visuelle dans le navigateur
- Horaires stockés en UTC (`.utc`), affichés en heure française (`.t`)
- Tournoi : 11 juin – 19 juillet 2026
