/**
 * main.js
 * Logique principale de l'application (Navigation, Etats, Ecouteurs de base).
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- ELEMENTS DOM ---
    const videoWrapper = document.getElementById("main-video-wrapper");

    // --- ETATS GLOBAUX & DONNEES ---
    window.isVideoExpanded = false;
    window.isOverlayOpen = false;
    window.isGlobalSoundOn = false; // Nouvel etat global
    window.globalVolume = 1.0; // Etat de volume par defaut
    window.currentProjectIndex = 1; // Export WebGL

    let isAnimating = false;
    let currentProjectIndex = 1;

    // Donnees des projets (video source + URL page dediee)
    const projectsData = [
        { title: "SLALOM", src: "/assets/videos/slalom-not-just-a-club.mp4", url: "/projects/slalom.html" },
        { title: "GOTREAL - METRO", src: "/assets/videos/gotreal-paris-metro.mp4", url: "/projects/gotreal-paris-metro.html" },
        { title: "PUZZLE 1", src: "/assets/videos/puzzle-01.mp4", url: "/projects/puzzle-01.html" },
        { title: "PUZZLE 2", src: "/assets/videos/puzzle-02.mp4", url: "/projects/puzzle-02.html" },
        { title: "PUZZLE 3", src: "/assets/videos/puzzle-03.mp4", url: "/projects/puzzle-03.html" },
        { title: "PUZZLE 4", src: "/assets/videos/puzzle-04.mp4", url: "/projects/puzzle-04.html" },
        { title: "PUZZLE 5", src: "/assets/videos/puzzle-05.mp4", url: "/projects/puzzle-05.html" },
        { title: "PUZZLE 6", src: "/assets/videos/puzzle-06.mp4", url: "/projects/puzzle-06.html" },
        { title: "PUZZLE 7", src: "/assets/videos/puzzle-07.mp4", url: "/projects/puzzle-07.html" },
        { title: "PUZZLE 8", src: "/assets/videos/puzzle-08.mp4", url: "/projects/puzzle-08.html" },
        { title: "PUZZLE 9", src: "/assets/videos/puzzle-09.mp4", url: "/projects/puzzle-09.html" }
    ];
    // Export global pour animations.js
    window._projectsData = projectsData;

    const totalProjects = projectsData.length;
    let indexDisplay = document.querySelector('.project-index');
    let totalDisplay = document.querySelector('.project-total');
    if (totalDisplay) totalDisplay.textContent = totalProjects;

    // Detection auto de l'index et de l'etat etendu sur chargement direct
    const currentPath = window.location.pathname;
    const isProjectPage = currentPath.includes('/projects/');
    if (isProjectPage) {
        // Unlock scroll global car l'utilisateur est sur une page detaillee
        document.body.style.overflowY = "auto";
        window.isVideoExpanded = true;

        // Retrouver le bon index pour le Next Project Banner
        const foundIndex = projectsData.findIndex(p => currentPath.endsWith(p.url) || currentPath.includes(p.url));
        if (foundIndex !== -1) {
            currentProjectIndex = foundIndex + 1;
            window.currentProjectIndex = currentProjectIndex;
        }
    } else {
        // Sur la page d'accueil, on lock le scroll (slider gere par GSAP Observer)
        document.body.style.overflowY = "hidden";
    }

    // Fallback pour démarrer les vidéos si bloquées par l'autoplay natif sur la page 'Tous les projets'
    if (currentPath.includes('all-projects')) {
        setTimeout(() => {
            document.querySelectorAll('video').forEach(v => {
                if (v.paused && v.muted) {
                    v.play().catch(e => console.warn("Fallback autoplay bloqué:", e));
                }
            });
        }, 100);
    }

    // Enregistrement des plugins GSAP
    gsap.registerPlugin(Flip, Observer);

    // --- INITIALISATION LENIS (Tire de cielrose.tv) ---
    // Lenis remplace le scroll natif par une experience fluide et continue
    window.lenis = new Lenis({
        smoothWheel: true,
        syncTouchLerp: 0.075,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Easing exponentiel doux
        lerp: 0.1,
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        wheelMultiplier: 1.2
    });

    // Synchronisation de Lenis avec la boucle de rendu natif
    window.lenis.on('scroll', (e) => {
        // Optionnel : on peut interagir avec la physique du scroll ici
    });

    // On branche le raf de GSAP avec celui de Lenis pour eviter tout lag d'animation
    function raf(time) {
        window.lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // ==========================================

    // ==========================================

    window.clickTimer = null;

    window.bindWrapperEvents = function () {
        const currentWrapper = document.getElementById("main-video-wrapper");
        if (!currentWrapper || currentWrapper.dataset.eventsBound === '1') return;

        currentWrapper.dataset.eventsBound = '1';
        const wrapperToBind = currentWrapper;

        wrapperToBind.addEventListener("click", (e) => {
            // Ignorer le clic si c'est sur un bouton, input ou controle UI
            if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.video-footer') || e.target.closest('.timeline')) return;

            if (!window.isVideoExpanded && !window.isOverlayOpen) {
                const currentProj = projectsData[window.currentProjectIndex - 1];
                if (currentProj && currentProj.url) {
                    if (typeof barba !== 'undefined') {
                        barba.go(currentProj.url);
                    } else {
                        window.location.href = currentProj.url;
                    }
                }
            } else if (window.isVideoExpanded) {
                if (window.clickTimer === null) {
                    window.clickTimer = setTimeout(() => {
                        window.clickTimer = null;
                        // Clic sur la page projet etalee -> Toggle Pause/Lecture
                        const currentVideo = document.getElementById("video-current");
                        const btnPause = document.getElementById("btn-pause");
                        if (currentVideo) {
                            if (currentVideo.paused) {
                                currentVideo.play();
                                if (btnPause) btnPause.textContent = "PAUSE";
                            } else {
                                currentVideo.pause();
                                if (btnPause) btnPause.textContent = "LECTURE";
                            }
                        }
                    }, 250); // Attente courte pour verifier si c'est un double-clic
                }
            }
        });

        wrapperToBind.addEventListener("dblclick", (e) => {
            // Ignorer si clic UI
            if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.video-footer') || e.target.closest('.timeline')) return;

            if (window.isVideoExpanded) {
                // Annuler le simple clic precedent
                if (window.clickTimer !== null) {
                    clearTimeout(window.clickTimer);
                    window.clickTimer = null;
                }
                // Toggle PLEIN ECRAN
                if (!document.fullscreenElement) {
                    wrapperToBind.requestFullscreen().catch(err => { });
                    const btnFullscreen = document.getElementById("btn-fullscreen");
                    if (btnFullscreen) btnFullscreen.textContent = "REDUIRE";
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                        const btnFullscreen = document.getElementById("btn-fullscreen");
                        if (btnFullscreen) btnFullscreen.textContent = "PLEIN ECRAN";
                    }
                }
            }
        });
    };

    // Premier bind au chargement
    window.bindWrapperEvents();

    // Option: Fermer la video en cliquant sur 'Escape'
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (window.isVideoExpanded) {
                if (window.shrinkVideo) window.shrinkVideo();
            }
            else if (window.isOverlayOpen) {
                if (window.closeProjectsOverlay) window.closeProjectsOverlay();
            }
        }
    });

    // --- NAVIGATION AU SCROLL (Homepage) --- Systeme physique magnetique ---
    // Molette = impulsion directe sur slideVelocity.
    // RAF loop = spring force proportionnelle a la visibilite de chaque video.
    // >50% visible → traction magnetique, plus la video est visible plus la force est forte.
    window.initHomeObserver = function () {
        if (window.homeScrollObserver) window.homeScrollObserver.kill();
        if (window._homePhysicsRaf) cancelAnimationFrame(window._homePhysicsRaf);
        if (!document.getElementById('video-current')) return;

        // ---- ETAT PHYSIQUE ----
        let slideProgress = 0;      // 0.0 → 1.0 : avancement de la transition en cours
        let slideVelocity = 0;      // vitesse actuelle (unites/frame)
        let slideDirection = 0;     // -1 ou +1
        let pendingProj = null;   // { video, proj, idx } de la video entrante
        let locked = false;  // transition verrouillee apres commit

        // ---- CONSTANTES ----
        // Scroll ultra-doux : filmstrip colle a la molette, traction tres soft
        const DAMPING = 0.87;   // Inertie moderee : video s'arrete naturellement
        const SPRING_K = 0.007;  // Ressort tres souple : traction douce, quasi invisible <50%
        const WHEEL_SCALE = 1 / 120;// Chaque 120px roue = 1% progress (tres precis)
        const COMMIT_THRESH = 0.97;
        const CANCEL_THRESH = 0.025;
        const VEL_CAP = 0.04;   // Vitesse max tres basse = jamais de saut

        // ---- HELPERS ----
        function getNextIdx(dir) {
            let ni = currentProjectIndex + dir;
            if (ni > totalProjects) ni = 1;
            if (ni < 1) ni = totalProjects;
            return ni;
        }

        function prepareIncoming(dir) {
            const ni = getNextIdx(dir);
            const proj = projectsData[ni - 1];
            if (!proj) return null;
            const sc = document.getElementById('slider-container');
            const cv = document.getElementById('video-current');
            if (!sc || !cv) return null;
            // Retirer toute ancienne video entrante
            sc.querySelectorAll('.incoming-video').forEach(v => v.remove());
            const vid = document.createElement('video');
            vid.className = 'main-video slide-video incoming-video';
            vid.src = proj.src;
            vid.autoplay = true; vid.loop = true; vid.muted = true; vid.playsInline = true;
            // Position de depart : sous (dir>0) ou au-dessus (dir<0)
            gsap.set(vid, { yPercent: dir > 0 ? 100 : -100 });
            sc.appendChild(vid);
            vid.play().catch(() => { });
            return { video: vid, proj, idx: ni, dir };
        }

        function applyVisuals() {
            const cv = document.getElementById('video-current');
            if (!cv) return;
            const sign = slideDirection > 0 ? 1 : -1;
            // Video courante : glisse dans la direction opposee
            gsap.set(cv, { yPercent: -slideProgress * 100 * sign });
            // Video entrante : arrive depuis la direction
            if (pendingProj && pendingProj.video) {
                gsap.set(pendingProj.video, { yPercent: (1 - slideProgress) * 100 * sign });
            }
        }

        function commitTransition() {
            const cv = document.getElementById('video-current');
            const titleEl = document.getElementById('title-current');

            // IMPORTANT : capturer les valeurs AVANT de null-ifier pendingProj
            // car le onComplete GSAP s'execute 150ms plus tard (async) et pendingProj sera null
            const newTitle = pendingProj.proj.title;
            const newIdx = pendingProj.idx;
            const newSrc = pendingProj.proj.src;
            const newTime = pendingProj.video ? pendingProj.video.currentTime : 0;

            if (cv) {
                cv.src = newSrc;
                cv.currentTime = newTime;
                cv.play().catch(() => { });
                gsap.set(cv, { yPercent: 0 });
            }
            if (pendingProj.video && pendingProj.video.parentNode) pendingProj.video.remove();

            // Mise a jour du titre (fade out → nouveau texte → fade in)
            if (titleEl) {
                gsap.to(titleEl, {
                    opacity: 0, duration: 0.15, onComplete: () => {
                        titleEl.textContent = newTitle; // variable locale : pendingProj est null ici
                        gsap.to(titleEl, { opacity: 1, duration: 0.3 });
                    }
                });
            }

            currentProjectIndex = newIdx;
            window.currentProjectIndex = newIdx;
            if (window.updateHudTimeline) window.updateHudTimeline(newIdx);
            if (window.bindVideoTimeUpdate) window.bindVideoTimeUpdate();
            if (window.refreshAmbilight) window.refreshAmbilight();
            pendingProj = null;
            slideProgress = 0;
            slideVelocity = 0;
            slideDirection = 0;
            locked = false;
        }

        function cancelTransition() {
            const cv = document.getElementById('video-current');
            const titleEl = document.getElementById('title-current');
            if (cv) gsap.set(cv, { yPercent: 0 });
            // Restaurer l'opacite du titre (reduite par updateDragVisuals pendant le drag)
            if (titleEl) gsap.to(titleEl, { opacity: 1, duration: 0.2 });
            if (pendingProj && pendingProj.video && pendingProj.video.parentNode) {
                pendingProj.video.remove();
            }
            pendingProj = null;
            slideProgress = 0;
            slideVelocity = 0;
            slideDirection = 0;
            locked = false;
        }

        // ---- BOUCLE PHYSIQUE (RAF) ----
        function physicsLoop() {
            window._homePhysicsRaf = requestAnimationFrame(physicsLoop);
            if (window.isVideoExpanded || window.isOverlayOpen) return;
            if (locked) return;

            // Si en transition : creer la video entrante si besoin
            if (Math.abs(slideProgress) > 0.005 && !pendingProj && slideDirection !== 0) {
                pendingProj = prepareIncoming(slideDirection);
            }

            // ---- SPRING MAGNETIQUE ----
            // snapTarget : 1.0 si >50% avance, 0.0 si <50%
            const snapTarget = slideProgress > 0.5 ? 1.0 : 0.0;
            // magnetStrength : 0 = exactement a 50% (neutre), 1 = a 0% ou 100%
            const magnetStrength = Math.abs(slideProgress - 0.5) * 2; // 0 → 1
            // la traction est proportionnelle a la visibilite au-dela de 50%
            const springForce = (snapTarget - slideProgress) * SPRING_K * (0.3 + magnetStrength * 0.7);

            // Appliquer la physique
            slideVelocity = (slideVelocity + springForce) * DAMPING;
            slideProgress += slideVelocity;
            slideProgress = Math.max(0, Math.min(1, slideProgress));

            // Appliquer les visuels
            if (slideDirection !== 0) applyVisuals();

            // Validation ou annulation
            if (slideProgress >= COMMIT_THRESH) {
                if (pendingProj) commitTransition();
                else { slideProgress = 0; slideVelocity = 0; slideDirection = 0; }
                return;
            }
            if (slideProgress <= CANCEL_THRESH && Math.abs(slideVelocity) < 0.0015) {
                cancelTransition();
            }
        }

        physicsLoop();

        // ---- AUTO-NEXT : fin de video → legere impulsion vers suivante ----
        function autoNext() {
            if (window.isVideoExpanded || window.isOverlayOpen || locked || slideProgress > 0.01) return;
            slideDirection = 1;
            slideVelocity = 0.06; // impulsion douce
        }
        const cv0 = document.getElementById('video-current');
        if (cv0) {
            cv0.removeEventListener('ended', autoNext);
            cv0.addEventListener('ended', autoNext);
        }

        // ---- GSAP OBSERVER : capture la molette (input direct) ----
        window.homeScrollObserver = Observer.create({
            target: document,
            type: 'wheel,touch',
            preventDefault: true,
            wheelSpeed: 1,
            onChangeY: (self) => {
                if (window.isVideoExpanded || window.isOverlayOpen || locked) return;
                const dir = self.deltaY > 0 ? 1 : -1;

                // Bloquer le changement de direction en milieu de transition
                if (slideProgress > CANCEL_THRESH && slideDirection !== 0 && dir !== slideDirection) return;

                // Initialiser la direction si on commence
                if (slideProgress <= CANCEL_THRESH) slideDirection = dir;

                // BUGFIX : utiliser Math.abs(deltaY) car slideDirection encode deja la direction.
                // Sans ca, deltaY<0 (scroll haut) donnait une impulsion negative
                // qui bloquait slideProgress a 0 (clamp) → scroll haut casse.
                const impulse = Math.abs(self.deltaY) * WHEEL_SCALE;
                slideVelocity += impulse;
                // Plafond : evite les sauts, mouvement lent et precis
                slideVelocity = Math.min(VEL_CAP, slideVelocity);

                // Feedback titre en temps reel
                const ni = getNextIdx(slideDirection);
                if (window.updateDragVisuals) {
                    window.updateDragVisuals(slideProgress, projectsData[ni - 1]);
                }
            }
        });
        // ---- SAUT DIRECT : clic sur un numero de la timeline ----
        // Expose en global pour etre appele depuis animations.js ou ailleurs
        window.jumpToProject = function (targetIdx) {
            if (locked || slideProgress > CANCEL_THRESH) return; // Ignore si transition en cours
            if (targetIdx === currentProjectIndex) return;       // Deja sur ce projet

            const targetProj = projectsData[targetIdx - 1];
            if (!targetProj) return;

            const dir = targetIdx > currentProjectIndex ? 1 : -1;

            locked = true; // Bloquer le scroll pendant la transition GSAP
            if (window.snapToProject) {
                window.snapToProject(targetProj, dir, () => {
                    currentProjectIndex = targetIdx;
                    window.currentProjectIndex = targetIdx;
                    if (window.updateHudTimeline) window.updateHudTimeline(targetIdx);
                    locked = false;
                });
            }
        };
    };

    function updateProjectIndex(idx) {
        currentProjectIndex = idx;
        window.currentProjectIndex = idx;
        if (window.updateHudTimeline) window.updateHudTimeline(idx);
    }

    // Initialisation initiale
    window.initHomeObserver();

    // Initialiser le curseur + couleur neon sur le projet 1 au chargement
    // (RAF attend que le layout soit stable avant la mesure)
    requestAnimationFrame(() => {
        if (window.updateHudTimeline) window.updateHudTimeline(currentProjectIndex);
    });

    // --- AUTO-HIDE CONTROLS (pages projet uniquement) ---
    window.initProjectAutoHide = function () {
        const wrapper = document.getElementById('main-video-wrapper');
        const ui = document.getElementById('immersive-ui');
        const header = document.querySelector('.camera-frame-top');
        if (!wrapper || !ui || !header) return;
        if (!wrapper.classList.contains('is-expanded')) return;

        // â”€â”€ Injecter le titre dans la navbar (centre) â”€â”€
        let titleSlot = document.getElementById('header-project-title');
        if (!titleSlot) {
            titleSlot = document.createElement('span');
            titleSlot.id = 'header-project-title';
            header.appendChild(titleSlot);
        }
        const titleEl = document.getElementById('title-current');
        titleSlot.textContent = titleEl ? titleEl.textContent : '';

        // â”€â”€ Timer d'auto-hide â”€â”€
        let hideTimer = null;

        function showControls() {
            ui.classList.remove('controls-hidden');
            document.body.classList.remove('controls-hidden');
            document.body.style.cursor = '';
        }

        function scheduleHide() {
            clearTimeout(hideTimer);
            hideTimer = setTimeout(() => {
                ui.classList.add('controls-hidden');
                document.body.classList.add('controls-hidden');
                document.body.style.cursor = 'none';
            }, 2000);
        }

        showControls();
        scheduleHide();

        document.addEventListener('mousemove', () => { showControls(); scheduleHide(); });

        // Survol des boutons â†’ on ne masque pas
        ui.addEventListener('mouseenter', () => clearTimeout(hideTimer));
        ui.addEventListener('mouseleave', () => scheduleHide());
    };

    // Appel direct si on est dejÃ  sur une page projet
    window.initProjectAutoHide();

    // --- UI FONCTIONNELLE (Delegated Events pour SPA) ---
    // Fonction utilitaire pour attacher la timeline (appelee aussi dans transitions.js)
    window.bindVideoTimeUpdate = function () {
        const currentVideo = document.getElementById("video-current");
        const timelineProgress = document.getElementById("timeline-progress");
        if (currentVideo && timelineProgress) {

            // --- Detection du Format Video (16:9 / 9:16) ---
            const detectFormat = () => {
                const wrapper = document.getElementById("main-video-wrapper");
                if (wrapper && currentVideo.videoWidth && currentVideo.videoHeight) {
                    if (currentVideo.videoWidth < currentVideo.videoHeight) {
                        wrapper.classList.add("vertical-layout");
                    } else {
                        wrapper.classList.remove("vertical-layout");
                    }
                }
            };

            if (currentVideo.readyState >= 1) {
                detectFormat();
            }
            currentVideo.addEventListener("loadedmetadata", detectFormat);

            // --- Nettoyage et Attachement Timeline ---
            currentVideo.removeEventListener("timeupdate", window.timeUpdateHandler);

            window.timeUpdateHandler = () => {
                if (!currentVideo.duration) return;
                const percent = (currentVideo.currentTime / currentVideo.duration) * 100;
                timelineProgress.style.width = percent + "%";
            };
            currentVideo.addEventListener("timeupdate", window.timeUpdateHandler);
        }
    };

    window.bindVideoTimeUpdate();

    document.addEventListener("click", (e) => {
        // --- ABOUT / CONTACT BUTTONS ---
        if (e.target.closest("#btn-about")) {
            e.stopPropagation();
            if (window.showToast) window.showToast('Page ABOUT BIENTOT DISPONIBLE');
            return;
        }
        if (e.target.closest("#btn-contact")) {
            e.stopPropagation();
            if (window.showToast) window.showToast('Page CONTACT BIENTOT DISPONIBLE');
            return;
        }

        // --- SOUND BUTTON ---
        const btnSound = e.target.closest("#btn-sound");
        if (btnSound) {
            e.stopPropagation();
            window.isGlobalSoundOn = !window.isGlobalSoundOn;
            const currentVideo = document.getElementById("video-current");
            if (currentVideo) {
                currentVideo.muted = !window.isGlobalSoundOn;
                if (window.isGlobalSoundOn && window.globalVolume === 0) {
                    window.globalVolume = 1.0;
                    currentVideo.volume = window.globalVolume;
                    syncVolumeSliders(window.globalVolume);
                }
            }
            updateSoundButtonsUI();
            return;
        }

        // --- PAUSE BUTTON ---
        const btnPause = e.target.closest("#btn-pause");
        if (btnPause) {
            e.stopPropagation();
            const currentVideo = document.getElementById("video-current");
            if (currentVideo) {
                if (currentVideo.paused) {
                    currentVideo.play();
                    btnPause.textContent = "PAUSE";
                } else {
                    currentVideo.pause();
                    btnPause.textContent = "LECTURE";
                }
            }
            return;
        }

        // --- FULLSCREEN BUTTON ---
        const btnFullscreen = e.target.closest("#btn-fullscreen");
        if (btnFullscreen) {
            e.stopPropagation();
            const wrapper = document.getElementById("main-video-wrapper");
            if (wrapper) {
                if (!document.fullscreenElement) {
                    wrapper.requestFullscreen().catch(err => { });
                    btnFullscreen.textContent = "REDUIRE";
                } else {
                    if (document.exitFullscreen) {
                        document.exitFullscreen();
                        btnFullscreen.textContent = "PLEIN ECRAN";
                    }
                }
            }
            return;
        }

        // --- GLOBAL SOUND BUTTON (Homepage & Project) ---
        // --- GLOBAL SOUND BUTTON (#btn-global-sound uniquement) ---
        const btnGlobalSound = e.target.closest("#btn-global-sound");
        if (btnGlobalSound) {
            e.stopPropagation();
            window.isGlobalSoundOn = !window.isGlobalSoundOn; // Toggle state

            const currentVideo = document.getElementById("video-current");
            if (currentVideo) {
                currentVideo.muted = !window.isGlobalSoundOn;

                // Si on rallume le son et que le volume etait Ã  0, on le met Ã  1 par courtoisie
                if (window.isGlobalSoundOn && window.globalVolume === 0) {
                    window.globalVolume = 1.0;
                    currentVideo.volume = window.globalVolume;
                    syncVolumeSliders(window.globalVolume);
                }
            }

            updateSoundButtonsUI();
            return;
        }
    });

    // --- LOGIQUE DU VOLUME SLIDER ---
    document.addEventListener("input", (e) => {
        if (e.target.classList.contains("volume-slider")) {
            const newVolume = parseFloat(e.target.value);
            window.globalVolume = newVolume;

            const currentVideo = document.getElementById("video-current");
            if (currentVideo) {
                currentVideo.volume = newVolume;

                // Auto mute/unmute selon la valeur
                if (newVolume === 0 && window.isGlobalSoundOn) {
                    window.isGlobalSoundOn = false;
                    currentVideo.muted = true;
                    updateSoundButtonsUI();
                } else if (newVolume > 0 && !window.isGlobalSoundOn) {
                    window.isGlobalSoundOn = true;
                    currentVideo.muted = false;
                    updateSoundButtonsUI();
                }
            }

            syncVolumeSliders(newVolume);
        }
    });

    // Fonctions utilitaires pour synchroniser l'UI Son
    function updateSoundButtonsUI() {
        const btnGlobalSound = document.getElementById("btn-global-sound");
        const btnLocalSound = document.getElementById("btn-sound");
        const stateText = window.isGlobalSoundOn ? "ON" : "OFF";

        if (btnGlobalSound) btnGlobalSound.textContent = "SOUND: " + stateText;
        if (btnLocalSound) btnLocalSound.textContent = "SOUND " + stateText;
    }

    function syncVolumeSliders(val) {
        document.querySelectorAll(".volume-slider").forEach(slider => {
            slider.value = val;
        });
    }

    // --- TIMELINE DRAG & DROP LOGIC (YOUTUBE STYLE) ---
    let isDraggingTimeline = false;

    function updateTimelineFromEvent(e, container) {
        const currentVideo = document.getElementById("video-current");
        if (currentVideo && currentVideo.duration) {
            const rect = container.getBoundingClientRect();
            let rawX = e.clientX - rect.left;

            // On s'assure que ca ne deborde pas
            let clickX = Math.max(0, Math.min(rawX, rect.width));

            const percentage = clickX / rect.width;
            currentVideo.currentTime = percentage * currentVideo.duration;
        }
    }

    document.addEventListener("mousedown", (e) => {
        const timelineContainer = e.target.closest("#timeline");
        if (timelineContainer) {
            isDraggingTimeline = true;
            updateTimelineFromEvent(e, timelineContainer);
        }
    });

    document.addEventListener("mousemove", (e) => {
        if (isDraggingTimeline) {
            const timelineContainer = document.getElementById("timeline");
            if (timelineContainer) updateTimelineFromEvent(e, timelineContainer);
        }
    });

    document.addEventListener("mouseup", () => {
        isDraggingTimeline = false;
    });

    // Appliquer le volume global existant lors du chargement ou navigation Barba (SPA)
    window.applyGlobalSoundSettings = function () {
        const currentVideo = document.getElementById("video-current");
        if (currentVideo) {
            currentVideo.muted = !window.isGlobalSoundOn;
            currentVideo.volume = window.globalVolume;
        }
        updateSoundButtonsUI();
        syncVolumeSliders(window.globalVolume);
    };

    // Premier appel au chargement
    window.applyGlobalSoundSettings();

    // --- ANCIENNE FONCTION DE NAVIGATION SUPPRIMEE (Remplacee par Drag/Snap) ---

    // Connecter la grille ALL PROJECTS aux pages SPA
    const gridItems = document.querySelectorAll(".grid-item");
    gridItems.forEach((item, index) => {
        item.addEventListener("click", () => {
            const url = projectsData[index] ? projectsData[index].url : null;
            if (url) {
                if (window.isOverlayOpen) window.closeProjectsOverlay();
                setTimeout(() => {
                    if (typeof barba !== 'undefined') barba.go(url);
                    else window.location.href = url;
                }, 400); // laisser le temps Ã  l'overlay de se fermer
            }
        });
    });

    // Si on atterrit directement sur la page d'un projet, on libere le scroll et on degage l'observer
    if (document.querySelector('[data-barba-namespace="project"]')) {
        document.body.style.overflowY = "auto";
        if (window.homeScrollObserver) window.homeScrollObserver.kill();
    }
});

