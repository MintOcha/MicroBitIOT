import { simState } from "$lib/globals.svelte";
import type { p5 } from "p5-svelte";

class SunMoon {
    size: number;
    brightness: number;
    orbRadius: number;
    posx: number;
    posy: number;
    moonx: number;
    moony: number;
    angle: number;
    angle2: number;

    constructor(Size: number, Brightness: number, OrbitRadius: number) {
        this.size = Size;
        this.brightness = Brightness;
        this.orbRadius = OrbitRadius;
        this.posx = 0;
        this.posy = 0;
        this.moonx = 0;
        this.moony = 0;
        this.angle = 0;
        this.angle2 = 0;
    }

    display(p5: p5) {
        let syncedTime = Date.now() + simState.desync;
        let prevAngle = this.angle;
        this.angle = ((syncedTime / 2000) * simState.simSpeed) % (2 * p5.PI);
        if (this.angle < prevAngle) simState.daysElapsed++;

        //print(this.angle)
        // NOTE: when pi is 0 the moon is rising not the sun (expected: sun)

        this.angle2 = this.angle - p5.PI;

        p5.push();
        p5.noStroke();

        [this.posx, this.posy] = calculatePosition(p5, this.angle, this.orbRadius);

        p5.translate(this.posx, this.posy, 0);

        // draw the sun here
        p5.fill(255, 255, 255, getSunAlpha(p5, this.angle));
        p5.sphere(this.size);

        p5.pop();

        p5.push();
        // draw the moon
        p5.noStroke();
        p5.translate(this.moonx, this.moony, 0);
        [this.moonx, this.moony] = calculatePosition(p5, this.angle2, this.orbRadius);
        p5.fill(209, 200, 174, getMoonAlpha(p5, this.angle));
        p5.sphere((this.size * 2) / 3);

        // end of item creation, lighting time :3
        p5.pop();
        let c = p5.color(255, 255, 235);
        p5.lightFalloff(0.5, 0, 0);
        p5.pointLight(c, this.posx, this.posy, 0); // If popped the light will no longer affect other items

        // Moon lighting
        let c2 = p5.color(225, 225, 235);
        p5.lightFalloff(1, 0, 0);
        p5.pointLight(c2, this.moonx, this.moony, 0);

        // Ambient and background colours
        p5.ambientLight(calculateAmbientLight(p5, this.angle));
        simState.bgcolor = calculateBgColour(p5, this.angle);
    }
}

function calculateAmbientLight(p5: p5, angle: number) {
    // Normalize angle to [0, 2π)
    angle = angle % (2 * Math.PI);
    if (angle < 0) angle += 2 * Math.PI;

    // Define key colours (r,g,b,intensity)
    const sunset = { r: 1.0, g: 0.5, b: 0.2, i: 0.6 }; // orange warm
    const night = { r: 0.1, g: 0.1, b: 0.3, i: 0.2 }; // dark blue
    const sunrise = { r: 1.0, g: 0.7, b: 0.3, i: 0.7 }; // golden
    const day = { r: 0.9, g: 0.9, b: 1.0, i: 1.0 }; // bright white-blue

    let r, g, b, i;

    if (angle < Math.PI / 2) {
        // Early night → Deep night
        const t = p5.map(angle, 0, Math.PI / 2, 0, 1);
        r = p5.lerp(sunset.r, night.r, t);
        g = p5.lerp(sunset.g, night.g, t);
        b = p5.lerp(sunset.b, night.b, t);
        i = p5.lerp(sunset.i, night.i, t);
    } else if (angle < Math.PI) {
        // Deep night → Pre-dawn
        const t = p5.map(angle, Math.PI / 2, Math.PI, 0, 1);
        r = p5.lerp(night.r, sunrise.r, t);
        g = p5.lerp(night.g, sunrise.g, t);
        b = p5.lerp(night.b, sunrise.b, t);
        i = p5.lerp(night.i, sunrise.i, t);
    } else if (angle < (3 * Math.PI) / 2) {
        // Sunrise → Full day
        const t = p5.map(angle, Math.PI, (3 * Math.PI) / 2, 0, 1);
        r = p5.lerp(sunrise.r, day.r, t);
        g = p5.lerp(sunrise.g, day.g, t);
        b = p5.lerp(sunrise.b, day.b, t);
        i = p5.lerp(sunrise.i, day.i, t);
    } else {
        // Full day → Sunset
        const t = p5.map(angle, (3 * Math.PI) / 2, 2 * Math.PI, 0, 1);
        r = p5.lerp(day.r, sunset.r, t);
        g = p5.lerp(day.g, sunset.g, t);
        b = p5.lerp(day.b, sunset.b, t);
        i = p5.lerp(day.i, sunset.i, t);
    }

    return p5.color(r * 255 * i, g * 255 * i, b * 255 * i);
}

function calculateBgColour(p5: p5, angle: number) {
    // Normalize angle to [0, 2π)
    angle = angle % (2 * Math.PI);
    if (angle < 0) angle += 2 * Math.PI;

    // Define key colours for sky
    const sunset = { r: 0.9, g: 0.4, b: 0.2 }; // deep orange/red
    const night = { r: 0.05, g: 0.05, b: 0.2 }; // deep navy
    const sunrise = { r: 0.6, g: 0.6, b: 0.3 }; // orange-yellow
    const day = { r: 0.4, g: 0.7, b: 1.0 }; // bright blue

    let r, g, b;

    if (angle < Math.PI / 2) {
        // Sunset → Night
        const t = p5.map(angle, 0, Math.PI / 2, 0, 1);
        r = p5.lerp(sunset.r, night.r, t);
        g = p5.lerp(sunset.g, night.g, t);
        b = p5.lerp(sunset.b, night.b, t);
    } else if (angle < Math.PI) {
        // Night → Sunrise
        const t = p5.map(angle, Math.PI / 2, Math.PI, 0, 1);
        r = p5.lerp(night.r, sunrise.r, t);
        g = p5.lerp(night.g, sunrise.g, t);
        b = p5.lerp(night.b, sunrise.b, t);
    } else if (angle < (3 * Math.PI) / 2) {
        // Sunrise → Day
        const t = p5.map(angle, Math.PI, (3 * Math.PI) / 2, 0, 1);
        r = p5.lerp(sunrise.r, day.r, t);
        g = p5.lerp(sunrise.g, day.g, t);
        b = p5.lerp(sunrise.b, day.b, t);
    } else {
        // Day → Sunset
        const t = p5.map(angle, (3 * Math.PI) / 2, 2 * Math.PI, 0, 1);
        r = p5.lerp(day.r, sunset.r, t);
        g = p5.lerp(day.g, sunset.g, t);
        b = p5.lerp(day.b, sunset.b, t);
    }

    return p5.color(r * 255, g * 255, b * 255);
}

function calculatePosition(p5: p5, angle: number, radius: number) {
    return [radius * p5.cos(angle), radius * p5.sin(angle)];
}

function getMoonAlpha(p5: p5, angle: number) {
    // Normalize angle to [0, 2π)
    angle = angle % (2 * Math.PI);
    if (angle < 0) angle += 2 * Math.PI;

    // Sun is visible between sunrise (0) and sunset (π)
    // Fade in/out around sunrise/sunset
    const fadeDuration = Math.PI / 4; // 45 degrees of fade time

    if (angle >= 0 && angle <= Math.PI) {
        // Day time - sun is visible
        if (angle < fadeDuration) {
            // Fade in at sunrise
            return p5.map(angle, 0, fadeDuration, 0, 255);
        } else if (angle > Math.PI - fadeDuration) {
            // Fade out at sunset
            return p5.map(angle, Math.PI - fadeDuration, Math.PI, 255, 0);
        } else {
            return 255;
        }
    } else {
        return 0;
    }
}

function getSunAlpha(p5: p5, angle: number) {
    return 255 - getMoonAlpha(p5, angle);
}

export { SunMoon };
