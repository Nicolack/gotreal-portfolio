/**
 * ambilight.js â€” Moteur Ambilight multi-modes
 *
 * MODES DISPONIBLES :
 *  0 Â· GLOW    â€” Halo classique aux 4 coins (mode actuel)
 *  1 Â· PULSE   â€” Respiration rythmÃ©e, la couleur dominante bat comme un cÅ“ur
 *  2 Â· AURORA  â€” Flux rotatif faÃ§on aurore borÃ©ale autour de la vidÃ©o
 *  3 Â· CINEMA  â€” Vignette latÃ©rale ultra-subtile / "projection de salle"
 *  4 Â· LASER   â€” DÃ©tecte les zones trÃ¨s lumineuses/colorÃ©es et projette
 *                des faisceaux laser vers l'extÃ©rieur de la box vidÃ©o
 */

(function () {
    'use strict';

    // â”€â”€â”€ Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const SAMPLE_W = 24;
    const SAMPLE_H = 14;
    const THROTTLE = 3;   // lire les pixels 1 frame/3 (~20fps)
    let MODE = 0;   // mode courant
    const TOTAL_MODES = 3;

    // â”€â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let videoEl, displayCanvas, ctx, sampleCanvas, sampleCtx;
    let rafId = null, frameCount = 0, startTime = performance.now();
    let pixelData = null;  // ImageData du dernier frame

    // â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    /** Cherche les N pixels les plus lumineux & saturÃ©s (pour mode Laser) */
    function findHotspots(N = 6) {
        const d = sampleCtx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
        const pts = [];
        for (let j = 0; j < SAMPLE_H; j++) {
            for (let i = 0; i < SAMPLE_W; i++) {
                const idx = (j * SAMPLE_W + i) * 4;
                const r = d[idx], g = d[idx + 1], b = d[idx + 2];
                // LuminositÃ© perceptuelle + boost si couleur hors-blanc/noir
                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                const sat = Math.max(r, g, b) - Math.min(r, g, b);
                const score = lum * 0.6 + sat * 0.8;
                if (score > 80) pts.push({ x: i / SAMPLE_W, y: j / SAMPLE_H, r, g, b, score });
            }
        }
        pts.sort((a, b) => b.score - a.score);
        return pts.slice(0, N);
    }

    // â”€â”€â”€ Modes de rendu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /** 0 Â· GLOW â€” Halo classique CielRose aux 4 coins + bords */
    function drawGlow(W, H) {
        const zones = {
            tl: sampleZone(0, 0, 0.3, 0.3),
            tr: sampleZone(0.7, 0, 0.3, 0.3),
            bl: sampleZone(0, 0.7, 0.3, 0.3),
            br: sampleZone(0.7, 0.7, 0.3, 0.3),
            ct: sampleZone(0.2, 0, 0.6, 0.2),
            cb: sampleZone(0.2, 0.8, 0.6, 0.2),
        };
        const R = W * 0.75;
        const paints = [
            { c: zones.tl, cx: 0, cy: 0 },
            { c: zones.tr, cx: W, cy: 0 },
            { c: zones.bl, cx: 0, cy: H },
            { c: zones.br, cx: W, cy: H },
            { c: zones.ct, cx: W / 2, cy: 0 },
            { c: zones.cb, cx: W / 2, cy: H },
        ];
        ctx.globalCompositeOperation = 'lighter';
        for (const p of paints) {
            const g = ctx.createRadialGradient(p.cx, p.cy, 0, p.cx, p.cy, R);
            g.addColorStop(0, rgba(p.c, 0.75));
            g.addColorStop(0.5, rgba(p.c, 0.25));
            g.addColorStop(1, rgba(p.c, 0));
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    /** 1 Â· AURORA â€” Flux de couleurs rotatif faÃ§on aurore borÃ©ale */
    function drawAurora(W, H, t) {
        const angle = t * 0.4;   // rotation lente
        const speed = t * 0.18;
        const nBands = 4;

        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < nBands; i++) {
            const phase = (i / nBands) * Math.PI * 2 + speed;
            // Couleur tirÃ©e de 4 coins tournants
            const cx = Math.cos(angle + i * Math.PI / 2);
            const cy = Math.sin(angle + i * Math.PI / 2);
            const ox = 0.25 + 0.25 * cx;
            const oy = 0.25 + 0.25 * cy;
            const col = sampleZone(ox, oy, 0.25, 0.25);
            const ripple = Math.sin(phase) * 0.5 + 0.5;

            const px = W * (0.5 + 0.5 * Math.cos(angle + i * Math.PI / 2 + speed));
            const py = H * (0.5 + 0.5 * Math.sin(angle + i * Math.PI / 2 + speed));
            const r = W * (0.35 + ripple * 0.2);

            const g = ctx.createRadialGradient(px, py, 0, px, py, r);
            g.addColorStop(0, rgba(col, 0.6));
            g.addColorStop(0.5, rgba(col, 0.2));
            g.addColorStop(1, rgba(col, 0));
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    /** 2 Â· LASER â€” Projette des faisceaux depuis les zones trÃ¨s lumineuses */
    function drawLaser(W, H, t) {
        const hotspots = findHotspots(8);
        ctx.globalCompositeOperation = 'lighter';

        for (const pt of hotspots) {
            // Position du hotspot dans le canvas display
            const sx = pt.x * W;
            const sy = pt.y * H;

            // Pulsation lÃ©gÃ¨re sur chaque faisceau
            const pulse = 0.5 + 0.5 * Math.sin(t * 4 + pt.x * 10 + pt.y * 7);
            const alpha = (pt.score / 255) * (0.5 + 0.4 * pulse);
            const col = [pt.r, pt.g, pt.b];

            // Projette 4 faisceaux : vers les 4 bords du canvas
            const targets = [
                [0, sy],      // gauche
                [W, sy],      // droite
                [sx, 0],       // haut
                [sx, H],       // bas
            ];

            for (const [tx, ty] of targets) {
                const dist = Math.hypot(tx - sx, ty - sy);
                const beamW = (8 + pulse * 6);  // largeur du faisceau en px au point d'orig.

                // Gradient le long du faisceau
                const g = ctx.createLinearGradient(sx, sy, tx, ty);
                g.addColorStop(0, rgba(col, alpha * 0.9));
                g.addColorStop(0.35, rgba(col, alpha * 0.35));
                g.addColorStop(1, rgba(col, 0));
                ctx.strokeStyle = g;
                ctx.lineWidth = beamW;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(tx, ty);
                ctx.stroke();

                // Point source lumineux
                const gDot = ctx.createRadialGradient(sx, sy, 0, sx, sy, beamW * 2);
                gDot.addColorStop(0, rgba(col, alpha));
                gDot.addColorStop(1, rgba(col, 0));
                ctx.fillStyle = gDot;
                ctx.beginPath();
                ctx.arc(sx, sy, beamW * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    // â”€â”€â”€ Boucle principale â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function draw() {
        const W = displayCanvas.width, H = displayCanvas.height;
        const t = (performance.now() - startTime) / 1000;

        ctx.clearRect(0, 0, W, H);

        try {
            sampleCtx.drawImage(videoEl, 0, 0, SAMPLE_W, SAMPLE_H);
        } catch (e) { return; }

        switch (MODE) {
            case 0: drawGlow(W, H); break;
            case 1: drawAurora(W, H, t); break;
            case 2: drawLaser(W, H, t); break;
        }
    }

    function loop() {
        rafId = requestAnimationFrame(loop);
        if (!videoEl || videoEl.paused || videoEl.readyState < 2) return;
        frameCount++;
        const throttle = MODE === 1 ? 1 : THROTTLE; // Aurora: full fps
        if (frameCount % throttle !== 0) return;
        draw();
    }

    // â”€â”€â”€ Resize â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function resize() {
        if (!displayCanvas) return;
        const wr = displayCanvas.parentElement;
        if (!wr) return;
        displayCanvas.width = wr.offsetWidth;
        displayCanvas.height = wr.offsetHeight;
    }

    // â”€â”€â”€ UI Switcher (Utilise le HTML existant s'il y est) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function bindSwitcher() {
        const ui = document.getElementById('ambilight-switcher');
        if (!ui) return;

        // Assurer que l'Ã©tat initial (MODE courant) correspond au bouton visuel
        const btns = ui.querySelectorAll('.amb-btn');
        if (btns.length > 0) {
            btns.forEach(b => b.classList.remove('amb-active'));
            const targetBtn = ui.querySelector(`.amb-btn[data-mode="${MODE}"]`) || btns[0];
            targetBtn.classList.add('amb-active');
        }

        // On Ã©vite d'attacher plusieurs fois l'event si la page ne s'est pas rechargÃ©e (Barba.js)
        if (ui.dataset.ambBound === 'true') return;
        ui.dataset.ambBound = 'true';

        ui.addEventListener('click', (e) => {
            const btn = e.target.closest('.amb-btn');
            if (!btn) return;
            let modeStr = btn.dataset.mode;

            // Map the string modes to numeric index if needed
            if (isNaN(modeStr)) {
                const modes = ['GLOW', 'AURORA', 'LASER'];
                modeStr = modes.indexOf(modeStr);
                if (modeStr === -1) modeStr = 0;
            }

            MODE = parseInt(modeStr);
            ui.querySelectorAll('.amb-btn').forEach(b => b.classList.remove('amb-active'));
            btn.classList.add('amb-active');
        });
    }

    // â”€â”€â”€ Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

