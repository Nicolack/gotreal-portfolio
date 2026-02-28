?# Analyse et Inspiration de Cielrose.tv

Ce dossier contient les informations tirées de l'analyse en profondeur de notre référence principale : `https://cielrose.tv/`.

## 1. La Stack Technique Observée
Grâce à Wappalyzer et à l'inspection du code (via le navigateur en direct sur le site), nous avons confirmé la stack suivante :
- **GSAP (GreenSock) :** Moteur principal d'animation (notamment les plugins Observer et ScrollTrigger).
- **Three.js :** Moteur de rendu 3D. Le site ne lit pas les vidéos dans des balises `<video>` classiques pour ses transitions, mais les projette comme "textures" sur des éléments 3D.
- **Lenis :** Bibliothèque de "Smooth Scroll" hyper réactive et basée sur les mathématiques.
- **Routage Custom (PushState / Fetch) :** Un système SPA maison pour ne jamais recharger la page.

## 2. Le Mécanisme de Défilement (Scroll)
Sur CielRose, le défilement n'est pas lié à la barre de scroll du navigateur.
Ils utilisent **GSAP Observer** pour intercepter chaque impulsion de la molette ou du doigt.
- **L'Inspiration :** Nous avons reproduit exactement cette logique dans `main.js` via `Observer.create()`. Au lieu d'utiliser un slider ou une barre de défilement native, c'est l'accumulation de l'énergie physique (`dragY`) qui dicte le mouvement et permet l'effet "aimant" (Snapping) sur nos projets.

## 3. Les Transitions "Seamless" (Zéro Coupure)
Le secret de la transition impressionnante de CielRose vers un projet réside dans **Three.js**. Lorsqu'une miniature est cliquée, ils créent un clone 3D (Mesh) de la vidéo, puis animent ce Mesh en CSS (via GSAP) pour qu'il prenne 100% de la largeur et hauteur de l'écran. La page projet charge discrètement en fond et prend le relai.
- **L'Application sur notre projet (Portfolio GOTREAL) :** Puisque GOTREAL/Gotreal n'utilise pas Three.js pour maintenir un DOM classique HTML/CSS, nous avons dû ruser pour obtenir un résultat équivalent, sans Canvas 3D.
- **Notre Solution :** Nous utilisons **GSAP Flip** couplé avec **Barba.js**. Au clic, au lieu d'afficher une simple div de transition, notre algorithme "arrache" physiquement la balise `<video>` présente sur l'accueil, et l'injecte dans la nouvelle page générée par Barba. C'est l'état exact (FlipState) qui est ensuite étiré (Expanded) vers le mode plein écran, assurant une continuité de lecture (audio compris) absolument parfaite, inspirée nativement de CielRose.

## Les Fichiers Piliers 
- `cielrose_logic.js` (Dans ce dossier) : Contient de vrais extraits nettoyés du site original pour observer comment l'équipe fondatrice a structuré son code.

