/**
 * preloader.js
 * Gère le chargement initial de la page avec une progression animée.
 */

document.addEventListener("DOMContentLoaded", () => {
    let progress = 0;
    const percentEl = document.getElementById("preloader-percent");
    const preloaderEl = document.getElementById("preloader");

    if (!preloaderEl || !percentEl) return;

    // --- AUTO-INJECTION DU MESH GRADIENT (Pour compatibilité sur toutes les pages) ---
    if (!preloaderEl.querySelector('.mesh-gradient')) {
        const meshContainer = document.createElement('div');
        meshContainer.className = 'mesh-gradient';
        meshContainer.innerHTML = `
            <div class="mesh-blob mesh-1"></div>
            <div class="mesh-blob mesh-2"></div>
            <div class="mesh-blob mesh-3"></div>
        `;
        preloaderEl.prepend(meshContainer);
    }

    // Simulation fluide de chargement des assets
    const interval = setInterval(() => {
        // Avance aléatoire pour simuler de vrais assets réseau
        progress += Math.floor(Math.random() * 12) + 4;

        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            percentEl.textContent = progress;

            // Animation de sortie "Aspiration"
            const tl = gsap.timeline({
                onComplete: () => {
                    preloaderEl.style.display = "none";
                    // La vidéo apparaît en grandissant légèrement (effet pop)
                    gsap.from("#main-video-wrapper", {
                        scale: 0.85, 
                        opacity: 0, 
                        duration: 1.2, 
                        ease: "power4.out"
                    });
                    gsap.from(".camera-frame-top", {
                        y: -30, opacity: 0, duration: 1, ease: "power3.out", delay: 0.2
                    });
                }
            });

            // 1. On cache le texte et le pourcentage d'abord
            tl.to(".preloader-text, .preloader-progress", {
                opacity: 0, 
                y: -30, 
                duration: 0.5, 
                ease: "power2.in"
            })
            // 2. Le preloader (fond + mesh) rétrécit et se fait aspirer au centre
            .to(preloaderEl, {
                scale: 0.1, // Il devient tout petit
                borderRadius: "100%", // Devient une sphère
                opacity: 0, // Disparaît
                duration: 0.8,
                ease: "back.in(1.5)" // Effet d'aspiration dynamique
            }, "-=0.2");

        } else {
            percentEl.textContent = progress;
        }
    }, 80); // Vitesse de la simulation
});