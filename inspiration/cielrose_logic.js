/**
 * EXTRACTION DES SCRIPTS CIELROSE.TV (Inspiration)
 * ------------------------------------------------
 * Stack identifiée : Lenis (Scroll), GSAP (Animations & Timeline), Three.js (Rendu vidéo), Express (Serveur).
 * 
 * Voici les mécanismes clés extraits du fonctionnement de leur site :
 */

// ==========================================
// 1. CONFIGURATION DU SMOOTH SCROLL (LENIS)
// ==========================================
// Ils utilisent Lenis pour avoir un scroll extrêmement fluide avec un easing mathématique personnalisé.
const lenis = new Lenis({
    smoothWheel: true,
    syncTouchLerp: 0.075,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Easing exponentiel très doux
    lerp: 0.1,
    orientation: 'vertical',
    gestureOrientation: 'vertical'
});

// ==========================================
// 2. LOGIQUE DU SCROLL MAGNÉTIQUE (GSAP OBSERVER)
// ==========================================
// Contrairement à un simple défilement de div, ils écoutent les gestes bruts de la souris/touchpad
// pour décaler un index global et animer des scènes (ici avec ThreeJS).
// (Similaire à ce que nous avons implémenté avec notre `dragY` et GSAP Observer)

// ==========================================
// 3. LOGIQUE DES TRANSITIONS SPA & THREE.JS
// ==========================================
// Pour éviter toute coupure vidéo lors du clic sur un projet, ils projettent la vidéo 
// sur une géométrie 3D (Mesh) et l'animent pour remplir l'écran, pendant que la page charge en fond.

function initAboutToProjet() {
    this.mesh.name = "transitionnedMesh";
    this.isTransitionnedToProjet = true;

    // Récupère les dimensions réelles de la vidéo vers laquelle on transitionne pour caler la 3D
    this.element = document.querySelector(".projet__hero__media__video");
    this.calculateElementBounds();

    const timeline = gsap.timeline({
        onComplete: () => {
            // Navigation SPA *uniquement après* que la vidéo 3D ait recouvert l'écran
            window.history.pushState({}, "", targetUrl);
        }
    });

    // Animation du Mesh pour remplir l'écran (100vw, 100vh)
    timeline.to(this.mesh.position, { x: 0, y: 0, duration: 1.2, ease: "expo.inOut" });
    timeline.to(this.mesh.scale, { x: window.innerWidth, y: window.innerHeight, duration: 1.2, ease: "expo.inOut" }, 0);
}

// ==========================================
// 4. ROUTAGE AJAX (FETCH & PUSHSTATE)
// ==========================================
// Lorsqu'une navigation démarre, ils récupèrent le HTML en arrière-plan sans tuer le JS en cours.
async function onNavigation(url) {
    const response = await fetch(url);
    const html = await response.text();

    // Parsing manuel
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Récupération de la nouvelle div "content"
    const newContent = doc.querySelector(".content");
    const template = newContent.getAttribute("data-template");

    // Injection dans le DOM existant (ce que Barba gère pour nous)
    document.querySelector(".content").innerHTML = newContent.innerHTML;
    window.history.pushState({}, "", url);

    // Déclenchement des animations d'entrée de la nouvelle page (fondu des textes, etc.)
    await this.transitionWatcher.pageTransiIn(template);
}
