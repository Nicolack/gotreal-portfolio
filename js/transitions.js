/**
 * transitions.js
 * GÃ¨re le routage SPA avec Barba.js et les animations GSAP associÃ©es.
 */

document.addEventListener("DOMContentLoaded", () => {
    if (typeof barba === 'undefined') return;

    barba.init({
        sync: true, // leave et enter se superposent pour un morphing fluide
        transitions: [{
            name: 'home-to-project',
            from: {
                namespace: ['home']
            },
            to: {
                namespace: ['project']
            },
            leave(data) {
                // On prÃ©pare le dÃ©part
                return new Promise(resolve => {
                    const oldWrapper = data.current.container.querySelector("#main-video-wrapper");
                    if (!oldWrapper) return resolve();

                    // MÃ©moriser la position initiale du vieux wrapper pour le Flip
                    data.flipState = Flip.getState(oldWrapper);

                    // Fade out de la pagination (01 / 11) et scroll indicator
                    gsap.to(data.current.container.querySelector('.project-index, .scroll-indicator'), {
                        opacity: 0, duration: 0.3
                    });

                    // On rÃ©sout vite pour que 'enter' prenne le relais et installe le nouveau DOM
                    setTimeout(resolve, 50);
                });
            },
            enter(data) {
                const oldWrapper = data.current.container.querySelector('#main-video-wrapper');
                const newWrapper = data.next.container.querySelector('#main-video-wrapper');
                const projectDetails = data.next.container.querySelector('.project-details');

                // 1. TRANSFÃ‰RER LA VIDÃ‰O PHYSIQUEMENT POUR ZÃ‰RO COUPURE
                if (oldWrapper && newWrapper) {
                    const oldSliderContainer = oldWrapper.querySelector('.slider-container');
                    const newSliderContainer = newWrapper.querySelector('.slider-container');

                    if (oldSliderContainer && newSliderContainer) {
                        // On vide le nouveau container et on y met l'ancien (la vidÃ©o de l'accueil)
                        newSliderContainer.parentNode.replaceChild(oldSliderContainer, newSliderContainer);
                    }
                    // On cache l'ancien wrapper car on va animer le nouveau depuis sa position
                    oldWrapper.style.visibility = 'hidden';
                }

                window.scrollTo(0, 0);
                document.body.style.overflowY = "auto";
                if (window.homeScrollObserver) window.homeScrollObserver.kill();

                if (newWrapper && data.flipState) {
                    // PrÃ©parer le nouveau wrapper Ã  Ãªtre en plein Ã©cran
                    newWrapper.classList.add("is-expanded");
                    gsap.set(newWrapper, { opacity: 1 });

                    // Animation FLIP ultra-fluide et sans coupure
                    Flip.from(data.flipState, {
                        targets: newWrapper,
                        duration: 0.8, // Plus rapide
                        ease: "power4.inOut", // Courbe plus agressive
                        absolute: true, // Évite les sauts DOM pendant le calcul
                        onComplete: () => {
                            window.isVideoExpanded = true;
                        }
                    });
                }

                // Animation du project details en diffÃ©rÃ©
                if (projectDetails) {
                    projectDetails.style.display = "block";
                    return gsap.fromTo(projectDetails,
                        { opacity: 0, y: 50 },
                        { opacity: 1, y: 0, duration: 0.8, delay: 0.4, ease: "power2.out" }
                    );
                }
            }
        }, {
            name: 'project-to-home',
            from: {
                namespace: ['project']
            },
            to: {
                namespace: ['home']
            },
            leave(data) {
                return new Promise(resolve => {
                    document.body.style.overflowY = "hidden";
                    const details = data.current.container.querySelector('.project-details');
                    const oldWrapper = data.current.container.querySelector("#main-video-wrapper");

                    // Explicitly pause ALL playing videos in the departing container
                    const videos = data.current.container.querySelectorAll('video');
                    videos.forEach(v => {
                        v.pause();
                        v.muted = true;
                    });

                    // Fade out projet
                    gsap.to(details, {
                        opacity: 0, y: 50, duration: 0.3
                    });

                    if (oldWrapper) {
                        data.flipState = Flip.getState(oldWrapper);
                    }

                    setTimeout(resolve, 50);
                });
            },
            enter(data) {
                const oldWrapper = data.current.container.querySelector('#main-video-wrapper');
                const newWrapper = data.next.container.querySelector('#main-video-wrapper');

                // 1. TRANSFÃ‰RER LA VIDÃ‰O PHYSIQUEMENT POUR ZÃ‰RO COUPURE
                if (oldWrapper && newWrapper) {
                    const oldSliderContainer = oldWrapper.querySelector('.slider-container');
                    const newSliderContainer = newWrapper.querySelector('.slider-container');

                    if (oldSliderContainer && newSliderContainer) {
                        newSliderContainer.parentNode.replaceChild(oldSliderContainer, newSliderContainer);
                    }
                    oldWrapper.style.visibility = 'hidden';
                }

                // Fade in index
                gsap.fromTo(data.next.container.querySelector('.project-index, .scroll-indicator'),
                    { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 0.8 }
                );

                if (newWrapper && data.flipState) {
                    // On part de l'Ã©tat Ã©tendu capturÃ©
                    newWrapper.classList.remove("is-expanded");

                    Flip.from(data.flipState, {
                        targets: newWrapper,
                        duration: 1.2,
                        ease: "expo.inOut",
                        onComplete: () => {
                            window.isVideoExpanded = false;
                            if (window.initHomeObserver) window.initHomeObserver();
                            // RE-INJECTION DU BANNER ET DES EVENTS
                            if (window.injectNextProjectBanner) window.injectNextProjectBanner();
                            // SYNCHRONISATION UI ACCUEIL (Titre + Timeline) BASÃ‰E SUR LA VIDÃ‰O TRANSFÃ‰RÃ‰E
                            if (window.syncHomeVisuals) window.syncHomeVisuals(window.currentProjectIndex);
                        }
                    });
                }
            }
        }, {
            name: 'any-to-all-projects',
            to: {
                namespace: ['all-projects']
            },
            leave(data) {
                return new Promise(resolve => {
                    // Si on vient de home, couper explictement le son/vidéo
                    if (data.current.namespace === 'home') {
                        const cv = data.current.container.querySelector('#video-current');
                        if (cv) {
                            cv.pause();
                            cv.muted = true;
                        }
                    } else if (data.current.namespace === 'project') {
                        // Couper projet sortant
                        const videos = data.current.container.querySelectorAll('video');
                        videos.forEach(v => {
                            v.pause();
                            v.muted = true;
                        });
                        const pd = data.current.container.querySelector('.project-details');
                        if (pd) gsap.to(pd, { opacity: 0, duration: 0.3 });
                    }

                    // Fade out global conteneur sortant
                    gsap.to(data.current.container, {
                        opacity: 0, duration: 0.4,
                        onComplete: resolve
                    });
                });
            },
            enter(data) {
                window.scrollTo(0, 0);
                document.body.style.overflowY = "auto";
                if (window.homeScrollObserver) window.homeScrollObserver.kill();

                const videos = data.next.container.querySelectorAll('video');
                videos.forEach(v => {
                    v.play().catch(e => console.warn("Autoplay blocked:", e));
                });

                gsap.fromTo(data.next.container,
                    { opacity: 0 },
                    { opacity: 1, duration: 0.4, ease: "power2.out" }
                );
            }
        }, {
            name: 'all-projects-to-any',
            from: {
                namespace: ['all-projects']
            },
            leave(data) {
                return new Promise(resolve => {
                    gsap.to(data.current.container, {
                        opacity: 0, duration: 0.4,
                        onComplete: resolve
                    });
                });
            },
            enter(data) {
                window.scrollTo(0, 0);
                if (data.next.namespace === 'home') {
                    document.body.style.overflowY = "hidden";
                    if (window.initHomeObserver) window.initHomeObserver();
                } else {
                    document.body.style.overflowY = "auto";
                }

                // Si la cible est home, on relance le layout 
                gsap.fromTo(data.next.container,
                    { opacity: 0 },
                    { opacity: 1, duration: 0.5 }
                );

                // RE-INJECTION DU BANNER ET DES EVENTS
                if (window.injectNextProjectBanner) window.injectNextProjectBanner();
                // SYNCHRONISATION UI ACCUEIL
                if (window.syncHomeVisuals) window.syncHomeVisuals(window.currentProjectIndex);

                // Si c'est un projet, déclencher la suite logic (ex: flip fake ou fade details)
                if (data.next.namespace === 'project') {
                    window.isVideoExpanded = true;
                } else if (data.next.namespace === 'home') {
                    window.isVideoExpanded = false;
                }
            }
        }]
    });

    // ==========================================
    // INJECTION NEXT PROJECT BANNER (Global Scope)
    // ==========================================
    window.injectNextProjectBanner = function () {
        // Nettoyage au cas oÃ¹
        const existing = document.querySelector('.next-project-banner');
        if (existing) existing.remove();

        // Uniquement si on est sur la vue "projet"
        const container = document.getElementById('main-container');
        if (!container || container.dataset.barbaNamespace !== 'project') return;

        // DÃ©terminer le projet suivant depuis l'index courant
        if (typeof window.currentProjectIndex === 'undefined') window.currentProjectIndex = 1;
        const pd = window._projectsData;
        if (!pd || pd.length === 0) return;

        // L'index courant est 1-based. On veut le suivant (en boucle)
        let nextIndex = window.currentProjectIndex + 1;
        if (nextIndex > pd.length) nextIndex = 1;

        const nextProj = pd[nextIndex - 1]; // 0-based array

        // Construire le DOM
        const section = document.createElement('section');
        section.className = 'next-project-banner';

        section.innerHTML = `
            <video class="next-bg-video" src="${nextProj.src}" autoplay loop muted playsinline></video>
            <div class="next-content">
                <span class="next-label">SUIVANT &rarr;</span>
                <h2 class="next-title">${nextProj.title}</h2>
            </div>
        `;

        // Action de clic -> navigation SPA
        section.addEventListener('click', () => {
            if (typeof barba !== 'undefined') {
                // Simuler la mise Ã  jour de l'index global pour que le main slider s'aligne
                window.currentProjectIndex = nextIndex;
                if (window.updateHudTimeline) window.updateHudTimeline(nextIndex);

                barba.go(nextProj.url);
            } else {
                window.location.href = nextProj.url;
            }
        });

        // InsÃ©rer tout en bas du main-container
        container.appendChild(section);
    };

    // Appel direct au chargement initial (F5)
    window.injectNextProjectBanner();

    // Optionnel: Re-binder les Ã©vÃ©nements sur la nouvelle page HTML gÃ©nÃ©rÃ©e (timeline, play, pause)
    barba.hooks.after((data) => {
        // Appelé après chaque transition Barba
        if (window.bindWrapperEvents) window.bindWrapperEvents();
        if (window.bindVideoTimeUpdate) window.bindVideoTimeUpdate();

        const currentVideo = document.getElementById("video-current");
        if (currentVideo) {
            // Appliquer l'état global du son (ne pas forcer ON si l'utilisateur a coupé)
            currentVideo.muted = !window.isGlobalSoundOn;
            if (window.isGlobalSoundOn) {
                // Fade-in du volume via un objet proxy (GSAP ne gère pas .volume nativement)
                const proxy = { vol: 0 };
                currentVideo.volume = 0;
                gsap.to(proxy, {
                    vol: window.globalVolume || 1,
                    duration: 1,
                    onUpdate: function () { currentVideo.volume = proxy.vol; }
                });
            }
        }

        window.injectNextProjectBanner();

        // Auto-hide sur les pages projet
        if (window.initProjectAutoHide) window.initProjectAutoHide();

        // REINIT AMBILIGHT sur le nouveau DOM injecté par Barba
        if (window.initAmbilight) window.initAmbilight();

        // ==========================================
        // STATISTIQUES / ANALYTICS (SPA Pageview Tracking)
        // ==========================================
        // Si tu ajoutes PostHog ou Google Analytics dans ton HTML, 
        // dÃ©-commente et adapte le code ci-dessous pour tracker les nouvelles vues :
        /*
        if (typeof posthog !== 'undefined') {
            posthog.capture('$pageview');
        }
        if (typeof gtag !== 'undefined') {
            gtag('config', 'G-XXXXXXXXXX', { 'page_path': data.next.url.path });
        }
        */
    });
});

