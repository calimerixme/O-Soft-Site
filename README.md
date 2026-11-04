# O-Soft - Site de demonstration

Vitrine immersive : O'ERP Manager, O'Scan et O'Pass.

Parcours 3D au scroll, raccourcis vers les logiciels, panier local conserve dans le navigateur. Les noms et visuels sont provisoires. Aucun tarif ni paiement reel n'est configure.

## Site

Apres activation de GitHub Pages : https://calimerixme.github.io/O-Soft-Site/

## Developpement

Avec Node.js 22 ou plus recent :

```sh
node server.mjs
```

Ouvrir http://127.0.0.1:4173. Aucune dependance a installer.

## GitHub Pages

Settings > Pages > Deploy from a branch > main > /docs > Save.

## Fichiers

- docs/ : site statique complet.
- docs/assets/projects.json : catalogue des trois logiciels.
- docs/shop.js : panier de demonstration, sans paiement.
- docs/assets/SOURCES.json : provenance des ressources de reference.
- docs/vendor/licenses/ : licences des bibliotheques distribuees.

## Attribution et etat

Version de travail inspiree d'Active Theory, sans affiliation avec ce studio. Certains textes, medias et elements de scene de la reference subsistent dans cette demonstration et restent attribues a leurs auteurs. Leur mise a disposition ne leur confere pas une nouvelle licence.

Three.js, Draco et les polices conservent leurs licences dans docs/vendor/licenses/. Les images O-Soft ont ete fournies pour ce projet.

Les parcours ont ete testes dans Chrome et en simulation mobile. Les performances sur telephone reel restent a valider.
