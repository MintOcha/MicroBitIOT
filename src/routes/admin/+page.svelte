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
    let shiftCount = 0;
    let lastKeyTime = 0;
    let password = $state("");
    let socket: any;

    const simSpeeds = [0, 0.5, 1, 2, 5, 10, 50, 100];
    let simSpeedEnum = $state(2);
    let simSpeed = $derived(simSpeeds[simSpeedEnum]);
    let simSpeedText = $derived(simSpeed === 0 ? "Paused" : `${simSpeed}×`);

    onMount(() => {
        socket = io("ws://localhost:3000"); // change to your backend
        window.addEventListener("keydown", handleKeyDown);
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
        showPasswordPrompt = false;
        showAdminPanel = true;
        socket.emit("auth", password, (success: boolean) => {
            if (success) {
                showPasswordPrompt = false;
                showAdminPanel = true;
            } else {
                alert("Invalid password");
            }
        });
    }

    function setWeather(type: string) {
        socket.emit("weather", type);
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
            <Button onclick={submitPassword}>Submit</Button>
        </div>
    </DialogContent>
</Dialog>

<!-- Admin Panel -->
{#if showAdminPanel}
    <Card class="mx-auto mt-10 w-[400px] shadow-lg">
        <CardHeader>
            <h2 class="text-xl font-bold">Admin Panel</h2>
        </CardHeader>
        <CardContent class="flex flex-col">
            <div class="flex flex-wrap gap-2">
                <Button onclick={() => setWeather("storm")}>Storm</Button>
                <Button onclick={() => setWeather("rain")}>Rain</Button>
                <Button onclick={() => setWeather("clear")}>Clear</Button>
                <Button onclick={() => setWeather("cloudy")}>Cloudy</Button>
            </div>
            <div class="mt-8 flex items-center gap-2">
                <h3 class="text-xl font-semibold tracking-tight">Simulation speed</h3>
                <Badge variant="secondary">{simSpeedText}</Badge>
            </div>
            <Slider class="my-4" type="single" min={0} max={5} step={1} bind:value={simSpeedEnum} />
        </CardContent>
    </Card>
{/if}
