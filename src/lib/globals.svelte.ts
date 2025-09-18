import { plant } from "$lib/plant";
import { Color } from "p5";

let simState: {
    boxl: number;
    garden: plant[];
    soilm: number;
    light: number;
    temp: number;
    bgcolor: Color | undefined;
    simSpeed: number;
    windSpeed: number;
} = $state({
    boxl: 0,
    garden: [],
    soilm: 0,
    light: 0,
    temp: 0,
    weather: "clear", // toggle btw sunny and rainy, storm
    bgcolor: undefined,
    simSpeed: 10,
    windSpeed: 1,
});

export { simState };
