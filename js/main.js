/**
 * main.js
 * Logique principale de l'application (Navigation, Etats, Ecouteurs de base).
 */

document.addEventListener("DOMContentLoaded", async () => {
    // 👇 AJOUTE CETTE LIGNE ICI 👇
    const baseGCS = "https://storage.googleapis.com/gotreal-assets-paris";
    
    const videoWrapper = document.getElementById("main-video-wrapper");

    window.isVideoExpanded = false;
    window.isOverlayOpen = false;
    window.isGlobalSoundOn = false; 
    window.globalVolume = 1.0; 
    window.currentProjectIndex = 1; 

    let isAnimating = false;
    let currentProjectIndex = 1;

    let projectsData = [];

    try {
        const res = await fetch('/data/projects.json?t=' + Date.now());
        const data = await res.json();

        window.allProjects = getProjects(data);

        const topProjects = window.allProjects.filter(p => p.rank && p.rank.includes('TOP')).sort((a, b) => {
            const ra = parseInt(a.rank.match(/\d+/)) || 0;
            const rb = parseInt(b.rank.match(/\d+/)) || 0;
            return rb - ra;
        });

        projectsData = topProjects.map(p => ({
            title: p.displayTitle,
            // 👇 LIGNE MODIFIÉE 👇
            src: `${baseGCS}/assets/videos/${p.category}/${(p.mainFile || p.files[0]).id}.mp4`,
            url: `/project.html?id=${p.id}`,
            baseId: p.id
        }));

        window._projectsData = projectsData;
        window.totalProjects = projectsData.length;

        const isHome = document.querySelector('.home-container');
        const isArchive = document.querySelector('.all-projects-page');
        const isProject = document.querySelector('.project-container:not(.all-projects-page)');

        if (isHome) deployHome(data);
        if (isArchive) deployArchive(data);
        if (isProject) deployProject(data);
    } catch (error) {
        console.error("Gotreal Bridge Error:", error);
    }

    const totalProjects = projectsData.length;
    let indexDisplay = document.querySelector('.project-index');
    let totalDisplay = document.querySelector('.project-total');
    if (totalDisplay) totalDisplay.textContent = totalProjects;

    const currentPath = window.location.pathname;
    const currentUrlParams = new URLSearchParams(window.location.search);
    const urlId = currentUrlParams.get('id');

    if (urlId) {
        document.body.style.overflowY = "auto";
        window.isVideoExpanded = true;
    } else {
        document.body.style.overflowY = "hidden";
    }

    if (currentPath.includes('all-projects')) {
        setTimeout(() => {
            document.querySelectorAll('video').forEach(v => {
                if (v.paused && v.muted) {
                    v.play().catch(e => console.warn("Fallback autoplay bloqué:", e));
                }
            });
        }, 100);
    }

    gsap.registerPlugin(Flip, Observer);

    window.lenis = new Lenis({
        smoothWheel: true,
        syncTouchLerp: 0.075,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
        lerp: 0.1,
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        wheelMultiplier: 1.2
    });

    window.lenis.on('scroll', (e) => { });

    function raf(time) {
        window.lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    window.clickTimer = null;

    window.bindWrapperEvents = function () {
        const currentWrapper = document.getElementById("main-video-wrapper");
        if (!currentWrapper || currentWrapper.dataset.eventsBound === '1') return;

        currentWrapper.dataset.eventsBound = '1';
        const wrapperToBind = currentWrapper;

        wrapperToBind.addEventListener("click", (e) => {
            const isUIControl = e.target.closest('button') || 
                                e.target.closest('input') || 
                                e.target.closest('.video-footer') || 
                                e.target.closest('.timeline') ||
                                e.target.closest('.project-subparts');
            
            if (isUIControl) { return; }

            if (!window.isVideoExpanded && !window.isOverlayOpen) {
                const pd = window._projectsData;
                const currentProj = pd ? pd[window.currentProjectIndex - 1] : null;
                
                if (currentProj && currentProj.baseId) {
                    const targetUrl = `/project.html?id=${currentProj.baseId}`;
                    if (typeof barba !== 'undefined') {
                        barba.go(targetUrl);
                    } else {
                        window.location.href = targetUrl;
                    }
                }
            } else if (window.isVideoExpanded) {
                if (window.clickTimer === null) {
                    window.clickTimer = setTimeout(() => {
                        window.clickTimer = null;
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
                    }, 250);
                }
            }
        });

        wrapperToBind.addEventListener("dblclick", (e) => {
            if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.video-footer') || e.target.closest('.timeline')) return;

            if (window.isVideoExpanded) {
                if (window.clickTimer !== null) {
                    clearTimeout(window.clickTimer);
                    window.clickTimer = null;
                }
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

    window.bindWrapperEvents();

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

    window.initHomeObserver = function () {
        if (window.homeScrollObserver) window.homeScrollObserver.kill();
        if (window._homePhysicsRaf) cancelAnimationFrame(window._homePhysicsRaf);
        if (!document.getElementById('video-current')) return;

        let slideProgress = 0;      
        let slideVelocity = 0;      
        let slideDirection = 0;     
        let pendingProj = null;   
        let locked = false;  

        const DAMPING = 0.87;   
        const SPRING_K = 0.007;  
        const WHEEL_SCALE = 1 / 120;
        const COMMIT_THRESH = 0.97;
        const CANCEL_THRESH = 0.025;
        const VEL_CAP = 0.04;   

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
            sc.querySelectorAll('.incoming-video').forEach(v => v.remove());
            const vid = document.createElement('video');
            vid.className = 'main-video slide-video incoming-video';
            vid.src = proj.src;
            vid.autoplay = true; vid.loop = true; vid.muted = true; vid.playsInline = true;
            gsap.set(vid, { yPercent: dir > 0 ? 100 : -100 });
            sc.appendChild(vid);
            vid.play().catch(() => { });
            return { video: vid, proj, idx: ni, dir };
        }

        function applyVisuals() {
            const cv = document.getElementById('video-current');
            if (!cv) return;
            const sign = slideDirection > 0 ? 1 : -1;
            gsap.set(cv, { yPercent: -slideProgress * 100 * sign });
            if (pendingProj && pendingProj.video) {
                gsap.set(pendingProj.video, { yPercent: (1 - slideProgress) * 100 * sign });
            }
        }

        function commitTransition() {
            const cv = document.getElementById('video-current');
            const titleEl = document.getElementById('title-current');

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

            if (titleEl) {
                gsap.to(titleEl, {
                    opacity: 0, duration: 0.15, onComplete: () => {
                        titleEl.textContent = newTitle; 
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

        function physicsLoop() {
            window._homePhysicsRaf = requestAnimationFrame(physicsLoop);
            if (window.isVideoExpanded || window.isOverlayOpen) return;
            if (locked) return;

            if (Math.abs(slideProgress) > 0.005 && !pendingProj && slideDirection !== 0) {
                pendingProj = prepareIncoming(slideDirection);
            }

            const snapTarget = slideProgress > 0.5 ? 1.0 : 0.0;
            const magnetStrength = Math.abs(slideProgress - 0.5) * 2; 
            const springForce = (snapTarget - slideProgress) * SPRING_K * (0.3 + magnetStrength * 0.7);

            slideVelocity = (slideVelocity + springForce) * DAMPING;
            slideProgress += slideVelocity;
            slideProgress = Math.max(0, Math.min(1, slideProgress));

            if (slideDirection !== 0) applyVisuals();

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

        function autoNext() {
            if (window.isVideoExpanded || window.isOverlayOpen || locked || slideProgress > 0.01) return;
            slideDirection = 1;
            slideVelocity = 0.06; 
        }
        const cv0 = document.getElementById('video-current');
        if (cv0) {
            cv0.removeEventListener('ended', autoNext);
            cv0.addEventListener('ended', autoNext);
        }

        window.homeScrollObserver = Observer.create({
            target: document,
            type: 'wheel,touch',
            preventDefault: true,
            wheelSpeed: 1,
            onChangeY: (self) => {
                if (window.isVideoExpanded || window.isOverlayOpen || locked) return;
                const dir = self.deltaY > 0 ? 1 : -1;

                if (slideProgress > CANCEL_THRESH && slideDirection !== 0 && dir !== slideDirection) return;

                if (slideProgress <= CANCEL_THRESH) slideDirection = dir;

                const impulse = Math.abs(self.deltaY) * WHEEL_SCALE;
                slideVelocity += impulse;
                slideVelocity = Math.min(VEL_CAP, slideVelocity);

                const ni = getNextIdx(slideDirection);
                if (window.updateDragVisuals) {
                    window.updateDragVisuals(slideProgress, projectsData[ni - 1]);
                }
            }
        });

        window.jumpToProject = function (targetIdx) {
            if (locked || slideProgress > CANCEL_THRESH) return; 
            if (targetIdx === currentProjectIndex) return;      

            const targetProj = projectsData[targetIdx - 1];
            if (!targetProj) return;

            const dir = targetIdx > currentProjectIndex ? 1 : -1;

            locked = true; 
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

    window.initHomeObserver();

    requestAnimationFrame(() => {
        if (window.updateHudTimeline) window.updateHudTimeline(currentProjectIndex);
    });

    window.initProjectAutoHide = function () {
        const wrapper = document.getElementById('main-video-wrapper');
        const ui = document.getElementById('immersive-ui');
        const header = document.querySelector('.camera-frame-top');
        if (!wrapper || !ui || !header) return;
        if (!wrapper.classList.contains('is-expanded')) return;

        let titleSlot = document.getElementById('header-project-title');
        if (!titleSlot) {
            titleSlot = document.createElement('span');
            titleSlot.id = 'header-project-title';
            header.appendChild(titleSlot);
        }
        const titleEl = document.getElementById('title-current');
        titleSlot.textContent = titleEl ? titleEl.textContent : '';

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

        ui.addEventListener('mouseenter', () => clearTimeout(hideTimer));
        ui.addEventListener('mouseleave', () => scheduleHide());
    };

    window.initProjectAutoHide();

    window.bindVideoTimeUpdate = function () {
        const currentVideo = document.getElementById("video-current");
        const timelineProgress = document.getElementById("timeline-progress");
        if (currentVideo && timelineProgress) {

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

        const ambBtn = e.target.closest(".amb-btn");
        if (ambBtn) {
            e.stopPropagation();
            return;
        }

        const btnGlobalSound = e.target.closest("#btn-global-sound");
        if (btnGlobalSound) {
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

        const logo = e.target.closest(".brand-link");
        if (logo) {
            e.preventDefault();
            e.stopPropagation();
            const url = logo.getAttribute('href');
            if (typeof barba !== 'undefined') barba.go(url);
            else window.location.href = url;
            return;
        }
    });

    document.addEventListener("input", (e) => {
        if (e.target.classList.contains("volume-slider")) {
            const newVolume = parseFloat(e.target.value);
            window.globalVolume = newVolume;

            const currentVideo = document.getElementById("video-current");
            if (currentVideo) {
                currentVideo.volume = newVolume;

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

    let isDraggingTimeline = false;

    function updateTimelineFromEvent(e, container) {
        const currentVideo = document.getElementById("video-current");
        if (currentVideo && currentVideo.duration) {
            const rect = container.getBoundingClientRect();
            let rawX = e.clientX - rect.left;

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

    window.applyGlobalSoundSettings = function () {
        const currentVideo = document.getElementById("video-current");
        if (currentVideo) {
            currentVideo.muted = !window.isGlobalSoundOn;
            currentVideo.volume = window.globalVolume;
        }
        updateSoundButtonsUI();
        syncVolumeSliders(window.globalVolume);
    };

    window.applyGlobalSoundSettings();

    const gridItems = document.querySelectorAll(".grid-item");
    gridItems.forEach((item, index) => {
        item.addEventListener("click", () => {
            const url = projectsData[index] ? projectsData[index].url : null;
            if (url) {
                if (window.isOverlayOpen) window.closeProjectsOverlay();
                setTimeout(() => {
                    if (typeof barba !== 'undefined') barba.go(url);
                    else window.location.href = url;
                }, 400); 
            }
        });
    });

    if (document.querySelector('[data-barba-namespace="project"]')) {
        document.body.style.overflowY = "auto";
        if (window.homeScrollObserver) window.homeScrollObserver.kill();
    }

    if (typeof barba !== 'undefined') {
        barba.hooks.after((data) => {
            const isArchive = document.querySelector('.all-projects-page');
            if (isArchive && window.allProjects) {
                deployArchive();
            }
        });
    }
});

// --- 🛠️ DATA ENGINE (PROJECTS VS FILES) ---
const PROJECT_METADATA = {
    "Crystal_Chardonnay": {
        "title": "Crystal Chardonnay",
        "role": "Réalisateur & DOP",
        "synopsis": "Une exploration visuelle onirique entre ombre et lumière, capturant l'essence vibrante de la nuit parisienne.",
        "credits": {
            "Réalisation": "gotreal",
            "DOP": "Gauthier Messager",
            "Montage": "gotreal",
            "ColorGrading": "DaVinci Resolve"
        }
    },
    "Slalom": {
        "title": "Slalom - Not Just a Club",
        "role": "Réalisateur",
        "synopsis": "Immersion totale dans l'énergie brute du club Slalom. Une captation cinématique des corps en mouvement.",
        "credits": {
            "Client": "Slalom Lille",
            "Production": "gotreal",
            "SoundDesign": "Industrial Techno"
        }
    },
    "Fragments_Nocturne": {
        "title": "Fragments Nocturne",
        "role": "Directeur Photo",
        "synopsis": "Une série de tableaux nocturnes explorant la solitude urbaine et la beauté des néons artificiels.",
        "credits": {
            "Artiste": "Eskha",
            "Lumière": "Gauthier Messager",
            "Camera": "ARRI Alexa Mini"
        }
    },
    "Mandragora_a_Slalom": {
        "title": "Mandragora @ Slalom",
        "role": "Réalisateur & Montage",
        "synopsis": "L'énergie psychédélique de Mandragora capturée en plein cœur du club lillois.",
        "credits": {
            "Artiste": "Mandragora",
            "Lieu": "Slalom",
            "Vibe": "Psytrance"
        }
    }
};

function getProjects(data) {
    const projectsMap = new Map();

    data.forEach(item => {
        let baseId = item.id.replace(/^\[.*?\]_/, '');
        baseId = baseId.replace(/_(\d+|main|NA|01|02|03|04|05|06|07|08|09|10|11)$/, '');

        if (!projectsMap.has(baseId)) {
            const meta = PROJECT_METADATA[baseId] || {};
            projectsMap.set(baseId, {
                id: baseId,
                category: item.category,
                rank: item.rank,
                displayTitle: meta.title || item.displayTitle || baseId.replace(/_/g, ' '),
                role: meta.role || "Réalisateur : gotreal",
                description: meta.synopsis || "Exploration visuelle et expérimentation cinématique par GOTREAL.",
                credits: meta.credits || { "Réalisation": "gotreal" },
                files: []
            });
        }

        const proj = projectsMap.get(baseId);
        proj.files.push(item);

        if (!proj.mainFile || item.id.includes('_main')) {
            proj.mainFile = item;
        } else if (!proj.mainFile.id.includes('_main') && item.id.includes('_01')) {
            proj.mainFile = item;
        }

        if (item.rank && item.rank !== 'RAW') {
            if (!proj.rank || proj.rank === 'RAW') proj.rank = item.rank;
        }
    });

    return Array.from(projectsMap.values());
}

// --- 🎬 HOME (CIELROSE) ---
function deployHome(data) {
    const projects = window.allProjects.filter(p => p.rank && p.rank.includes('TOP')).sort((a, b) => {
        const ra = parseInt(a.rank.match(/\d+/)) || 0;
        const rb = parseInt(b.rank.match(/\d+/)) || 0;
        return rb - ra;
    });

    const video = document.getElementById('video-current');
    const title = document.getElementById('title-current');
    const numbers = document.getElementById('cielrose-timeline-numbers');

    if (!video || projects.length === 0) return;

    window._projectsData = projects.map(p => ({
        title: p.displayTitle,
        // 👇 LIGNE MODIFIÉE 👇
        src: `${baseGCS}/assets/videos/${p.category}/${p.mainFile.id}.mp4`,
        url: `/project.html?id=${p.id}`,
        baseId: p.id
    }));
    window.totalProjects = projects.length;

    const firstProj = window._projectsData[0];
    if (firstProj && video) {
        video.src = firstProj.src;
        if (title) title.textContent = firstProj.title;
        video.play().catch(() => {});
    }

    if (numbers) {
        numbers.innerHTML = projects.map((p, i) => `<span data-index="${i}">${(i + 1).toString().padStart(2, '0')}</span>`).join('');
        if (window.updateHudTimeline) window.updateHudTimeline(1);
    }
}

// --- 📊 ARCHIVE : LE MOTEUR PRINCIPAL (Anti-AdBlock & Anti-Bug Accents) ---
function deployArchive(data) {
    const allProjectsPage = document.querySelector('.all-projects-page');
    if (!allProjectsPage) return;

    // 1. On récupère les catégories uniques
    const categories = ['ALL', ...new Set(window.allProjects.map(p => p.category))];

    // 2. Préparation du conteneur de filtres
    let filterContainer = document.getElementById('category-filters');
    if (!filterContainer) {
        filterContainer = document.createElement('div');
        filterContainer.id = 'category-filters';
        filterContainer.className = 'category-filters';
        const grid = document.getElementById('projects-grid');
        allProjectsPage.insertBefore(filterContainer, grid);
    }

    // --- 🎭 TRADUCTION VISUELLE ---
    // On masque les noms de dossiers techniques pour l'utilisateur
    const getDisplayName = (cat) => {
        const name = cat.toUpperCase();
        if (name === 'ALL') return 'TOUT';
        if (name === 'COMMERCIALS' || name === 'BRANDS' || name === 'PUBLICITE') return 'PUBLICITÉ'; 
        if (name === 'CAPTATIONS_LIVE') return 'LIVE';
        return name.replace(/_/g, ' '); // Remplace les underscores par des espaces
    };

    // 3. Génération des boutons avec data-index pour éviter les bugs de texte
    filterContainer.innerHTML = categories.map((cat, i) => `
        <button class="filter-btn ${i === 0 ? 'active' : ''}" data-index="${i}">
            ${getDisplayName(cat)}
        </button>
    `).join('');

    // 4. Fonction de rendu de la grille
    const renderGrid = (filterCategory) => {
        const grid = document.getElementById('projects-grid');
        if (!grid) return;

        let filteredProjects = window.allProjects;
        if (filterCategory !== 'ALL') {
            filteredProjects = window.allProjects.filter(p => p.category === filterCategory);
        }

        grid.innerHTML = filteredProjects.map(p => {
            const mainFile = p.mainFile || p.files[0];
            
            // On sécurise les chemins pour le navigateur (accents, espaces, uBlock)
            const safeCat = encodeURIComponent(p.category);
            const safeId = encodeURIComponent(mainFile.id);
            
            // 👇 LIGNES MODIFIÉES 👇
            const previewSrc = `${baseGCS}/assets/previews/${safeCat}/1080p/${safeId}_p0.mp4`;
            const fallbackSrc = `${baseGCS}/assets/videos/${safeCat}/${safeId}.mp4`;

            return `
                <div class="grid-item" style="opacity: 0; transform: translateY(20px);">
                    <a href="/project.html?id=${p.id}">
                        <div class="grid-content">
                            <video class="lazy-video" 
                                   data-src="${previewSrc}" 
                                   data-fallback="${fallbackSrc}"
                                   autoplay muted loop playsinline></video>
                        </div>
                        <div class="grid-label">${p.displayTitle}</div>
                    </a>
                </div>
            `;
        }).join('');

        // Relance des moteurs de la grille
        initBentoSizes();
        initWallOfVideo();
        initHoverSound();

        // Animation d'entrée GSAP
        gsap.to('.grid-item', {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.05,
            ease: "power2.out"
        });
    };

    // 5. Premier affichage
    renderGrid('ALL');

    // 6. Gestion des clics sur les filtres via l'index
    filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnEl = e.currentTarget;
            
            // UI Update
            filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btnEl.classList.add('active');

            // Filtrage par index pour éviter les problèmes d'encodage de caractères (é, à, etc.)
            const catIndex = parseInt(btnEl.getAttribute('data-index'));
            const selectedCat = categories[catIndex];
            
            renderGrid(selectedCat);
        });
    });
}
// --- 📐 1. LE DIRECTEUR ARTISTIQUE BENTO ---
function initBentoSizes() {
    const items = document.querySelectorAll('.grid-item');

    items.forEach((item, index) => {
        const video = item.querySelector('video');
        if (!video) return;

        const assignSize = () => {
            const ratio = video.videoHeight / video.videoWidth;
            
            item.classList.remove('bento-vertical', 'bento-wide', 'bento-large');

            if (ratio > 1.2) {
                item.classList.add('bento-vertical'); 
            } else {
                if (index % 5 === 0) {
                    item.classList.add('bento-large'); 
                } else if (index % 3 === 0) {
                    item.classList.add('bento-wide');  
                }
            }
        };

        if (video.readyState >= 1) {
            assignSize();
        } else {
            video.addEventListener('loadedmetadata', assignSize);
        }
    });
}

// --- 🎥 2. LE MUR DE VIDÉOS (Autoplay agressif) ---
function initWallOfVideo() {
    const videos = document.querySelectorAll('.lazy-video');
    if (window.gridLazyObserver) window.gridLazyObserver.disconnect();
    
    window.gridLazyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            
            if (entry.isIntersecting) {
                if (!video.src) {
                    video.src = video.dataset.src;
                    video.load(); 
                    video.onerror = () => {
                        video.src = video.dataset.fallback;
                        video.load();
                        video.onerror = null;
                    };
                }
                
                setTimeout(() => {
                    const playPromise = video.play();
                    if (playPromise !== undefined) playPromise.catch(() => {}); 
                }, 50);
            } 
        });
    }, { threshold: 0, rootMargin: "600px 0px" });

    videos.forEach(v => window.gridLazyObserver.observe(v));
}

// --- 🔊 3. LE SON AU SURVOL (Sans bug de pause) ---
function initHoverSound() {
    const items = document.querySelectorAll('.grid-item');
    
    items.forEach(item => {
        const video = item.querySelector('video');
        if (!video) return;

        item.addEventListener('mouseenter', () => {
            gsap.killTweensOf(video);
            video.muted = false;
            video.volume = 0;
            gsap.to(video, { volume: 1, duration: 0.4, ease: "power2.out" });
        });

        item.addEventListener('mouseleave', () => {
            gsap.killTweensOf(video);
            gsap.to(video, { 
                volume: 0, 
                duration: 0.3, 
                ease: "power2.in",
                onComplete: () => {
                    video.muted = true;
                }
            });
        });
    });
}