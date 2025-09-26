import type { p5 } from "p5-svelte";
import { plant } from "$lib/plant";
import { SunMoon } from "$lib/daynight";
import { cloud } from "$lib/weather.svelte";
import { simState } from "$lib/globals.svelte";
import type { Image } from "p5";
import { effectors } from "$lib/effectors";

const WEATHERS = [
    "sunny",
    "sunny",
    "sunny",
    "sunny",
    "sunny",
    "rainy",
    "rainy",
    "rainy",
    "rainy",
    "storm",
    "storm",
    "clear",
    "clear",
    "clear",
    "clear",
    "clear",
    "sunny",
    "sunny",
    "sunny",
    "sunny",
    "sunny",
    "rainy",
    "rainy",
    "rainy",
    "rainy",
    "storm",
    "storm",
    "clear",
    "clear",
    "clear",
    "clear",
    "clear",
    "sunny",
    "sunny",
    "sunny",
    "sunny",
    "sunny",
    "rainy",
    "rainy",
    "rainy",
    "rainy",
    "storm",
    "storm",
    "clear",
    "clear",
    "clear",
    "clear",
    "clear",
    "sunny",
    "sunny",
    "sunny",
    "sunny",
    "sunny",
    "rainy",
    "rainy",
    "rainy",
    "rainy",
    "storm",
    "storm",
    "clear",
    "clear",
    "clear",
    "clear",
    "clear",
    "flood",
];
let soil: Image;
let soily: number;
let clouds: cloud[] = [];
let cloudsNum: number = 20;
let sun: SunMoon;
let timeOfDay: number;
let lastCheckTime: number;
let growing: boolean = false;
let effectorsObj: any;

// --- Flood state tracking ---
let floodLevel = 0; // current water height above ground
const FLOOD_RISE_SPEED = 2; // pixels per frame per simSpeed
const FLOOD_FALL_SPEED = 1; // pixels per frame per simSpeed (slower than rise)
const FLOOD_MAX_LEVEL = 40; // max water height above ground
const FLOOD_SAFE_DECREASE = 0.002; // decrease per frame per simSpeed
let floodActive = false; // tracks if flood is ongoing

function preload(p5: p5) {
    soil = p5.loadImage("/assets/soil.png");
    simState.bgcolor = p5.color(0);
}

function setup(p5: p5) {
    p5.createCanvas(p5.windowWidth, p5.windowHeight, p5.WEBGL);
    p5.frameRate(60);
    effectorsObj = new effectors(p5);
    simState.boxl = p5.width / 8;
    simState.soilm = 0;
    simState.light = 0;
    simState.temp = 0.35;
    simState.humidity = 0.65;
    let t = 0;
    for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
            simState.garden.push(new plant(p5, i * simState.boxl, j * simState.boxl, t));
            t++;
        }
    }
    soily = p5.windowHeight / 5;
    for (let i = 0; i < cloudsNum; i++) {
        clouds.push(new cloud(p5, p5.random(-p5.width / 2, p5.width / 2), -p5.height / 4, 0, "sunny"));
    }
    // @ts-ignore - using p5.js global camera in instance mode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mycamera: any = p5.createCamera();
    p5.camera(814.7359049855213, -317.31411620078325, 809.9284541911895, 0, 0, 0, 0, 1, 0);
    // make the sun
    sun = new SunMoon(100, 0, simState.boxl * 7);
}

function draw(p5: p5, goofy: () => void) {
    
    p5.background(simState.bgcolor ? simState.bgcolor : p5.color(0));

    timeOfDay = (sun.angle * 180) / p5.PI;
    simState.boxl = p5.width / 8;
    p5.orbitControl();

    // --- Flood logic ---
    if (simState.weather === "flood") {
        floodActive = true;
        floodLevel = Math.min(floodLevel + FLOOD_RISE_SPEED * simState.simSpeed, FLOOD_MAX_LEVEL);
        // Lower plant safety for all plants during flood
        for (const plantObj of simState.garden) {
            plantObj.safe = Math.max(plantObj.safe - FLOOD_SAFE_DECREASE * simState.simSpeed, 0);
        }
    } else if (floodActive) {
        // Flood recedes gradually only after weather changes
        floodLevel = Math.max(floodLevel - FLOOD_FALL_SPEED * simState.simSpeed, 0);
        if (floodLevel === 0) floodActive = false;
    }

    // --- Draw ground tiles ---
    for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
            p5.push();
            p5.translate(i * simState.boxl, 0, j * simState.boxl);
            p5.translate(0, soily, 0);
            p5.fill("#633200");
            p5.noStroke();
            p5.texture(soil);
            p5.box(simState.boxl, simState.boxl / 3, simState.boxl);

            // --- Draw flood water above ground if flooding ---
            if (floodLevel > 0) {
                p5.push();
                p5.translate(0, -floodLevel, 0);
                p5.fill(80, 180, 255, 180); // semi-transparent blue
                p5.noStroke();
                p5.box(simState.boxl, floodLevel, simState.boxl);
                p5.pop();
            }
            p5.pop();
        }
    }

    sun.display(p5);
    effectorsObj.update(p5);
    effectorsObj.display(p5);
    for (const plantObj of simState.garden) {
        plantObj.display(p5);
    }
    for (const cloudObj of clouds) {
        cloudObj.display(p5);
        cloudObj.move(p5);
        cloudObj.update(p5, simState.weather);
    }
    let avggrowth = 0;
    for (const plantObj of simState.garden) {
        avggrowth += plantObj.growthRate;
    }
    avggrowth /= simState.garden.length;

    avggrowth = p5.map(avggrowth, -0.0005, 0.00028, -1, 1);

    if (avggrowth > 0.5) {
        simState.growing = "growing fast";
    } else if (avggrowth > 0.1) {
        simState.growing = "growing slowly";
    } else if (avggrowth > -0.1) {
        simState.growing = "not growing";
    } else if (avggrowth < -0.1) {
        simState.growing = "wilting";
    }

    homeostasis(p5);

    if (!simState.inClassroom) {
        maybeChangeWeather(p5);
    }
}

function keyPressed(p5: p5) {
    simState.weather = "flood";
}

function maybeChangeWeather(p5: p5) {
    const step = 30; // only allow potential weather change every 30°
    const crossed = Math.floor(lastCheckTime / step) !== Math.floor(timeOfDay / step);

    if (crossed) {
        // Decide randomly if weather changes (e.g., 30% chance)
        if (Math.random() < 0.3) {
            // Pick a new weather different from current
            let choices = WEATHERS;
            let next = choices[Math.floor(Math.random() * choices.length)];
            // p5.print("Weather updateing..");
            simState.weather = next;
        }
    }

    lastCheckTime = timeOfDay;
}

function windowResized(p5: p5) {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
    simState.boxl = p5.width / 8;

    let cornId = 0;
    for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
            simState.garden[cornId].posx = i * simState.boxl;
            simState.garden[cornId].posz = j * simState.boxl;
            cornId++;
        }
    }
    sun.orbRadius = simState.boxl * 7;
}

function homeostasis(p5: p5) {
    
    if (timeOfDay >= 180 && timeOfDay < 270) {
        simState.light = p5.map(timeOfDay, 180, 270, 0, 1);
        simState.temp += p5.map(timeOfDay, 180, 270, 0, 0.0015 * simState.simSpeed);
        simState.humidity -= p5.map(timeOfDay, 180, 270, 0, 0.001 * simState.simSpeed);
    } else if (timeOfDay >= 270 && timeOfDay < 360) {
        simState.light = p5.map(timeOfDay, 270, 360, 1, 0);
        simState.temp += p5.map(timeOfDay, 270, 360, 0.0015 * simState.simSpeed, 0);
        simState.humidity -= p5.map(timeOfDay, 270, 360, 0.001 * simState.simSpeed, 0);
    } else if (timeOfDay >= 0 && timeOfDay < 90) {
        simState.light = 0;
        simState.temp -= p5.map(timeOfDay, 0, 90, 0, 0.0015 * simState.simSpeed);
        simState.humidity += p5.map(timeOfDay, 0, 90, 0, 0.001 * simState.simSpeed);
    } else if (timeOfDay >= 90 && timeOfDay < 180) {
        simState.light = 0;
        simState.temp -= p5.map(timeOfDay, 90, 180, 0.0015 * simState.simSpeed, 0);
        simState.humidity += p5.map(timeOfDay, 90, 180, 0.001 * simState.simSpeed, 0);
    }
    // simState.light = 1;
    // simState.effectors[0] = 1;

    if (simState.weather === "rainy" || simState.weather === "storm") {
        simState.soilm += 0.001 * simState.simSpeed;
        simState.humidity += 0.003 * simState.simSpeed;
    }

    if (simState.weather === "flood") {
        simState.soilm += 0.004 * simState.simSpeed;
        simState.humidity += 0.004 * simState.simSpeed;
        simState.temp -= 0.0005 * simState.simSpeed; // slight cooling effect
    }
if(simState.score > 0){
    // light effector
    simState.light += simState.effectors[0] / 100;
    simState.score -= (simState.effectors[0] / 100) * simState.simSpeed / p5.frameRate() * 3; // using light costs 3 per second, scaled to simSpeed

    // dehumidifier effector
    simState.humidity -= (simState.effectors[1] / 200) * simState.simSpeed; // dehumidifier effector
    simState.score -= simState.effectors[1] * simState.simSpeed / p5.frameRate() * 3; // using dehumidifier costs 2.5 per second, scaled to simSpeed

    // water pump effector
    simState.soilm += (simState.effectors[2] / 200) * simState.simSpeed;
    simState.humidity += (simState.effectors[2] / 200) * simState.simSpeed;
    simState.score -= simState.effectors[2] * simState.simSpeed / p5.frameRate() * 5; // using water pump costs 5 per second, scaled to simSpeed

    // temp effector
    simState.temp += (simState.effectors[3] / 600) * simState.simSpeed;
    simState.score -= simState.effectors[3] * simState.simSpeed / p5.frameRate() * 5; // using temp effector costs 5 per second, scaled to simSpeed
}else{
    simState.effectors = [0,0,0,0];
    simState.score = 0;
    console.log("ur broke");
}
    setPoint();
    simState.light = p5.constrain(simState.light, 0, 1);
    simState.humidity = p5.constrain(simState.humidity, 0, 1);
    simState.soilm = p5.constrain(simState.soilm, 0, 1);
    simState.temp = p5.constrain(simState.temp, 0, 1);
}

function setPoint() {
    simState.temp += ((0.3 - simState.temp) / 300) * simState.simSpeed;
    simState.humidity += ((0.5 - simState.humidity) / 300) * simState.simSpeed;
    simState.soilm += ((simState.humidity - simState.soilm) / 400) * simState.simSpeed;
}

export { preload, setup, draw, windowResized };
