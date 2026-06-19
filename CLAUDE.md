# CDM2026

Suivi de matchs en temps réel pour la Coupe du Monde 2026 (USA/Canada/Mexique), adapté au public francophone.

## Architecture

Application **single-file** : tout le code (HTML, CSS, JS) est dans `index.html` (~800 lignes). Aucun build, aucune dépendance npm, aucun framework.

Dépendance externe unique : CDN JSDelivr pour `lipis/flag-icons` v7.3.2 (drapeaux des équipes).

## Comment lancer

```bash
python -m http.server 8000
# puis ouvrir http://localhost:8000
```

Ou tout autre serveur HTTP statique. Le fichier peut aussi s'ouvrir directement dans un navigateur (sans serveur) mais certaines fonctionnalités fetch peuvent être bloquées en `file://`.

## Structure de `index.html`

Les sections sont séparées par des commentaires `── Nom ──` :

- **DATA** : tableau `MATCHES` (toutes les rencontres), objet `FLAG` (équipe → code ISO)
- **SCORING** : `scoreMap`, parsing ESPN, détection live/mi-temps
- **STANDINGS** : calcul classements de groupe, `computeFrancePos()`
- **RENDER** : `matchHtml()`, `renderAll()`, mise en évidence France / match en cours
- **INIT / REFRESH** : boucle de rafraîchissement (30s live, 120s sinon)

## Source de données

ESPN API (lecture seule, pas de clé requise) :
```
https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=200&dates=20260611-20260719
```

Fallback : détection locale du temps écoulé si l'API ne répond pas.

## Structures de données clés

```js
// Entrée MATCHES
{ utc: "2026-06-11T23:00:00Z", t: "01h00", m: ["Équipe A", "Équipe B"],
  g: "A", tv: "M6", fr: 1, frIf: [...], v: "Stade", ph: "ko", final: true }

// scoreMap (clé = utc)
{ hs: 2, as: 1, st: "live"|"ht"|"ft"|"sched", min: 67 }
```

## Conventions

- **Langue du code** : anglais pour les noms de variables/fonctions, **français** pour les messages UI et les commits git
- **Commits** : messages en français, co-authorship Claude inclus
- **Pas de tests automatisés** : validation visuelle dans le navigateur
- **Pas de commentaires évidents** : commenter uniquement les invariants non-évidents ou contournements spécifiques

## Focus France

- `fr: 1` sur les matchs de groupe français (hardcodé)
- `frIf` sur les matchs KO (tableau de conditions de groupe)
- `computeFrancePos()` calcule la position finale en phase de groupe et met à jour les flags KO dynamiquement

## Points d'attention

- Les horaires sont stockés en UTC dans `MATCHES.utc`, affichés en heure française (`MATCHES.t`)
- Durée match : 115 min (groupes), 160 min (KO) pour la détection "terminé"
- Mi-temps : fenêtre 45–70 min (inclut arrêts de jeu)
- Le tournoi s'étend du 11 juin au 19 juillet 2026
