<script lang="ts">
    import {
        ConnectionStatusEvent,
        createWebBluetoothConnection,
        type MicrobitWebBluetoothConnection,
        UARTDataEvent,
    } from "@microbit/microbit-connection";
    import { Button } from "$lib/components/ui/button/index.js";

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
</script>

<p>{connectionStatus}</p>
<p>{effectorSettings.join(", ")}</p>
<Button onclick={connect}>Connect</Button>
<Button onclick={goofy}>Goofy</Button>
