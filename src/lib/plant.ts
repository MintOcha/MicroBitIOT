import { simState } from "./globals.svelte";
import type { p5 } from "p5-svelte";

class plant {
    posx: number;
    posz: number;
    id: number;
    tiltAngle: number;
    health: number;
    growth: number;
    stemHeight: number;
    safe: number;
    growthFactor: number;
    windPhase: number;
    windStrength: number;

    constructor(p5: p5, posx: number, posz: number, id: number) {
        this.posx = posx;
        this.posz = posz;
        this.id = id;

        this.tiltAngle = p5.radians(p5.random(-180, 180));
        this.health = helth(p5, simState.soilm, simState.temp, simState.light, 1);
        this.growth = 0;
        this.stemHeight = 0;
        this.safe = 1;

        // 🌱 Random growth variation
        this.growthFactor = p5.random(0.8, 1.2);

        // 🌬️ Wind variation
        this.windPhase = p5.random(1000); // unique per plant
        this.windStrength = p5.random(0.8, 1.2); // sway variation
    }

    struckByLightning(p5: p5, d: number) {
        this.safe = p5.min(d / (p5.width / 50), 1);
    }

    update(p5: p5) {
        if (this.growth === 1) this.reset(p5);

        this.health = helth(p5, simState.soilm, simState.temp, simState.light, this.safe);

        // 🌱 Growth rate modified by plant’s unique growthFactor
        let growthRate = p5.map(this.health, 0, 1, -0.0005, 0.00028) * simState.simSpeed * this.growthFactor;
        this.growth = p5.constrain(this.growth + growthRate, 0, 1);

        this.stemHeight = (p5.height / 10) * this.growth;

        // 🔥 Gradually recovers from lightning strikes
        this.safe += ((1 - this.safe) / 1000) * simState.simSpeed;
    }

    display(p5: p5) {
        this.update(p5);

        p5.push();
        p5.noStroke();
        p5.translate(this.posx, p5.windowHeight / 5 - simState.boxl / 6 - this.stemHeight / 2, this.posz);

        // --- Wind sway ---
        let t = p5.frameCount * 0.01;
        let windSway = p5.sin(t * simState.simSpeed + this.windPhase) * simState.windSpeed * 10 * this.windStrength;
        p5.rotateZ(p5.radians(windSway));

        // --- Wilting based on health ---
        let wiltAngle = p5.map(this.health, 0, 1, 50, 0);
        p5.rotateZ(p5.radians(wiltAngle));
        p5.rotateY(this.tiltAngle);

        // --- Stem ---
        let segments = 8;
        let segHeight = this.stemHeight / segments;
        for (let i = 0; i < segments; i++) {
            p5.push();
            let tilt = p5.map(this.health, 0, 1, 8, 0);
            p5.rotateZ(p5.radians(i * tilt));

            let progress = i / segments;
            let growR = p5.lerp(40, 194, progress * this.growth);
            let growG = p5.lerp(150, 178, progress * this.growth);
            let growB = p5.lerp(40, 128, progress * this.growth);

            let dullFactor = p5.map(this.health, 0, 1, 0.5, 1.0);
            p5.fill(growR * dullFactor, growG * dullFactor, growB * dullFactor);

            p5.translate(0, -segHeight / 2 - i * segHeight, 0);
            p5.cylinder(2, segHeight);
            p5.pop();
        }

        // --- Leaves ---
        let leafCount = p5.floor(p5.map(this.growth, 0, 1, 2, 6));
        for (let i = 1; i <= leafCount; i++) {
            p5.push();
            let yOffset = -this.stemHeight / 2 + (i * this.stemHeight) / (leafCount + 1);
            p5.translate(0, yOffset, 0);
            p5.rotateY(p5.radians(i * 70));

            let leafLength = p5.map(this.growth, 0, 1, 20, 60);
            let leafWidth = p5.map(this.growth, 0, 1, 3, 12);

            p5.fill(34 * this.health, 120 * this.health, 34 * this.health);
            let leafSegs = 3;
            for (let j = 0; j < leafSegs; j++) {
                p5.push();
                p5.rotateZ(p5.radians(15 + j * 10));
                p5.translate(leafLength / 6, 0, 0);
                p5.box(leafLength / leafSegs, leafWidth, 2);
                p5.pop();
                p5.translate(leafLength / leafSegs, 0, 0);
            }
            p5.pop();
        }

        // --- Corn Cob (gradual appearance) ---
        if (this.growth > 0.8) {
            let cobProgress = p5.map(this.growth, 0.8, 1.0, 0, 1, true); // 0 → 1 fade in
            p5.translate(0, -this.stemHeight / 2, 0);

            let grainColor = this.health > 0.3 ? p5.color(218, 185, 60) : p5.color(200, 180, 100);
            grainColor.setAlpha(255 * cobProgress); // fade in opacity
            p5.fill(grainColor);

            let grainLayers = 5;
            let cobSize = 2.5 * cobProgress; // 🌽 size grows with cobProgress

            for (let i = 0; i < 6; i++) {
                p5.push();
                p5.rotateY(p5.radians(i * 60));
                for (let j = 0; j < grainLayers; j++) {
                    p5.translate(0, -j * 5 * cobProgress, 6 * cobProgress);
                    p5.sphere(cobSize, 6, 6);
                    p5.translate(0, j * 5 * cobProgress, -6 * cobProgress);
                }
                p5.pop();
            }
        }

        p5.pop();
    }

    reset(p5: p5) {
        simState.score++;
        this.tiltAngle = p5.radians(p5.random(-180, 180));
        this.health = helth(p5, simState.soilm, simState.temp, simState.light, 1);
        this.growth = 0;
        this.stemHeight = 0;
        this.safe = 1;

        // 🌱 Random growth variation
        this.growthFactor = p5.random(0.8, 1.2);

        // 🌬️ Wind variation
        this.windPhase = p5.random(1000); // unique per plant
        this.windStrength = p5.random(0.8, 1.2); // sway variation
    }
}

// --- Safe helth function ---
function helth(p5: p5, soilm: number, temp: number, light: number, safety = 1) {
    let vals = [soilm, temp, light, safety].map((v) => (isNaN(v) ? 0 : v));
    return p5.constrain((soilmhelth(p5, vals[0]) + temphelth(p5, vals[1]) + lighthelth(p5, vals[2]) + vals[3]) / 4, 0, 1);
}

function soilmhelth(p5: p5, soilm: number) {
    return p5.sin(p5.PI * soilm - 0.3);
}

function temphelth(p5: p5, temp: number) {
    let convertedTemp = (temp / 65) * 100;
    return 2 * p5.exp(2 * convertedTemp - 1.6) * (1.9 - p5.exp(0.8 * convertedTemp));
}

function lighthelth(p5: p5, light: number) {
    return 1.2 * p5.exp(-0.1 / (light + 0.013));
}

export { plant };
