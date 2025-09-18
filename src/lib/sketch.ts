import type { p5 } from "p5-svelte";
import { plant } from "$lib/plant";
import { SunMoon } from "$lib/daynight";
import { cloud } from "$lib/weather.svelte";
import { simState } from "$lib/globals.svelte";
import type { Color, Font, Image } from "p5";

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
];
let soil: Image;
let soily: number;
let clouds: cloud[] = [];
let cloudsNum: number = 20;
let sun: SunMoon;
let timeOfDay: number;
let weather: string;
let lastCheckTime: number;

function preload(p5: p5) {
    // font = p5.loadFont("/assets/GoogleSansCode-VariableFont_wght.ttf");
    soil = p5.loadImage("/assets/soil.png");
    simState.bgcolor = p5.color(0);
}

function setup(p5: p5) {
    p5.createCanvas(p5.windowWidth, p5.windowHeight, p5.WEBGL);
    simState.boxl = p5.width / 8;
    simState.soilm = 1;
    simState.light = 1;
    simState.temp = 1;
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

function draw(p5: p5) {
    p5.background(simState.bgcolor ? simState.bgcolor : p5.color(0));
    timeOfDay = (sun.angle * 180) / p5.PI;
    //print(timeOfDay)
    //print([mycamera.eyeX, mycamera.eyeY, mycamera.eyeZ])

    // Set up the orthographic projection
    //ortho();
    simState.boxl = p5.width / 8;

    // Position the camera
    //camera(200 * cos(frameCount / 400) , -100, 250 * sin(frameCount / 400), 0, 0, 0, 0, 1, 0);
    //camera(0, 0, -100, 0, 0, 0, 0, 1, 0)
    p5.orbitControl();

    for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
            p5.push();
            p5.translate(i * simState.boxl, 0, j * simState.boxl);
            p5.translate(0, soily, 0);
            p5.fill("#633200");
            p5.noStroke();
            p5.texture(soil);
            p5.box(simState.boxl, simState.boxl / 3, simState.boxl);
            p5.pop();
        }
    }
    // sun updates before all else or lighting doenst work
    sun.display(p5, simState.simSpeed); // 5 is the speed
    for (let i in simState.garden) {
        simState.garden[i].display(p5);
    }
    for (let i in clouds) {
        clouds[i].display(p5);
        clouds[i].move(p5);
        clouds[i].update(p5, weather);
    }
    // Draw some boxes to demonstrate the lack of perspective
    maybeChangeWeather(p5);
}

function keyPressed(p5: p5) {
    weather = "storm";
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
            weather = next;
        }
    }

    lastCheckTime = timeOfDay;
}

export { preload, setup, draw };
