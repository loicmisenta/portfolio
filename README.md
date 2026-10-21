# Lo?c Misenta ? portfolio

Site public statique sur **https://loicmisenta.github.io/portfolio/**, avec administration sur le PC. L?adresse sera disponible apr?s le premier d?ploiement r?ussi.

Le site pr?sente le parcours, les projets et OWLY en anglais/fran?ais. La route historique /devlog redirige actuellement vers l?accueil. L?administration n?est pas incluse dans le site public.

## Utilisation quotidienne

Dans PowerShell, depuis le dossier du projet :

```powershell
npm.cmd run dev
```

Ouvrir http://localhost:3000/admin et se connecter. Le studio et son API ?coutent uniquement sur cet ordinateur.

1. Modifier les projets, les morceaux OWLY ou le profil.
2. **Enregistrer** : les donn?es restent sur le PC et sont visibles dans l?aper?u local.
3. **Publier sur GitHub** : export des donn?es, v?rification du site, commit du contenu et push sur main.
4. Ouvrir **Suivre le d?ploiement**. Le site est ? jour quand GitHub Actions a termin? avec succ?s. ? Envoy? sur GitHub ? ne signifie pas encore ? d?ploy? ?.

Enregistrer les formulaires avant de publier. Garder le PC et le studio ouverts jusqu?? la fin de l?envoi ; GitHub poursuit ensuite le d?ploiement sans le PC. Une sauvegarde de tout data/ conserve les brouillons, les originaux des m?dias et le hash du mot de passe.

## Premi?re installation

Pr?requis : Git pour Windows et Node.js 24 (minimum 22.13). Depuis une nouvelle copie du projet :

```powershell
npm.cmd ci
npm.cmd run setup
npm.cmd run dev
```

Les d?pendances et un mot de passe sont d?j? pr?sents sur le PC actuel : ne relancer setup que pour choisir un nouveau mot de passe. Il demande au moins 12 caract?res et enregistre un hash scrypt dans data/admin.json. Red?marrer le studio apr?s un changement.

## Premier d?ploiement GitHub Pages

### 1. Cr?er le d?p?t

Sur https://github.com/new, cr?er **loicmisenta/portfolio**, public pour GitHub Pages avec GitHub Free. Laisser le d?p?t vide, sans README, licence ni gitignore g?n?r?s.

Le code et les m?dias publi?s seront visibles dans le d?p?t. data/, les fichiers .env, les notes locales et les dossiers g?n?r?s sont exclus.

### 2. Pr?parer la version publique

```powershell
cd C:\Users\loicm\Documents\Perso\Website
npm.cmd run export:pages
npm.cmd run build:pages
```

export:pages r?cup?re le contenu actuel de data/content.json et les m?dias r?f?renc?s de data/media/. build:pages produit dist/pages dans un environnement s?par? sans l?admin. Il v?rifie les pages, liens, polices et m?dias sous /portfolio/.

Pour v?rifier l?export en local : `npm.cmd run preview:pages`, puis ouvrir http://127.0.0.1:3040/portfolio/. Arr?ter cet aper?u avec Ctrl+C.

### 3. Relier et envoyer le d?p?t (une seule fois)

Si Git n?a pas encore ?t? initialis? :

```powershell
git init -b main
git remote add origin https://github.com/loicmisenta/portfolio.git
```

V?rifier git status et les fichiers ? envoyer, puis :

```powershell
git add .
git diff --cached --stat
git commit -m "Set up portfolio and GitHub Pages publishing"
git push -u origin main
```

Le premier push peut ouvrir la connexion GitHub dans le navigateur via Git Credential Manager. Utiliser le compte loicmisenta. Les publications suivantes utilisent cette connexion locale. Ne pas ?crire de token dans le code, une URL Git ou le d?p?t.

Si Git demande une identit?, configurer user.name et user.email dans ce d?p?t avant le commit. Ne pas r?initialiser ni forcer un d?p?t existant ; synchroniser son historique si n?cessaire.

### 4. Activer Pages

Sur GitHub : **portfolio ? Settings ? Pages ? Build and deployment ? Source ? GitHub Actions**.

Le workflow .github/workflows/deploy-pages.yml installe les d?pendances, v?rifie TypeScript, ex?cute les tests, construit dist/pages et le d?ploie. S?il a ?chou? avant l?activation de Pages, relancer le workflow depuis Actions ? Deploy portfolio to GitHub Pages ? Run workflow.

### 5. V?rifier le r?sultat

Attendre que le workflow soit vert, puis ouvrir :

- https://loicmisenta.github.io/portfolio/
- https://loicmisenta.github.io/portfolio/projects/
- https://loicmisenta.github.io/portfolio/owly/

Tester les liens, EN/FR et la lecture audio. /portfolio/admin/ doit retourner une erreur 404. Pour les publications suivantes, utiliser le bouton du studio.

## Publication et d?pannage

La publication refuse les changements de code non commit?s, les fichiers d?j? pr?par?s dans Git, une autre branche que main, une destination autre que loicmisenta/portfolio, ou un historique GitHub plus r?cent. Elle ne force jamais le push et n?inclut que content/initial.json et les m?dias UUID dans public/media/.

- **Changements de code** : terminer leur commit puis republier depuis le studio.
- **GitHub contient des changements** : arr?ter l??dition et synchroniser le d?p?t dans un terminal ; r?soudre les conflits avant de republier.
- **Connexion GitHub** : v?rifier qu?un git push manuel fonctionne. Le studio ?vite d?ouvrir des demandes d?identification pendant une publication.
- **Push interrompu** : r?essayer ; le commit d?j? cr?? sera envoy? sans doublon de contenu.
- **Construction ?chou?e** : corriger l?erreur puis r?essayer. La derni?re version d?ploy?e reste disponible.
- **Verrou apr?s arr?t brutal** : v?rifier qu?aucune publication ne tourne, puis supprimer uniquement le fichier .publish-pages.lock ? la racine du projet.

Un seul studio doit ?crire dans data/. Les originaux retir?s d?une publication restent dans data/media/ ; l?export public ne conserve que les fichiers encore utilis?s. Les anciennes versions restent dans l?historique Git.

## M?dias

Audio : MP3, WAV, OGG, FLAC, M4A. Vid?o : MP4, WebM. Images : JPG, PNG, WebP. Limite de l?admin et de l?export : **95 Mio par fichier**, sous la limite GitHub de 100 Mio. L?export complet est limit? ? 1 Gio.

Pr?f?rer MP3 pour les sons et MP4 H.264/AAC pour les vid?os. Aucun transcodage automatique n?est r?alis?. Pour les vid?os volumineuses, pr?voir un h?bergement externe. Git LFS n?est pas utilis? pour Pages.

## Fichiers et commandes

- data/content.json et data/media/ : travail local ; jamais pouss?s.
- data/admin.json : hash du mot de passe local ; jamais export?.
- content/initial.json et public/media/ : version publique suivie dans Git.
- publish.config.json : d?p?t loicmisenta/portfolio et pr?fixe /portfolio.
- scripts/export-pages.mjs : pr?paration du contenu public.
- scripts/build-pages.mjs : construction isol?e dans .pages-build puis sortie dist/pages.
- scripts/publish-pages.mjs : contr?les Git, export, build, commit, push.
- .github/workflows/deploy-pages.yml : construction et d?ploiement sur GitHub.

```powershell
node node_modules/typescript/bin/tsc --noEmit
npm.cmd test
npm.cmd run build:pages
```

Les tests utilisent des donn?es et d?p?ts temporaires isol?s. La commande npm run build reste disponible pour l?ancien export local dist/client ; GitHub Pages utilise build:pages. Le serveur local n?est jamais d?ploy? sur GitHub Pages.

Sources et contexte des projets : voir content/SOURCES.md.

Les waveforms OWLY sont calculées localement avec FFmpeg lors de l’enregistrement ou de l’export. FFmpeg doit être disponible dans le PATH du studio. Les données calculées sont incluses dans le contenu publié ; le navigateur charge l’audio seulement à la lecture (ou lors d’un déplacement dans le morceau). Sans FFmpeg, la lecture reste disponible avec une barre de progression.
