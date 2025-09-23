<script lang="ts">
    // Bluetooth
    import {
        ConnectionStatusEvent,
        createWebBluetoothConnection,
        type MicrobitWebBluetoothConnection,
        UARTDataEvent,
    } from "@microbit/microbit-connection";

    // p5.js
    import P5, { type Sketch, type p5 } from "p5-svelte";
    import { preload, setup, draw, windowResized } from "$lib/sketch";
    import { simState } from "$lib/globals.svelte";

    // shadcn-svelte components
    import { Button } from "$lib/components/ui/button/index.js";
    import { Slider } from "$lib/components/ui/slider/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import * as Select from "$lib/components/ui/select/index.js";
    import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";

    // Custom components
    import SensorCard from "$lib/components/sensorCard.svelte";

    // Icons
    import { Bluetooth, Sun, Wind, Droplet, Thermometer } from "lucide-svelte";
    import ModeToggle from "$lib/components/modeToggle.svelte";

    // WebSocket
    import { io } from "socket.io-client";

    // micro:bit BLE connection
    let connection: MicrobitWebBluetoothConnection | null = $state(null);
    let connectionStatus = $state("DISCONNECTED");
    let ping: NodeJS.Timeout | null = null; // for sending data to microbit & clear interval

    // ws connection
    const socket = io("http://localhost:3000");
    socket.on("connect", () => {
        console.log("Connected to server");
        simState.inClassroom = true;
    });
    socket.on("weather", (weather) => {
        console.log("Received weather update:", weather);
        simState.weather = weather;
    });
    socket.on("time", (frameCount) => {
        simState.frameCount = frameCount;
    });
    socket.on("simSpeed", (speed) => {
        simState.simSpeed = speed;
    });

    // State for simulation speed (using way too many states)
    const simSpeeds = [0, 0.5, 1, 2, 5, 10, 50, 100];
    let simSpeedEnum = $state(2);
    let simSpeed = $derived(simSpeeds[simSpeedEnum]);
    let simSpeedText = $derived(simSpeed === 0 ? "Paused" : `${simSpeed}×`);

    let possibleEpilepsy = $state(true);
    let alertOpen = $state(false);

    $effect(() => {
        simState.simSpeed = simSpeed;
        if (simSpeed >= 50 && !alertOpen && possibleEpilepsy) {
            alertOpen = true;
            simSpeedEnum = 2;
        }
    });

    function alertConfirmed() {
        possibleEpilepsy = false;
        alertOpen = false;
        simSpeedEnum = 6;
    }

    // Dropdown for simulated environment
    const simulatedEnvironments = [
        { value: "farm", label: "Corn farm" },
        { value: "bus", label: "Fleet of public buses (TODO)" },
        { value: "school", label: "School (TODO)" },
    ];
    let selectedEnvironment = $state("");
    const triggerContent = $derived(simulatedEnvironments.find((f) => f.value === selectedEnvironment)?.label ?? "Select a simulated environment");

    // Functions for BLE
    async function connect() {
        // Connect to micro:bit via BLE
        connection = createWebBluetoothConnection();
        connection.addEventListener("status", (event: ConnectionStatusEvent) => {
            connectionStatus = event.status;
            if (event.status === "DISCONNECTED") {
                if (!ping) return;
                clearInterval(ping);
                ping = null;
            } else if (event.status === "CONNECTED") {
                ping = setInterval(() => {
                    goofy();
                }, 500);
            }
        });
        connectionStatus = await connection.connect();
        connection.addEventListener(
            "uartdata",
            (event: UARTDataEvent) => {
                const received = new TextDecoder().decode(event.value).split(";");
                const index = parseInt(received[0]);
                const value = received[1];
                let realValue: number;
                if (value === "true") {
                    realValue = 1;
                } else if (value === "false") {
                    realValue = 0;
                } else {
                    realValue = parseInt(value);
                }
                console.log(`Received effector data ${index} ${value}`);
                try {
                    simState.effectors[index] = realValue;
                } catch (e) {
                    console.error(`Error processing received data: ${e}`);
                }
            },
            false,
        );
    }

    function write(data: string) {
        // Write data to micro:bit via Bluetooth UART
        if (!connection) {
            console.error("no device connected");
            return;
        }
        const encoded = new TextEncoder().encode(data + "\n");
        connection
            .uartWrite(encoded)
            .then(() => {})
            .catch((e) => console.error(`Write error: ${e.error}`));
    }

    function sendSensorReadings(values: number[]) {
        // Send some numbers to micro:bit
        write(values.map((v) => Math.round(v)).join(";"));
    }

    function goofy() {
        // Send simulated sensor readings to micro:bit
        sendSensorReadings([simState.light * 100, simState.humidity * 100, simState.soilm * 100, simState.temp * 100]);
    }

    // Convert UPPERCASE_WITH_UNDERSCORES to Sentence case
    const toSentenceCase = (str: string): string =>
        str
            .toLowerCase()
            .replace(/_/g, " ")
            .replace(/^(\w)(.*)/, (_, first, rest) => first.toUpperCase() + rest);

    const sketch: Sketch = (p5: p5) => {
        p5.preload = () => preload(p5);
        p5.setup = () => setup(p5);
        p5.draw = () => draw(p5, goofy);
        p5.windowResized = () => windowResized(p5);
    };

    const onwheel = (event: WheelEvent) => event.stopPropagation();
</script>

<div class="absolute top-4 left-4 max-h-[calc(100vh-2rem)] w-sm overflow-y-auto rounded-lg bg-background p-4 shadow-lg" {onwheel}>
    <div class="flex gap-2">
        <!-- Dropdown for simulated environment -->
        <Select.Root type="single" name="favoriteFruit" bind:value={selectedEnvironment}>
            <Select.Trigger class="w-full">
                {triggerContent}
            </Select.Trigger>
            <Select.Content>
                <Select.Group>
                    <Select.Label>Simulated environments</Select.Label>
                    {#each simulatedEnvironments as fruit (fruit.value)}
                        <Select.Item value={fruit.value} label={fruit.label} disabled={fruit.value === "bus" || fruit.value === "school"}>
                            {fruit.label}
                        </Select.Item>
                    {/each}
                </Select.Group>
            </Select.Content>
        </Select.Root>
        <ModeToggle></ModeToggle>
    </div>

    <!-- Bluetooth connection controls -->
    <div
        class="mt-4 flex max-w-full items-center justify-between rounded-full px-2 py-2"
        class:bg-red-200={connectionStatus !== "CONNECTED"}
        class:dark:bg-red-700={connectionStatus !== "CONNECTED"}
        class:bg-green-200={connectionStatus === "CONNECTED"}
        class:dark:bg-green-700={connectionStatus === "CONNECTED"}
        class:bg-yellow-200={connectionStatus === "CONNECTING"}
        class:dark:bg-yellow-700={connectionStatus === "CONNECTING"}
    >
        <div class="flex items-center justify-start">
            <Bluetooth class="m-2 size-5 rounded-full text-secondary-foreground" />
            <p class="max-w-36 truncate text-sm leading-none font-medium">
                {toSentenceCase(connectionStatus == "SUPPORT_NOT_KNOWN" ? (connectionStatus = "CONNECTED") : connectionStatus)}
            </p>
        </div>
        <Button class="rounded-full" onclick={connect}>Connect</Button>
    </div>

    <!-- Sensor readings display -->
    <h3 class="mt-8 scroll-m-20 text-xl font-semibold tracking-tight">Sensor readings</h3>
    <div class="mt-4 flex flex-col gap-2">
        <SensorCard
            Icon={Sun}
            name="Light intensity"
            value={simState.light}
            min={0}
            max={1}
            effectorName="Lamp"
            effectorState={simState.effectors[0] ? "ON" : "OFF"}
            isDelta={false}
        />
        <SensorCard
            Icon={Wind}
            name="Humidity"
            value={simState.humidity}
            min={0}
            max={1}
            effectorState={simState.effectors[1] ? "ON" : "OFF"}
            effectorName="Dehumidifier"
            isDelta={true}
        />
        <SensorCard
            Icon={Droplet}
            name="Soil moisture"
            value={simState.soilm}
            min={0}
            max={1}
            effectorName="Water pump"
            effectorState={simState.effectors[2] ? "ON" : "OFF"}
            isDelta={true}
        />
        <SensorCard
            Icon={Thermometer}
            name="Temperature"
            value={(simState.temp * 65) / 100}
            min={0}
            max={1}
            effectorState={simState.effectors[3] ? "ON" : "OFF"}
            effectorName="Heater"
            isDelta={true}
        />
    </div>

    <!-- <p>{simState.effectors.join(", ")}</p> -->

    <!-- Simulation speed control -->
    {#if !simState.inClassroom}
        <div class="mt-8 flex items-center gap-2">
            <h3 class="text-xl font-semibold tracking-tight">Simulation speed</h3>
            <Badge variant="secondary">{simSpeedText}</Badge>
        </div>
        <Slider class="my-4" type="single" min={0} max={7} step={1} bind:value={simSpeedEnum} />
    {/if}

    <AlertDialog.Root
        bind:open={alertOpen}
        onOpenChange={(value: boolean) => {
            if (value === false) {
                simSpeedEnum = 2;
            }
        }}
    >
        <AlertDialog.Content>
            <AlertDialog.Header>
                <AlertDialog.Title>Important health warning: Photosensitive epilepsy</AlertDialog.Title>
                <AlertDialog.Description class="space-y-4">
                    <p>
                        A very small percentage of people may experience a seizure when exposed to certain visual images, including flashing lights or
                        patterns that may appear in video games. Even people who have no history of seizures or epilepsy may have an undiagnosed
                        condition that can cause these “photosensitive epileptic seizures” while playing video games.
                    </p>
                    <p><b>Immediately stop playing and consult a doctor if you experience any symptoms.</b></p>
                    <p>
                        These seizures may have a variety of symptoms, including lightheadedness, altered vision, eye or face twitching, jerking or
                        shaking of arms or legs, disorientation, confusion, or momentary loss of awareness. Seizures may also cause loss of
                        consciousness or convulsions that can lead to injury from falling down or striking nearby objects.
                    </p>
                    <p>
                        Parents should watch for or ask their children about the above symptoms. Children and teenagers are more likely than adults to
                        experience these seizures.
                    </p>
                    <p>You may reduce risk of photosensitive epileptic seizures by taking the following precautions:</p>
                    <ul class="list-disc space-y-1 pl-6">
                        <li>Play in a well-lit room.</li>
                        <li>Do not play if you are drowsy or fatigued.</li>
                    </ul>
                    <p>If you or any of your relatives have a history of seizures or epilepsy, consult a doctor before playing video games.</p>
                    <p class = "text-destructive font-bold">By choosing to continue, you acknowledge that you have read and understood this warning, and we are not liable for any damages caused thereafter.</p>
                </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
                <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                <AlertDialog.Action onclick={alertConfirmed}>Continue</AlertDialog.Action>
            </AlertDialog.Footer>
        </AlertDialog.Content>
    </AlertDialog.Root>
</div>

<P5 {sketch} />
