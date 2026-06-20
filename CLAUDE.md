# CDM2026

Suivi de matchs en temps réel pour la Coupe du Monde 2026 (USA/Canada/Mexique), adapté au public francophone.

## Architecture

Application **deux fichiers statiques** : tout le code (HTML, CSS, JS) est en self-contained dans chaque fichier. Aucun build, aucune dépendance npm, aucun framework.

| Fichier | Rôle |
|---|---|
| `index.html` | Liste des matchs + classements de groupe (page principale) |
| `bracket.html` | Tableau de la phase finale en arbre (lié depuis la sidebar) |

Dépendance externe unique : CDN JSDelivr pour `lipis/flag-icons` v7.3.2 (drapeaux des équipes). Police système (`-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui`).

## Comment lancer

```bash
python -m http.server 8000
# puis ouvrir http://localhost:8000
```

Ou tout autre serveur HTTP statique. Le fichier peut aussi s'ouvrir directement dans un navigateur (sans serveur) mais certaines fonctionnalités fetch peuvent être bloquées en `file://`.

## Thème visuel

**Vert Pelouse** — palette sombre à dominante verte :

```css
--bg:      #0c1810   /* fond général */
--surface: #122016   /* cartes/sidebar */
--surf2:   #1a2e1e   /* hover */
--accent:  #4ade80   /* vert vif (titres de phase, dots actifs) */
--muted:   #4d7a55   /* texte secondaire */
--fr-bd:   #002395   /* bleu officiel équipe de France */
--lv-c:    #f87171   /* rouge live */
--gold:    #fbbf24   /* or (prochain match, qualifiés) */
```

## Structure de `index.html`

Mise en page **2 colonnes** (grid `1fr 1fr`) avec header pleine largeur :

- **Header** : titre, focus card (match en cours / prochain), heure courante
- **Sidebar (gauche)** : classements de groupe défilables + lien vers `bracket.html`
- **Colonne droite** : légende + liste des matchs par jour

Sections JS séparées par des commentaires `── Nom ──` :

- **DATA** : tableau `MATCHES` (tous les matchs de poule), objet `FLAG` (équipe → code ISO)
- **ESPN** : `fetchScores()`, parsing des statuts, mise à jour des noms d'équipes KO
- **STANDINGS** : `computeStandings()`, `renderStandings()`, highlights qualifiés
- **RENDER** : `matchHtml()`, `render()`, `updateStatusBar()`, `jumpToActive()`
- **FRANCE KO** : `computeFrancePos()`, `updateFranceKoFlags()`
- **INIT** : boucle `refresh()` (30s live, 120s sinon)

## Structure de `bracket.html`

**Bracket double sens** (arbre symétrique) — pas de défilement, tout tient en une fenêtre :

```
16es | 8es | Quarts | Demis |  Finale  | Demis | Quarts | 8es | 16es
 ←————————————————————————————→  ←————————————————————————————→
       côté gauche (matchs 1-8)       côté droit (matchs 9-16)
```

La **Finale est au centre**, flanquée des deux demis. La petite finale s'affiche sous la finale dans la colonne centrale, sans connecteurs.

### Positionnement vertical

```js
step(idx)        = 2^idx * (CARD_H + PAIR_GAP)   // distance centre-à-centre
roundGap(idx)    = step(idx) - CARD_H             // gap CSS entre cartes
firstCenter(idx) = firstCenter(idx-1) + step(idx-1)/2  // Y du 1er centre
topOffset(idx)   = firstCenter(idx) - CARD_H/2    // paddingTop de la colonne
```

`CARD_H` est **mesuré dynamiquement** après le premier rendu (évite les décalages dus au rendu CSS). `PAIR_GAP = 6`.

La **Finale utilise `idx=3`** (même niveau que les demis) — dans un bracket symétrique les deux SF convergent horizontalement, pas verticalement.

### Connecteurs SVG

`drawConnectors()` trace des lignes en L entre chaque carte source et sa destination :
- Côté gauche : `dir='ltr'` — bord droit source → bord gauche dest
- Côté droit : `dir='rtl'` — bord gauche source → bord droit dest

Les coordonnées DOM (`getBoundingClientRect`) sont divisées par `currentScale` pour rester dans l'espace de coordonnées SVG (qui est à l'intérieur de l'élément scalé).

### Auto-scale

```js
currentScale = Math.min(availW / bW, availH / bH, 1.1)
bracket.style.transform = `scale(${currentScale})`
```

Cap à `1.1` (jusqu'à +10 % si l'espace le permet). Recalculé au `resize`. Les connecteurs SVG sont redessinés après le scale.

### Données MATCHES_KO

- **16 matchs** en `g:"r32"` (16es de finale, matchs 1–16)
- **8 matchs** en `g:"r16"` (8es de finale, matchs 1–8)
- **4 matchs** en `g:"qf"`, **2** en `g:"sf"`, **1** en `g:"final"`, **1** en `g:"third"`

Les 8 matchs r16 sont partagés 4/4 entre côté gauche et droit ; idem pour les 4 qf (2/2) et les 2 sf (1/1).

- Même logique ESPN + refresh que `index.html`
- Noms d'équipes mis à jour depuis ESPN dès qu'ils sont connus (`m.m = "Équipe A - Équipe B"`)
- Format date dans les cartes : `"Dim 28 juin · 21:00"` (mois visible avant l'heure)

## Source de données

ESPN API (lecture seule, pas de clé requise) :
```
https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=200&dates=20260611-20260719
```

Fallback : détection locale du temps écoulé si l'API ne répond pas.

## Structures de données clés

```js
// Entrée MATCHES (index.html)
{ utc: "2026-06-11T19:00Z", t: "21:00", m: "Équipe A - Équipe B",
  g: "Groupe A", tv: "m6", fr: 1, frIf: [...], v: "Stade", ph: "ko", final: 1 }

// Entrée MATCHES_KO (bracket.html) — même structure, phases finales uniquement
{ utc: "2026-06-28T19:00Z", t: "21:00", m: "16e #1", g: "r32", tv: "", v: "Kansas City" }

// scoreMap (clé = utcKey = utc tronqué à la minute)
{ hs: 2, as: 1, st: "live"|"ht"|"ft"|"sched", min: "67'", hname: "FRA", aname: "GER" }
```

## Highlights visuels

### Classements de groupe (`index.html` sidebar)
- `.st-q1` — top 2 de chaque groupe : fond doré `rgba(251,191,36,0.13)`
- `.st-q3ok` — meilleurs 3es qualifiés (8 sur 12) : fond orange `rgba(205,120,50,0.10)`
- `.st-fr` — ligne France : fond bleu `rgba(0,35,149,0.20)`

### Lignes de match
- `.row.lv` — match en cours : bordure rouge
- `.row.fr` — match France : bordure `#002395`, fond bleu, texte `#c8d8ff`
- `.row.nx` — prochain match : bordure or
- `.row.fn` — finale : bordure or

## Focus France

- `fr: 1` sur les matchs de groupe français (hardcodé)
- `frIf` sur les matchs KO (tableau de conditions, ex. `["1I"]` = si France 1re du groupe I)
- `computeFrancePos()` calcule la position finale en phase de groupe et met à jour les flags KO dynamiquement

## Conventions

- **Langue du code** : anglais pour les noms de variables/fonctions, **français** pour les messages UI et les commits git
- **Commits** : messages en français, co-authorship Claude inclus
- **Pas de tests automatisés** : validation visuelle dans le navigateur
- **Pas de commentaires évidents** : commenter uniquement les invariants non-évidents

## Points d'attention

- Les horaires sont stockés en UTC dans `.utc`, affichés en heure française dans `.t`
- `utcKey(utc)` tronque à la minute pour matcher les clés ESPN
- Durée match : 115 min (groupes), 160 min (KO) pour la détection locale "terminé"
- Mi-temps locale : fenêtre 46–62 min depuis le coup d'envoi
- Les matchs simultanés (même `utcKey`) sont gérés via `scoreMapArr` (tableau ordonné par ordre d'apparition ESPN)
- Mobile : la mise en page passe en 1 colonne sous 680 px
- Le tournoi s'étend du 11 juin au 19 juillet 2026
