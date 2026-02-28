/**
 * ambilight.js — Moteur Ambilight multi-modes
 *
 * MODES DISPONIBLES :
 * 0 · HALO  — Halo massif et diffus
 * 1 · FLUX  — Vagues psychédéliques très marquées autour de la vidéo
 * 2 · NÉON  — Faisceaux intenses, stroboscopiques, avec un cœur blanc et un halo coloré
 */

(function () {
    'use strict';

    // ─── Config ────────────────────────────────────────────────────────────────
    const SAMPLE_W = 24;
    const SAMPLE_H = 14;
    const THROTTLE = 3;   // lire les pixels 1 frame/3 (~20fps)
    let MODE = 0;   // mode courant
    const TOTAL_MODES = 3;

    // ─── State ─────────────────────────────────────────────────────────────────
    let videoEl, displayCanvas, ctx, sampleCanvas, sampleCtx;
    let rafId = null, frameCount = 0, startTime = performance.now();

    // ─── Helpers ───────────────────────────────────────────────────────────────
    function rgba([r, g, b], a) { return `rgba(${r},${g},${b},${a})`; }

    /** Lit la couleur moyenne d'une zone (fraction de SAMPLE) */
    function sampleZone(x, y, w, h) {
        const sx = Math.floor(x * SAMPLE_W), sy = Math.floor(y * SAMPLE_H);
        const sw = Math.max(1, Math.floor(w * SAMPLE_W)), sh = Math.max(1, Math.floor(h * SAMPLE_H));
        const d = sampleCtx.getImageData(sx, sy, sw, sh).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
        return n ? [r / n | 0, g / n | 0, b / n | 0] : [0, 0, 0];
    }

    /** Couleur dominante globale */
    function dominantColor() {
        return sampleZone(0.1, 0.1, 0.8, 0.8);
    }

    /** Cherche les N pixels les plus lumineux & saturés (pour mode Néon) */
    function findHotspots(N = 6) {
        const d = sampleCtx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
        const pts = [];
        for (let j = 0; j < SAMPLE_H; j++) {
            for (let i = 0; i < SAMPLE_W; i++) {
                const idx = (j * SAMPLE_W + i) * 4;
                const r = d[idx], g = d[idx + 1], b = d[idx + 2];
                // Luminosité perceptuelle + boost si couleur hors-blanc/noir
                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                const sat = Math.max(r, g, b) - Math.min(r, g, b);
                const score = lum * 0.6 + sat * 0.8;
                if (score > 80) pts.push({ x: i / SAMPLE_W, y: j / SAMPLE_H, r, g, b, score });
            }
        }
        pts.sort((a, b) => b.score - a.score);
        return pts.slice(0, N);
    }

    // ─── Modes de rendu ────────────────────────────────────────────────────────

    /** 0 · HALO — Halo massif et diffus */
    function drawHalo(W, H) {
        const col = dominantColor();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.8);
        g.addColorStop(0, rgba(col, 0.9));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
    }

    /** 1 · FLUX — Vagues psychédéliques */
    function drawFlux(W, H, t) {
        const angle = t * 0.5;
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 3; i++) {
            const phase = (i / 3) * Math.PI * 2 + (t * 0.5);
            const col = sampleZone(0.3 + i * 0.2, 0.5, 0.2, 0.2);

            const px = W / 2 + Math.cos(phase) * (W * 0.4);
            const py = H / 2 + Math.sin(phase * 1.5) * (H * 0.4);
            const r = W * 0.6;

            const g = ctx.createRadialGradient(px, py, 0, px, py, r);
            g.addColorStop(0, rgba(col, 0.8));
            g.addColorStop(0.5, rgba(col, 0.3));
            g.addColorStop(1, rgba(col, 0));
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    /** 2 · NÉON — Faisceaux ultra-lumineux stroboscopiques */
    function drawNeon(W, H, t) {
        const hotspots = findHotspots(5);
        ctx.globalCompositeOperation = 'lighter'; // Lighter empile les lumières pour un effet éblouissant

        for (const pt of hotspots) {
            const sx = pt.x * W;
            const sy = pt.y * H;
            const pulse = 0.5 + 0.5 * Math.sin(t * 15 + pt.x * 20); // Clignotement agressif
            const alpha = (pt.score / 255) * pulse;
            const col = [pt.r, pt.g, pt.b];

            // Le cœur du néon est un mélange de la couleur et de blanc pur
            const coreCol = [Math.min(255, pt.r + 150), Math.min(255, pt.g + 150), Math.min(255, pt.b + 150)];

            const targets = [[0, sy], [W, sy], [sx, 0], [sx, H]];

            for (const [tx, ty] of targets) {
                // 1. Halo extérieur (très large, très transparent)
                const gOuter = ctx.createLinearGradient(sx, sy, tx, ty);
                gOuter.addColorStop(0, rgba(col, alpha * 0.3));
                gOuter.addColorStop(1, rgba(col, 0));

                ctx.strokeStyle = gOuter;
                ctx.lineWidth = 15 + pulse * 10;
                ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke();

                // 2. Halo coloré intermédiaire (plus fin, plus intense)
                const gMid = ctx.createLinearGradient(sx, sy, tx, ty);
                gMid.addColorStop(0, rgba(col, alpha * 0.7));
                gMid.addColorStop(1, rgba(col, 0));

                ctx.strokeStyle = gMid;
                ctx.lineWidth = 6 + pulse * 4;
                ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke();

                // 3. Cœur du néon (très fin, brûlant)
                const gCore = ctx.createLinearGradient(sx, sy, tx, ty);
                gCore.addColorStop(0, rgba(coreCol, alpha));
                gCore.addColorStop(0.7, rgba(col, 0));

                ctx.strokeStyle = gCore;
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke();
            }
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    // ─── Boucle principale ─────────────────────────────────────────────────────
    function draw() {
        const W = displayCanvas.width, H = displayCanvas.height;
        const t = (performance.now() - startTime) / 1000;

        ctx.clearRect(0, 0, W, H);

        try {
            sampleCtx.drawImage(videoEl, 0, 0, SAMPLE_W, SAMPLE_H);
        } catch (e) { return; }

        switch (MODE) {
            case 0: drawHalo(W, H); break;
            case 1: drawFlux(W, H, t); break;
            case 2: drawNeon(W, H, t); break;
        }
    }

    function loop() {
        rafId = requestAnimationFrame(loop);
        if (!videoEl || videoEl.paused || videoEl.readyState < 2) return;
        frameCount++;
        const throttle = MODE === 1 ? 1 : THROTTLE;
        if (frameCount % throttle !== 0) return;
        draw();
    }

    // ─── Resize ────────────────────────────────────────────────────────────────
    function resize() {
        if (!displayCanvas) return;
        const wr = displayCanvas.parentElement;
        if (!wr) return;
        displayCanvas.width = wr.offsetWidth;
        displayCanvas.height = wr.offsetHeight;
    }

    // ─── UI Switcher ───────────────────────────────────────────────────────────
    function bindSwitcher() {
        const ui = document.getElementById('ambilight-switcher');
        if (!ui) return;

        const btns = ui.querySelectorAll('.amb-btn');
        if (btns.length > 0) {
            btns.forEach(b => b.classList.remove('amb-active'));
            const targetBtn = ui.querySelector(`.amb-btn[data-mode="${MODE}"]`) || btns[0];
            targetBtn.classList.add('amb-active');
        }

        if (ui.dataset.ambBound === 'true') return;
        ui.dataset.ambBound = 'true';

        ui.addEventListener('click', (e) => {
            const btn = e.target.closest('.amb-btn');
            if (!btn) return;
            let modeStr = btn.dataset.mode;

            if (isNaN(modeStr)) {
                // Mise à jour des noms pour le mapping textuel
                const modes = ['HALO', 'FLUX', 'NÉON'];
                modeStr = modes.indexOf(modeStr);
                if (modeStr === -1) modeStr = 0;
            }

            MODE = parseInt(modeStr);
            ui.querySelectorAll('.amb-btn').forEach(b => b.classList.remove('amb-active'));
            btn.classList.add('amb-active');
        });
    }

    // ─── Init ──────────────────────────────────────────────────────────────────
    window.initAmbilight = function () {
        videoEl = document.getElementById('video-current');
        displayCanvas = document.getElementById('ambilight-canvas');
        if (!videoEl || !displayCanvas) return;

        ctx = displayCanvas.getContext('2d');

        sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = SAMPLE_W;
        sampleCanvas.height = SAMPLE_H;
        sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

        resize();
        window.addEventListener('resize', resize);

        if (rafId) cancelAnimationFrame(rafId);
        frameCount = 0;
        startTime = performance.now();
        loop();

        bindSwitcher();
    };

    window.refreshAmbilight = function () {
        videoEl = document.getElementById('video-current');
        bindSwitcher();
    };

    window.setAmbilightMode = function (m) {
        MODE = m % TOTAL_MODES;
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.initAmbilight);
    } else {
        window.initAmbilight();
    }
})();