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
    import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";

    // Custom components
    import SensorCard from "$lib/components/sensorCard.svelte";

    // Icons
    import { Sprout, CircleDollarSign, Bluetooth, School, Check, Sun, Wind, Droplet, Thermometer } from "lucide-svelte";
    import ModeToggle from "$lib/components/modeToggle.svelte";

    // WebSocket
    import { io } from "socket.io-client";

    // micro:bit BLE connection
    let connection: MicrobitWebBluetoothConnection | null = $state(null);
    let connectionStatus = $state("DISCONNECTED");
    let ping: NodeJS.Timeout | null = null; // for sending data to microbit & clear interval

    // WebSocket connection to communist server
    const socket = io("http://localhost:3000");
    socket.on("connect", () => {
        console.log("Connected to server");
        console.log(socket.id);
        simState.inClassroom = true;
    });
    socket.on("disconnect", () => {
        console.log("Disconnected from server");
        simState.inClassroom = false;
    });
    socket.on("weather", (weather) => {
        console.log("Received weather update:", weather);
        simState.weather = weather;
    });
    socket.on("simSpeed", (speed) => {
        simState.simSpeed = speed;
    });
    socket.on("time", (time) => {
        simState.desync = time - Date.now();
        socket.emit("stats", simState.score);
    });
    socket.on("receiveMoney", (amount: number) => {
        console.log("receive money", amount);
        simState.score += amount;
    });

    // State for simulation speed (using way too many states)
    const simSpeeds = [0, 0.5, 1, 2, 5, 10, 50, 100];
    let simSpeedEnum = $state(2);
    let simSpeed = $derived(simSpeeds[simSpeedEnum]);
    let simSpeedText = $derived(simSpeed === 0 ? "Paused" : `${simSpeed}×`);

    // State for epilepsy warning alert
    let possibleEpilepsy = $state(true);
    let alertOpen = $state(false);

    $effect(() => {
        // Whenever slider changes, update simSpeed and show alert if it possibly causes epilepsy
        simState.simSpeed = simSpeed;
        changePingInterval() // ping microbit more often at high speed
        if (simSpeed >= 50 && !alertOpen && possibleEpilepsy) {
            alertOpen = true;
            simSpeedEnum = 2;
        }
    });

    function alertConfirmed() {
        // User confirmed they don't have epilepsy
        possibleEpilepsy = false;
        alertOpen = false;
        simSpeedEnum = 6;
    }
    
    function changePingInterval() {
        if (!connection) return;
        if (ping) {
            clearInterval(ping);
        }
        ping = setInterval(() => {
            writeSensorReadings();
        }, 500 / simState.simSpeed)
    }

    // Functions for BLE connection to micro:bit
    async function connect() {
        // Start the connection
        connection = createWebBluetoothConnection();
        connection.addEventListener("status", (event: ConnectionStatusEvent) => {
            connectionStatus = event.status;
            if (event.status === "DISCONNECTED") {
                if (!ping) return;
                clearInterval(ping);
                ping = null;
            } else if (event.status === "CONNECTED") {
                changePingInterval();
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

    function writeValues(values: number[]) {
        // Send some numbers to micro:bit
        write(values.map((v) => Math.round(v)).join(";"));
    }

    function writeSensorReadings() {
        // Send sensor readings to micro:bit
        writeValues([simState.light * 100, simState.humidity * 100, simState.soilm * 100, simState.temp * 100]);
    }

    // Bluetooth connection status indicator
    const bluetoothStatusClasses: Record<string, string> = {
        CONNECTED: "bg-green-200 dark:bg-green-700",
        CONNECTING: "bg-amber-200 dark:bg-amber-700",
    };
    let bluetoothStatusClass = $derived(bluetoothStatusClasses[connectionStatus] ?? "bg-red-200 dark:bg-red-700");

    let socketStatusClass = $derived(simState.inClassroom ? "bg-green-200 dark:bg-green-700" : "bg-red-200 dark:bg-red-700");

    // Utility function to convert UPPERCASE_WITH_UNDERSCORES to Sentence case
    const toSentenceCase = (str: string): string =>
        str
            .toLowerCase()
            .replace(/_/g, " ")
            .replace(/^(\w)(.*)/, (_, first, rest) => first.toUpperCase() + rest);

    const growingRateClasses: Record<string, string> = {
        "Growing quickly": "bg-green-200 dark:bg-green-700",
        "Growing slowly": "bg-green-200 dark:bg-green-700",
        "Not growing": "bg-amber-200 dark:bg-amber-700",
        Wilting: "bg-red-200 dark:bg-red-700",
    };
    let growingBadgeClass = $derived(growingRateClasses[simState.growing]);

    // Prevent scrolling the sketch when mouse is over the control panel
    const onwheel = (event: WheelEvent) => event.stopPropagation();

    // p5.js sketch
    const sketch: Sketch = (p5: p5) => {
        p5.preload = () => preload(p5);
        p5.setup = () => setup(p5);
        p5.draw = () => draw(p5, writeSensorReadings);
        p5.windowResized = () => windowResized(p5);
    };
</script>

<div class="absolute top-4 left-4 max-h-[calc(100vh-2rem)] w-sm overflow-y-auto rounded-lg bg-background p-4 shadow-lg" {onwheel}>
    <!-- Day counter -->
    <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold tracking-tight">Day {simState.daysElapsed}</h2>
        <ModeToggle></ModeToggle>
    </div>

    <div class="mt-2 flex w-full justify-stretch gap-2">
        <!-- Growth rate -->
        <div class={"mt-2 flex max-w-full flex-1 items-center justify-between rounded-full p-2 " + growingBadgeClass}>
            <div class="flex items-center justify-start">
                <Sprout class="m-2 size-5 text-secondary-foreground" />
                <p class="me-2 max-w-36 truncate text-sm font-medium">{String(simState.growing)}</p>
            </div>
        </div>

        <!-- Money display -->
        <div class="mt-2 flex max-w-full flex-1 items-center justify-between rounded-full bg-muted p-2">
            <div class="flex items-center justify-start">
                <CircleDollarSign class="m-2 size-5 text-secondary-foreground" />
                <p class="me-2 max-w-36 truncate font-mono text-sm font-medium">{simState.score.toFixed(2)}</p>
            </div>
        </div>
    </div>

    <h3 class="mt-8 text-xl font-semibold tracking-tight">Connections</h3>
    <div class="mt-4 flex w-full justify-stretch gap-2">
        <!-- Bluetooth connection controls -->
        <div class={"flex max-w-full grow items-center justify-between rounded-full p-2 " + bluetoothStatusClass}>
            <div class="flex items-center justify-start">
                <Bluetooth class="m-2 size-5 text-secondary-foreground" />
                <p class="max-w-36 truncate text-sm font-medium">
                    {toSentenceCase(connectionStatus == "SUPPORT_NOT_KNOWN" ? (connectionStatus = "CONNECTED") : connectionStatus)}
                </p>
            </div>
            <Button class="rounded-full" onclick={connect}>Connect</Button>
        </div>

        <!-- Communist server status -->
        <div class={"flex w-fit rounded-full p-2 " + socketStatusClass}>
            <School class="m-2 size-5 text-secondary-foreground" />
            {#if simState.inClassroom}
                <Check class="m-2 size-5 text-secondary-foreground" />
            {/if}
        </div>
    </div>

    <!-- Simulation speed control -->
    {#if !simState.inClassroom}
        <div class="mt-8 flex items-center gap-2">
            <h3 class="text-xl font-semibold tracking-tight">Simulation speed</h3>
            <Badge variant="secondary">{simSpeedText}</Badge>
        </div>
        <Slider class="my-4" type="single" min={0} max={7} step={1} bind:value={simSpeedEnum} />

        <!-- Seconds per day display -->
        <div class="mt-2 text-sm text-muted-foreground">
            Seconds per day: {12.5 / simSpeed}
        </div>
    {/if}

    <!-- Epilepsy warning dialog -->
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
                    <p class="font-bold text-destructive">
                        By choosing to continue, you acknowledge that you have read and understood this warning, and we are not liable for any damages
                        caused thereafter.
                    </p>
                </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
                <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                <AlertDialog.Action onclick={alertConfirmed}>Continue</AlertDialog.Action>
            </AlertDialog.Footer>
        </AlertDialog.Content>
    </AlertDialog.Root>
</div>

<!-- Day Count -->
<div class="absolute top-4 right-4 max-h-[calc(100vh-2rem)] w-sm overflow-y-auto rounded-lg bg-background p-4 shadow-lg" {onwheel}>
    <!-- Sensor readings display -->
    <h3 class="scroll-m-20 text-xl font-semibold tracking-tight">Sensor readings</h3>
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
            value={simState.temp}
            min={0}
            max={1}
            effectorState={simState.effectors[3] ? "ON" : "OFF"}
            effectorName="Heater"
            isDelta={true}
        />
    </div>
</div>

<P5 {sketch} />
