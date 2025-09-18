<script lang="ts">
    import {
        ConnectionStatusEvent,
        createWebBluetoothConnection,
        type MicrobitWebBluetoothConnection,
        UARTDataEvent,
    } from "@microbit/microbit-connection";
    import P5, { type Sketch } from "p5-svelte";
    import { preload, setup, draw } from "$lib/sketch";
    import { simState } from "$lib/globals.svelte";

    import { Button } from "$lib/components/ui/button/index.js";
    import { Slider } from "$lib/components/ui/slider/index.js";

    let connection: MicrobitWebBluetoothConnection | null = $state(null);
    let connectionStatus = $state("DISCONNECTED");

    let ping: NodeJS.Timeout | null = null; // for sending data to microbit & clear interval

    async function connect() {
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
                }, 5000);
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
        if (!connection) {
            console.error("no device connected");
            return;
        }
        const encoded = new TextEncoder().encode(data + "\n");
        connection
            .uartWrite(encoded)
            .then(() => console.log(`Written: ${data}`))
            .catch((e) => console.error(`Write error: ${e.error}`));
    }

    function sendSensorReadings(values: number[]) {
        write(values.map(v => Math.round(v)).join(";"));
    }

    function goofy() {
        sendSensorReadings([simState.light*100, 0, simState.soilm*100, simState.temp*100]);
    }

    const sketch: Sketch = (p5) => {
        p5.preload = () => preload(p5);
        p5.setup = () => setup(p5);
        p5.draw = () => draw(p5, goofy);
    };

    let amogus = $state(0);
</script>

<p>{connectionStatus}</p>
<p>{simState.effectors.join(", ")}</p>
<p>Light Intensity: {simState.light}</p>
<p>Humidity: {simState.humidity}</p>
<p>Soil Moisture: {simState.soilm}</p>
<p>Temperature: {simState.temp}</p>
<Button onclick={connect}>Connect</Button>
<Button onclick={goofy}>Goofy</Button>
<Slider type="single" min={0} max={100} step={1} bind:value={amogus} />
<P5 {sketch} />
