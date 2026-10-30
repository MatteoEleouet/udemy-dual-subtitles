# Udemy Dual Subtitles

Extension Chrome qui affiche **deux langues de sous-titres en même temps** sur Udemy : la langue
principale (par défaut l'anglais) et, en dessous, une seconde langue plus petite (par défaut le
français).

![icône](icons/icon48.png)

## Ce qu'elle fait

- Lit les pistes de sous-titres de la leçon en cours, celles du menu CC d'Udemy, et en affiche deux,
  synchronisées image par image avec la vidéo.
- Choisit d'abord une piste écrite par l'instructeur, et se rabat sur la piste automatique d'Udemy
  s'il n'y a qu'elle.
- **Si le cours n'a pas la seconde langue**, la traduit avec le traducteur intégré à Chrome, qui tourne
  sur ta machine (Chrome récent requis). La première fois, Chrome peut avoir besoin d'un clic sur la
  page pour télécharger le modèle de langue.
- Masque les sous-titres natifs d'Udemy pour éviter le doublon (désactivable).
- Se place juste au-dessus de la barre de lecture quand elle est affichée, et descend en bas de
  l'image quand elle se rétracte, comme les sous-titres d'Udemy.
- Suit les changements de leçon sans recharger la page, et grossit en plein écran.

Réglages (icône de l'extension) : langues, taille de chaque ligne, marge du bas, masquage des sous-titres
natifs, traduction de secours. Les changements s'appliquent tout de suite sur la vidéo.

## Installer

1. Ouvre `chrome://extensions` et active le **Mode développeur**.
2. **Charger l'extension non empaquetée** → choisis ce dossier (celui qui contient `manifest.json`).
3. Recharge l'onglet Udemy (F5) et lance une leçon.

Pour la mettre à jour après une modification : bouton de rechargement sur sa carte dans
`chrome://extensions`, puis F5 sur l'onglet Udemy.

## Si rien ne s'affiche

Ouvre l'icône de l'extension : le bas du popup dit ce qui est chargé pour la leçon.

| Message | Que faire |
| --- | --- |
| « Recharge l'onglet Udemy » | L'onglet était ouvert avant l'installation : F5 |
| « Ouvre une leçon » | Tu es sur la page de présentation, pas dans le lecteur |
| « pas de sous-titres … pour cette leçon » | La leçon n'a pas cette langue ; essaie la traduction de secours |
| « Udemy API HTTP 401/403 » | Déconnecté, ou pas inscrit à ce cours |
| Sous-titres en double | Coupe les sous-titres d'Udemy (bouton CC du lecteur) |

## Comment c'est fait

Aucune étape de build : les fichiers sont chargés tels quels par Chrome.

| Fichier | Rôle |
| --- | --- |
| `core.js` | Pur : lecture des VTT, réplique à l'instant t, choix de la piste par langue |
| `content.js` | Sur la page : API Udemy (avec ta session), superposition, synchronisation, traduction de secours |
| `background.js` | Télécharge les fichiers de sous-titres sur `udemycdn.com`, et nulle part ailleurs |
| `popup.*` | Réglages et état de la leçon |
| `content.css` | Style des deux lignes, masquage des sous-titres natifs |

La liste des pistes vient de l'API de cours d'Udemy, celle qu'utilise son propre lecteur, lue depuis
la page avec ta session. L'extension ne stocke aucun identifiant et n'envoie rien ailleurs qu'à Udemy.
Cette API n'est pas documentée : un changement côté Udemy peut casser l'extension.

## Tests

```bash
node --test tests/core.test.js
```

Pour voir le rendu sans compte Udemy, `tests/harness.html` simule un lecteur avec une vidéo qui
défile, l'API et le CDN :

```bash
python -m http.server 8765
```

puis ouvre `http://localhost:8765/tests/harness.html`.
