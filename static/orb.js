/**
 * Puro Omega - Orb 3D con partículas tipo gotas de agua
 * Esfera con puntos que cambian entre los colores corporativos
 */

(function() {
    // Colores corporativos Puro Omega
    const COLORS = [
        { r: 49, g: 190, b: 239 },   // Tech Cyan #31BEEF
        { r: 153, g: 78, b: 149 },    // Visionary Violet #994E95
        { r: 161, g: 184, b: 242 },   // Soft Blue #A1B8F2
    ];

    // Estado global
    let isListening = false;
    const orbInstances = [];

    // Interpolar entre dos colores
    function lerpColor(c1, c2, t) {
        return {
            r: Math.round(c1.r + (c2.r - c1.r) * t),
            g: Math.round(c1.g + (c2.g - c1.g) * t),
            b: Math.round(c1.b + (c2.b - c1.b) * t),
        };
    }

    // Obtener color cíclico basado en tiempo
    function getCyclicColor(time, offset) {
        const speed = 0.3;
        const t = ((time * speed + offset) % 3 + 3) % 3;
        const idx = Math.floor(t);
        const frac = t - idx;
        const c1 = COLORS[idx % 3];
        const c2 = COLORS[(idx + 1) % 3];
        return lerpColor(c1, c2, frac);
    }

    // Clase Partícula (punto en superficie de esfera)
    class Particle {
        constructor(index, total) {
            // Distribución uniforme en esfera (Fibonacci sphere)
            const phi = Math.acos(1 - 2 * (index + 0.5) / total);
            const theta = Math.PI * (1 + Math.sqrt(5)) * index;

            this.basePhi = phi;
            this.baseTheta = theta;
            this.phi = phi;
            this.theta = theta;

            // Offset de color único por partícula
            this.colorOffset = Math.random() * 3;

            // Tamaño base (variado para parecer gotas)
            this.baseSize = 1.5 + Math.random() * 2.5;

            // Opacidad base
            this.baseAlpha = 0.5 + Math.random() * 0.5;

            // Velocidad propia para movimiento orgánico
            this.phiSpeed = (Math.random() - 0.5) * 0.002;
            this.thetaSpeed = (Math.random() - 0.5) * 0.003;

            // Para efecto "gota de agua" - oscilación del radio
            this.radiusOffset = Math.random() * Math.PI * 2;
            this.radiusSpeed = 0.5 + Math.random() * 1.5;
        }

        update(time, listening) {
            if (listening) {
                // Listening: movimiento intenso y expresivo
                this.phi = this.basePhi + Math.sin(time * 2.8 + this.radiusOffset) * 0.45;
                this.theta = this.baseTheta + time * 2.0 + Math.cos(time * 2.5 + this.radiusOffset) * 0.3;
            } else {
                // Idle: tormenta líquida - flujo constante y expresivo
                this.phi = this.basePhi + Math.sin(time * 1.3 + this.radiusOffset) * 0.25;
                this.theta = this.baseTheta + Math.sin(time * 0.9 + this.colorOffset) * 0.2;
            }
        }

        getPosition(radius) {
            const x = radius * Math.sin(this.phi) * Math.cos(this.theta);
            const y = radius * Math.cos(this.phi);
            const z = radius * Math.sin(this.phi) * Math.sin(this.theta);
            return { x, y, z };
        }
    }

    // Clase Orb
    class Orb {
        constructor(canvas, size) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.size = size;

            // Escala para retina
            const dpr = window.devicePixelRatio || 1;
            canvas.width = size * dpr;
            canvas.height = size * dpr;
            canvas.style.width = size + 'px';
            canvas.style.height = size + 'px';
            this.ctx.scale(dpr, dpr);

            this.centerX = size / 2;
            this.centerY = size / 2;
            this.radius = size * 0.36;

            // Crear partículas
            const numParticles = size > 100 ? 200 : 80;
            this.particles = [];
            for (let i = 0; i < numParticles; i++) {
                this.particles.push(new Particle(i, numParticles));
            }

            this.time = 0;
            this.rotationY = 0;
            this.animId = null;
            this.running = false;
        }

        start() {
            if (this.running) return;
            this.running = true;
            this.lastTime = performance.now();
            this.loop();
        }

        stop() {
            this.running = false;
            if (this.animId) {
                cancelAnimationFrame(this.animId);
                this.animId = null;
            }
        }

        loop() {
            if (!this.running) return;

            const now = performance.now();
            const dt = (now - this.lastTime) / 1000;
            this.lastTime = now;
            this.time += dt;

            // Rotación de la esfera
            if (isListening) {
                this.rotationY += dt * 1.5;
            } else {
                this.rotationY += dt * 0.4;
            }

            this.draw();
            this.animId = requestAnimationFrame(() => this.loop());
        }

        draw() {
            const ctx = this.ctx;
            const { centerX, centerY, radius, size } = this;

            // Limpiar
            ctx.clearRect(0, 0, size, size);

            // Sombra oscura detrás de la esfera (contraste con fondo claro)
            const shadow = ctx.createRadialGradient(centerX + 2, centerY + 4, radius * 0.3, centerX + 2, centerY + 4, radius * 1.3);
            shadow.addColorStop(0, 'rgba(30, 20, 50, 0.18)');
            shadow.addColorStop(0.6, 'rgba(30, 20, 50, 0.06)');
            shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = shadow;
            ctx.fillRect(0, 0, size, size);

            // Glow de color (resplandor de la esfera)
            const glowColor = getCyclicColor(this.time, 0);
            const glowAlpha = isListening ? 0.25 : 0.15;
            const glow = ctx.createRadialGradient(centerX, centerY, radius * 0.1, centerX, centerY, radius * 1.5);
            glow.addColorStop(0, `rgba(${glowColor.r}, ${glowColor.g}, ${glowColor.b}, ${glowAlpha})`);
            glow.addColorStop(0.5, `rgba(${glowColor.r}, ${glowColor.g}, ${glowColor.b}, ${glowAlpha * 0.3})`);
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, size, size);

            // Calcular posiciones 3D → 2D de cada partícula
            const projected = [];
            const cosR = Math.cos(this.rotationY);
            const sinR = Math.sin(this.rotationY);

            for (const p of this.particles) {
                p.update(this.time, isListening);
                const pos = p.getPosition(radius);

                // Rotación en Y
                const rx = pos.x * cosR - pos.z * sinR;
                const rz = pos.x * sinR + pos.z * cosR;
                const ry = pos.y;

                // Efecto "gota": radio varía con intensidad
                const dropEffect = 1 + Math.sin(this.time * p.radiusSpeed + p.radiusOffset) * (isListening ? 0.2 : 0.12);

                const screenX = centerX + rx * dropEffect;
                const screenY = centerY + ry * dropEffect;

                // Profundidad para tamaño y opacidad
                const depth = (rz / radius + 1) / 2; // 0 (atrás) a 1 (frente)

                projected.push({
                    x: screenX,
                    y: screenY,
                    z: rz,
                    depth,
                    particle: p
                });
            }

            // Ordenar por profundidad (pintar los de atrás primero)
            projected.sort((a, b) => a.z - b.z);

            // Dibujar partículas
            for (const pp of projected) {
                const p = pp.particle;
                const color = getCyclicColor(this.time, p.colorOffset);

                // Tamaño según profundidad
                const depthScale = 0.4 + pp.depth * 0.6;
                const sizeMultiplier = isListening ? 1.3 : 1;
                const dotSize = p.baseSize * depthScale * sizeMultiplier;

                // Opacidad según profundidad
                const alpha = p.baseAlpha * (0.3 + pp.depth * 0.7) * (isListening ? 1 : 0.85);

                // Dibujar punto con brillo (efecto gota de agua)
                ctx.beginPath();
                ctx.arc(pp.x, pp.y, dotSize, 0, Math.PI * 2);

                // Gradiente radial para efecto gota brillante
                const gradient = ctx.createRadialGradient(
                    pp.x - dotSize * 0.3, pp.y - dotSize * 0.3, 0,
                    pp.x, pp.y, dotSize
                );
                gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
                gradient.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
                gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.3})`);

                ctx.fillStyle = gradient;
                ctx.fill();
            }
        }

        destroy() {
            this.stop();
        }
    }

    // Crear orb en un contenedor
    function createOrb(containerId, defaultSize) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        // Limpiar
        container.innerHTML = '';

        // Usar el tamaño real del contenedor (ancho o alto, el menor)
        const w = container.offsetWidth;
        const h = container.offsetHeight;
        const size = Math.min(w, h) || w || h || defaultSize;

        // Crear canvas
        const canvas = document.createElement('canvas');
        canvas.style.display = 'block';
        container.appendChild(canvas);

        const orb = new Orb(canvas, size);
        orb.start();

        return {
            id: containerId,
            container,
            orb,
            defaultSize
        };
    }

    // Crear orb principal — esperar a que el layout esté listo
    function initMainOrb() {
        const container = document.getElementById('orb-container');
        if (container && container.offsetWidth > 0) {
            const mainOrb = createOrb('orb-container', 220);
            if (mainOrb) orbInstances.push(mainOrb);
        } else {
            // Layout aún no listo, reintentar
            requestAnimationFrame(initMainOrb);
        }
    }
    initMainOrb();

    // API pública: controlar estado listening
    window.orbSetListening = function(listening) {
        isListening = listening;
    };

    // API pública: crear mini orb
    window.orbCreateMini = function() {
        const existing = orbInstances.find(o => o && o.id === 'orb-container-mini');
        if (existing) return;

        const miniOrb = createOrb('orb-container-mini', 56);
        if (miniOrb) orbInstances.push(miniOrb);
    };
})();
