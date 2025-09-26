<script lang="ts">
    import { onMount } from "svelte";
    import io from "socket.io-client";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Slider } from "$lib/components/ui/slider/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { Card, CardHeader, CardContent } from "$lib/components/ui/card/index.js";
    import { Dialog, DialogContent, DialogHeader, DialogTitle } from "$lib/components/ui/dialog/index.js";

    let showPasswordPrompt = $state(false);
    let showAdminPanel = $state(false);
    let passwordWrong = $state(false);
    let shiftCount = 0;
    let lastKeyTime = 0;
    let password = $state("");
    let socket: any;

    let weather = $state("auto");
    let timeOfDay = $state("auto");
    let studentsCount = $state(0);

    const simSpeeds = [0, 0.5, 1, 2, 5, 10, 50, 100];
    let simSpeedEnum = $state(2);
    let simSpeed = $derived(simSpeeds[simSpeedEnum]);
    let simSpeedText = $derived(simSpeed === 0 ? "Paused" : `${simSpeed}×`);

    onMount(() => {
        socket = io("ws://localhost:3000"); // change to your backend
        window.addEventListener("keydown", handleKeyDown);

        socket.on("students", (count: number) => {
            studentsCount = count;
        });
    });

    function handleKeyDown(e: KeyboardEvent) {
        const now = Date.now();
        if (e.key === "Shift") {
            if (now - lastKeyTime > 1000) {
                shiftCount = 0; // reset if too slow
            }
            shiftCount++;
            lastKeyTime = now;
            if (shiftCount === 6) {
                showPasswordPrompt = true;
                shiftCount = 0;
            }
        } else {
            shiftCount = 0;
        }
    }

    function submitPassword() {
        console.log("sumitts");
        socket.emit("auth", password, (response: string) => {
            console.log("auth response", response);
            if (response == "success") {
                showPasswordPrompt = false;
                showAdminPanel = true;
            } else {
                passwordWrong = true;
            }
        });
    }

    function setWeather(type: string) {
        weather = type;
        socket.emit("weather", type);
    }

    function spawnNaturalDisaster(type: string) {
        socket.emit("naturalDisaster", type);
    }

    function setTimeOfDay(time: string) {
        timeOfDay = time;
        socket.emit("timeOfDay", time);
    }

    function setSimSpeed(speed: number) {
        socket.emit("simSpeed", speed);
    }

    $effect(() => {
        setSimSpeed(simSpeed);
    });
</script>

{#if !showAdminPanel}
    <p class="text-center">nuh uh</p>
{/if}

<!-- Password Prompt -->
<Dialog open={showPasswordPrompt}>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Enter Admin Password</DialogTitle>
        </DialogHeader>
        <div class="flex flex-col gap-4">
            <Input type="password" bind:value={password} placeholder="Password" onkeydown={(e) => e.key === "Enter" && submitPassword()} />
            {#if passwordWrong}
                <p class="text-sm text-destructive">Wrong password, try again.</p>
            {/if}
            <Button onclick={submitPassword}>Submit</Button>
        </div>
    </DialogContent>
</Dialog>

<!-- Admin Panel -->
{#if showAdminPanel}
    <Card class="mx-auto mt-10 max-w-lg">
        <CardHeader>
            <h2 class="text-xl font-bold">Admin Panel</h2>
            <Badge variant="secondary" class="mt-2 flex items-center"
                ><div class="size-2 rounded-full bg-green-500"></div>
                {studentsCount} student{studentsCount !== 1 ? "s" : ""} online</Badge
            >
        </CardHeader>
        <CardContent class="flex flex-col">
            <h3 class="text-xl font-semibold tracking-tight">Weather</h3>
            <div class="mt-2 flex flex-wrap gap-2">
                <Button variant={weather === "auto" ? "default" : "secondary"} onclick={() => setWeather("auto")}>Auto</Button>
                <Button variant={weather === "storm" ? "default" : "secondary"} onclick={() => setWeather("storm")}>Storm</Button>
                <Button variant={weather === "rain" ? "default" : "secondary"} onclick={() => setWeather("rain")}>Rain</Button>
                <Button variant={weather === "clear" ? "default" : "secondary"} onclick={() => setWeather("clear")}>Clear</Button>
                <Button variant={weather === "cloudy" ? "default" : "secondary"} onclick={() => setWeather("cloudy")}>Cloudy</Button>
            </div>
            <h3 class="mt-8 text-xl font-semibold tracking-tight">Natural disasters</h3>
            <div class="mt-2 flex flex-wrap gap-2">
                <Button variant="secondary" onclick={() => spawnNaturalDisaster("thunder")}>Random ahh thunder</Button>
                <Button variant="secondary" onclick={() => spawnNaturalDisaster("tsunami")}>Tsunami</Button>
                <Button variant="secondary" onclick={() => spawnNaturalDisaster("drought")}>Drought</Button>
                <Button variant="secondary" onclick={() => spawnNaturalDisaster("heatwave")}>Heatwave</Button>
            </div>
            <h3 class="mt-8 text-xl font-semibold tracking-tight">Time of day</h3>
            <div class="mt-2 flex flex-wrap gap-2">
                <Button variant={timeOfDay === "auto" ? "default" : "secondary"} onclick={() => setTimeOfDay("auto")}>Auto</Button>
                <Button variant={timeOfDay === "sunrise" ? "default" : "secondary"} onclick={() => setTimeOfDay("sunrise")}>Sunrise</Button>
                <Button variant={timeOfDay === "noon" ? "default" : "secondary"} onclick={() => setTimeOfDay("noon")}>Noon</Button>
                <Button variant={timeOfDay === "sunset" ? "default" : "secondary"} onclick={() => setTimeOfDay("sunset")}>Sunset</Button>
                <Button variant={timeOfDay === "midnight" ? "default" : "secondary"} onclick={() => setTimeOfDay("midnight")}>Midnight</Button>
            </div>
            <div class="mt-8 flex items-center gap-2">
                <h3 class="text-xl font-semibold tracking-tight">Simulation speed</h3>
                <Badge variant="secondary">{simSpeedText}</Badge>
            </div>
            <Slider class="my-4" type="single" min={0} max={5} step={1} bind:value={simSpeedEnum} />
        </CardContent>
    </Card>
{/if}
