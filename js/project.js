// js/project.js - Injection des données & Lecteur Vidéo Custom

document.addEventListener("DOMContentLoaded", async () => {
    // === 1. CHARGEMENT DES DONNÉES JSON ===
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (!projectId) return;

    try {
        const response = await fetch('/data/projects.json');
        const projects = await response.json();
        const project = projects.find(p => p.id === projectId);

        if (!project) return;

        // Injection des textes
        const cleanTitle = project.displayTitle || project.id.replace(/\[.*?\]_?/, '').replace(/_/g, ' ');
        document.getElementById('title-current').textContent = cleanTitle;
        document.getElementById('role-main').textContent = project.category || "DIRECTOR";

        document.getElementById('pt-synopsis').textContent = project.synopsis || "Aucune description disponible pour ce projet.";
        document.getElementById('project-credits-list').innerHTML = project.credits ? project.credits.replace(/\n/g, '<br>') : "-";

        // Injection de la vidéo (Cherche la version _main)
        const videoElement = document.getElementById('video-current');
        const baseGCS = "https://storage.googleapis.com/gotreal-assets-paris"; 
        
        // 👇 LIGNE MODIFIÉE 👇
        videoElement.src = `${baseGCS}/assets/videos/${encodeURIComponent(project.category)}/${encodeURIComponent(project.id)}_main.mp4`;
        videoElement.load();

        // Relancer l'Ambilight
        if (typeof window.initAmbilight === 'function') window.initAmbilight();

    } catch (error) {
        console.error("Erreur de chargement du projet :", error);
    }

    // === 2. LOGIQUE DU LECTEUR VIDÉO CUSTOM ===
    const video = document.getElementById('video-current');
    const btnPause = document.getElementById('btn-pause');
    const btnSound = document.getElementById('btn-sound');
    const volumeSlider = document.getElementById('volume-immersive');
    const btnFullscreen = document.getElementById('btn-fullscreen');
    const timeline = document.getElementById('timeline');
    const timelineProgress = document.getElementById('timeline-progress');
    const videoWrapper = document.getElementById('main-video-wrapper');

    if (!video) return;

    // Play / Pause
    btnPause.addEventListener('click', () => {
        if (video.paused) {
            video.play();
            btnPause.textContent = "PAUSE";
        } else {
            video.pause();
            btnPause.textContent = "PLAY";
        }
    });

    // Mute / Unmute
    btnSound.addEventListener('click', () => {
        video.muted = !video.muted;
        btnSound.textContent = video.muted ? "SON: OFF" : "SON: ON";
        if (!video.muted && video.volume === 0) {
            video.volume = 1;
            volumeSlider.value = 1;
        }
    });

    // Volume Slider
    volumeSlider.addEventListener('input', (e) => {
        video.volume = e.target.value;
        if (video.volume > 0) {
            video.muted = false;
            btnSound.textContent = "SON: ON";
        } else {
            video.muted = true;
            btnSound.textContent = "SON: OFF";
        }
    });

    // Timeline Update (Progression)
    video.addEventListener('timeupdate', () => {
        if (!video.duration) return;
        const progress = (video.currentTime / video.duration) * 100;
        timelineProgress.style.width = `${progress}%`;
    });

    // Clic sur la Timeline pour naviguer
    timeline.addEventListener('click', (e) => {
        const rect = timeline.getBoundingClientRect();
        const clickPos = (e.clientX - rect.left) / rect.width;
        video.currentTime = clickPos * video.duration;
    });

    // Fullscreen API
    btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            if (videoWrapper.requestFullscreen) {
                videoWrapper.requestFullscreen();
            } else if (videoWrapper.webkitRequestFullscreen) { /* Safari */
                videoWrapper.webkitRequestFullscreen();
            }
            btnFullscreen.textContent = "QUITTER";
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
            btnFullscreen.textContent = "PLEIN ECRAN";
        }
    });
});