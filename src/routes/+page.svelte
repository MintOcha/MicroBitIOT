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

    const numEffectors = 4;
    const numSensors = 4;

    let connection: MicrobitWebBluetoothConnection | null = $state(null);
    let connectionStatus = $state("DISCONNECTED");
    let effectorSettings = $state(new Array(numEffectors).fill(0));

    async function connect() {
        connection = createWebBluetoothConnection();
        connection.addEventListener("status", (event: ConnectionStatusEvent) => {
            connectionStatus = event.status;
        });
        connectionStatus = await connection.connect();
        connection.addEventListener(
            "uartdata",
            (event: UARTDataEvent) => {
                const received = new TextDecoder().decode(event.value).split(";");
                const index = parseInt(received[0]);
                const value = received[1];
                console.log("FJSDJSLAJ", value);
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
                    effectorSettings[index] = realValue;
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
        write(values.join(";"));
    }

    function goofy() {
        sendSensorReadings([33, 21, 76, 39]);
    }

    const sketch: Sketch = (p5) => {
        p5.preload = () => preload(p5);
        p5.setup = () => setup(p5);
        p5.draw = () => draw(p5);
    };

    let amogus = $state(0);
</script>

<p>{connectionStatus}</p>
<p>{effectorSettings.join(", ")}</p>
<p>Soil moisture: {simState.soilm}</p>
<p>Light: {simState.light}</p>
<p>Temperature: {simState.temp}</p>
<Button onclick={connect}>Connect</Button>
<Button onclick={goofy}>Goofy</Button>
<Slider type="single" min={0} max={100} step={1} bind:value={amogus} />
<P5 {sketch} />
