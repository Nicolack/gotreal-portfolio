/**
 * preloader.js
 * GÃ¨re le chargement initial de la page avec une progression animÃ©e.
 */

document.addEventListener("DOMContentLoaded", () => {
    let progress = 0;
    const percentEl = document.getElementById("preloader-percent");
    const preloaderEl = document.getElementById("preloader");

    if (!preloaderEl || !percentEl) return;

    // --- AUTO-INJECTION DU MESH GRADIENT (Pour compatibilitÃ© sur toutes les pages) ---
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
        // Avance alÃ©atoire pour simuler de vrais assets rÃ©seau
        progress += Math.floor(Math.random() * 12) + 4;

        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            percentEl.textContent = progress;

            // Animation de sortie raffinÃ©e
            const tl = gsap.timeline({
                onComplete: () => {
                    preloaderEl.style.display = "none";
                    // Animation d'entrÃ©e des Ã©lÃ©ments principaux amÃ©liorÃ©e
                    gsap.from(".camera-frame-top", {
                        y: -50, opacity: 0, duration: 1, ease: "power3.out"
                    });

                    gsap.from("#main-video-wrapper", {
                        scale: 1.1, opacity: 0, duration: 1.8, ease: "expo.out", delay: 0.1
                    });
                }
            });

            tl.to(".preloader-text", {
                scale: 1.1,
                filter: "blur(20px)",
                opacity: 0,
                duration: 1,
                ease: "power2.inOut"
            })
                .to(".mesh-gradient", {
                    opacity: 0,
                    duration: 1.2,
                    ease: "power2.inOut"
                }, "-=0.8")
                .to(preloaderEl, {
                    opacity: 0,
                    duration: 1,
                    ease: "power2.inOut"
                }, "-=0.5");
        } else {
            percentEl.textContent = progress;
        }
    }, 80); // Vitesse de la simulation
});

