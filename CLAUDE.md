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

Colonnes horizontales défilables, une par tour :

`16es de finale` → `8es de finale` → `Quarts` → `Demis` → `Finale`

- Connecteurs SVG tracés dynamiquement par `drawConnectors()` selon les positions DOM réelles
- Même logique ESPN + refresh que `index.html`
- Noms d'équipes mis à jour depuis ESPN dès qu'ils sont connus
- Lien retour vers `index.html`

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
