/**
 * animations.js â€” Navigation projets homepage
 * Architecture simplifiÃ©e : UN seul titre, swap instantanÃ© + fade opacity
 * Effet Ambilight canvas sÃ©parÃ© dans ambilight.js
 */

// ==== 1. VISUALS PENDANT LE DRAG (en temps rÃ©el) ====
window.updateDragVisuals = function (progress, nextTitle) {
    const titleEl = document.getElementById('title-current');
    if (!titleEl) return;

    // Fade out pendant le drag (progress 0â†’1)
    gsap.set(titleEl, { opacity: 1 - progress * 0.7 });
};

// ==== 2. SNAP â€” Transition validÃ©e (Effet MagnÃ©tique / Glue) ====
window.snapToProject = function (targetProjectData, direction, onCompleteCallback) {
    const currentVideo = document.getElementById('video-current');
    const titleEl = document.getElementById('title-current');
    const ambCanvas = document.getElementById('ambilight-canvas');
    const sliderContainer = document.getElementById('slider-container');

    // CrÃ©ation d'une vidÃ©o fictive pour l'effet de glissement "Glue"
    const incomingVideo = document.createElement('video');
    incomingVideo.className = 'main-video slide-video incoming-video';
    incomingVideo.src = targetProjectData.src;
    incomingVideo.autoplay = true;
    incomingVideo.loop = true;
    incomingVideo.muted = true;
    incomingVideo.playsInline = true;

    // On la place en bas (direction > 0) ou en haut (direction < 0)
    gsap.set(incomingVideo, { yPercent: direction > 0 ? 100 : -100 });
    if (sliderContainer) sliderContainer.appendChild(incomingVideo);

    incomingVideo.play().catch(() => { });

    const tl = gsap.timeline({
        onComplete: () => {
            // Swap rÃ©el de la source
            if (currentVideo && targetProjectData.src) {
                currentVideo.src = targetProjectData.src;
                currentVideo.currentTime = incomingVideo.currentTime;
                currentVideo.play().catch(() => { });
                if (window.bindVideoTimeUpdate) window.bindVideoTimeUpdate();
            }
            if (titleEl) {
                titleEl.textContent = targetProjectData.title;
            }

            // RÃ©initialisation des positions
            gsap.set(currentVideo, { yPercent: 0, opacity: 1 });
            gsap.to(titleEl, { opacity: 1, duration: 0.4, ease: 'power2.inOut' });

            // Nettoyage de la fausse vidÃ©o
            if (incomingVideo.parentNode) incomingVideo.parentNode.removeChild(incomingVideo);
            if (onCompleteCallback) onCompleteCallback();
        }
    });

    // Fade-out du titre
    if (titleEl) tl.to(titleEl, { opacity: 0, duration: 0.3, ease: 'power2.out' }, 0);

    // Glissement (Glue) des deux vidÃ©os en mÃªme temps
    if (currentVideo) tl.to(currentVideo, { yPercent: direction > 0 ? -100 : 100, duration: 0.8, ease: 'power3.inOut' }, 0);
    tl.to(incomingVideo, { yPercent: 0, duration: 0.8, ease: 'power3.inOut' }, 0);

    // Effet cinÃ©matique : Flash d'Ã©blouissement sur l'Ambilight
    if (ambCanvas) {
        gsap.fromTo(ambCanvas,
            { filter: "blur(50px) saturate(3) brightness(2)", opacity: 1 },
            { filter: "blur(50px) saturate(1.5) brightness(1)", opacity: 0.85, duration: 0.8, ease: "power2.out" }
        );
    }
};

// ==== 3. CANCEL â€” Drag abandonnÃ© ====
window.cancelDrag = function (onCompleteCallback) {
    const titleEl = document.getElementById('title-current');
    const currentVideo = document.getElementById('video-current');

    if (titleEl) gsap.to(titleEl, { opacity: 1, duration: 0.3 });
    if (currentVideo) gsap.to(currentVideo, { opacity: 1, duration: 0.3 });

    if (onCompleteCallback) onCompleteCallback();
};


// ==== 5. PALETTE NEON & MISE A JOUR TIMELINE HUD ====
// Une couleur neon unique par index de projet (1 a 11)
const HUD_COLORS = [
    '#00E5FF', // 01 — Cyan electrique (defaut)
    '#FF3366', // 02 — Rouge neon
    '#B066FF', // 03 — Violet plasma
    '#FF6B35', // 04 — Orange feu
    '#00FF9D', // 05 — Vert menthe
    '#FFD700', // 06 — Or
    '#FF00FF', // 07 — Magenta
    '#4DFFB4', // 08 — Emeraude
    '#FF4500', // 09 — Rouge-Orange
    '#00BFFF', // 10 — Bleu ciel
    '#E0FF00', // 11 — Jaune lime
];

window.updateHudTimeline = function (projectIndex) {
    const spans = document.querySelectorAll('#cielrose-timeline-numbers span');
    const cursor = document.getElementById('cielrose-cursor');
    if (!spans.length) return;

    // Couleur neon de cet index
    const color = HUD_COLORS[(projectIndex - 1) % HUD_COLORS.length];
    document.documentElement.style.setProperty('--active-color', color);

    // Classe active + click handlers sur chaque span
    spans.forEach((s, i) => {
        s.classList.remove('active');

        // Attacher le click handler une seule fois via flag
        if (!s.dataset.clickBound) {
            s.dataset.clickBound = '1';
            s.style.cursor = 'pointer';
            s.style.pointerEvents = 'auto';
            s.addEventListener('click', () => {
                const targetIdx = i + 1; // 1-based
                if (window.jumpToProject) window.jumpToProject(targetIdx);
            });
        }
    });

    const target = spans[projectIndex - 1];
    if (target) {
        target.classList.add('active');

        // Positionner le curseur via style.left (CSS gere la transition smooth)
        if (cursor) {
            const parentRect = target.parentElement.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            const centerX = (targetRect.left - parentRect.left) + targetRect.width / 2;
            cursor.style.left = centerX + 'px';
        }
    }
};

// ==== 6. SYNCHRO GLOBALE AU RETOUR SUR HOME ====
window.syncHomeVisuals = function (projectIndex) {
    if (typeof projectsData !== 'undefined' && projectsData[projectIndex - 1]) {
        const proj = projectsData[projectIndex - 1];
        const titleEl = document.getElementById('title-current');
        if (titleEl) titleEl.textContent = proj.title;
        // La vidÃ©o titre a changÃ©, on re-synchronise la timeline CielRose (les numÃ©ros + curseur)
        window.updateHudTimeline(projectIndex);
    }
};

