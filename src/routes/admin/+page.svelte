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

    let leaderboard: { id: string; score: number }[] = $state([]);

    const simSpeeds = [0, 0.5, 1, 2, 5, 10, 50, 100];
    let simSpeedEnum = $state(2);
    let simSpeed = $derived(simSpeeds[simSpeedEnum]);
    let simSpeedText = $derived(simSpeed === 0 ? "Paused" : `${simSpeed}×`);

    const weathers = ["auto", "storm", "rain", "clear", "cloudy", "flood", "drought", "heatwave"];

    onMount(() => {
        socket = io("ws://localhost:3000"); // change to your backend
        window.addEventListener("keydown", handleKeyDown);

        socket.on("leaderboard", (studentsList: { id: string; score: number }[]) => {
            leaderboard = studentsList;
            console.log(leaderboard);
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
    function clearInput() {
        value = "";
        amount = 1;
    }
    function sendMoney(id: string, money: number) {
        clearInput();
        console.log("send money", { id, money });
        socket.emit("sendMoney", { id, money });
    }

    function setWeather(type: string) {
        weather = type;
        socket.emit("weather", type);
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
    import CheckIcon from "@lucide/svelte/icons/check";
    import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
    import { tick } from "svelte";
    import * as Command from "$lib/components/ui/command/index.js";
    import * as Popover from "$lib/components/ui/popover/index.js";
    import { cn } from "$lib/utils.js";

    const studList: { value: string; label: string }[] = [];
    $effect(() => {
        studList.length = 0;
        for (let i of leaderboard) {
            studList.push({ value: i.id, label: `${i.id} (${i.score.toFixed(2)})` });
        }
    });
    let open = $state(false);
    let value = $state("");
    let amount: number = $state(1);
    let triggerRef = $state<HTMLButtonElement>(null!);

    const selectedValue = $state(studList.find((f) => f.value === value)?.label);

    // We want to refocus the trigger button when the user selects
    // an item from the list so users can continue navigating the
    // rest of the form with the keyboard.
    function closeAndFocusTrigger() {
        open = false;
        tick().then(() => {
            triggerRef.focus();
        });
    }
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
            <Badge variant="secondary" class="mt-2 flex items-center gap-2"
                ><div class="size-2 rounded-full bg-green-500"></div>
                {leaderboard.length} student{leaderboard.length !== 1 ? "s" : ""} online</Badge
            >
        </CardHeader>
        <CardContent class="flex flex-col">
            <h3 class="text-xl font-semibold tracking-tight">Weather</h3>
            <div class="mt-2 flex flex-wrap gap-2">
                {#each weathers as weatherType}
                    <Button variant={weather === weatherType ? "default" : "secondary"} onclick={() => setWeather(weatherType)}
                        >{weatherType.charAt(0).toUpperCase() + weatherType.slice(1)}</Button
                    >
                {/each}
            </div>

            <div class="mt-8 flex items-center gap-2">
                <h3 class="text-xl font-semibold tracking-tight">Simulation speed</h3>
                <Badge variant="secondary">{simSpeedText}</Badge>
            </div>
            <Slider class="my-4" type="single" min={0} max={5} step={1} bind:value={simSpeedEnum} />
            <div class="mt-8 flex items-center gap-2">
                <h3 class="text-xl font-semibold tracking-tight">Miscellaneous</h3>
            </div>

            <Popover.Root bind:open>
                <Popover.Trigger bind:ref={triggerRef} class="mt-2">
                    {#snippet child({ props })}
                        <Button variant="outline" class="w-[200px] justify-between" {...props} role="combobox" aria-expanded={open}>
                            {value ? value : "Select user..."}
                            <ChevronsUpDownIcon class="ml-2 size-4 shrink-0 opacity-50" />
                        </Button>
                    {/snippet}
                </Popover.Trigger>
                <Popover.Content class="w-[200px] p-0">
                    <Command.Root>
                        <Command.Input placeholder="Search users..." />
                        <Command.List>
                            <Command.Empty>No users found.</Command.Empty>
                            <Command.Group>
                                {#each studList as framework}
                                    <Command.Item
                                        value={framework.value}
                                        onSelect={() => {
                                            value = framework.value;
                                            closeAndFocusTrigger();
                                        }}
                                    >
                                        <CheckIcon class={cn("mr-2 size-4", value !== framework.value && "text-transparent")} />
                                        {framework.label}
                                    </Command.Item>
                                {/each}
                            </Command.Group>
                        </Command.List>
                    </Command.Root>
                </Popover.Content>
            </Popover.Root>

            <div class="mt-4 flex gap-2">
                <Input type="number" placeholder="amount" class="max-w-xs" bind:value={amount} />
                <Button class="" onclick={() => sendMoney(value, amount)} disabled={!value || !amount}>Send Money</Button>
            </div>
        </CardContent>
    </Card>
{/if}
