import { plant } from "$lib/plant";
import { Color } from "p5";

const simState: {
    boxl: number;
    garden: plant[];
    soilm: number;
    light: number;
    temp: number;
    humidity: number;
    effectors: [number, number, number, number]; // light, hum, moisture, temp
    weather: string;
    bgcolor: Color | undefined;
    simSpeed: number;
    windSpeed: number;
    inClassroom: boolean;
} = $state({
    boxl: 0,
    garden: [],
    soilm: 0,
    light: 0,
    temp: 0,
    humidity: 0,
    effectors: [0, 0, 0, 0], // light, hum, moisture, temp
    weather: "clear", // toggle btw sunny and rainy, storm
    bgcolor: undefined,
    simSpeed: 1,
    windSpeed: 1,
    inClassroom: false,
});

export { simState };
