<script lang="ts">
    import * as Card from "$lib/components/ui/card/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import type { Component } from "svelte";

    let {
        Icon,
        name,
        value,
        min,
        max,
        effectorName,
        effectorState,
        isDelta = false,
    }: {
        Icon: any;
        name: string;
        value: number;
        min: number;
        max: number;
        effectorName: string;
        effectorState: string;
        isDelta: boolean;
    } = $props();

    function componentText(num: number) {
        let signChar: string;
        if (num == 0 || !isDelta) {
            signChar = "";
        } else if (num > 0) {
            signChar = "+";
        } else {
            signChar = "−";
        }
        return `${signChar}${num.toFixed(2)}`;
    }
</script>

<Card.Root class="w-full max-w-sm">
    <Card.Content>
        <Card.Title class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <Icon class="size-5"></Icon>
                <p>{name}</p>
            </div>
            <p class="rounded-md bg-accent px-2.5 py-1.5 font-mono">{value.toFixed(2)}</p>
        </Card.Title>
        <div class="mt-2 h-1.5 w-full rounded-full bg-muted">
            <div class="h-1.5 rounded-full bg-primary" style="width: {((value - min) / (max - min)) * 100}%"></div>
        </div>
        <div class="mt-2 flex gap-2">
            <Badge
                variant="secondary"
                class={effectorState === "ON" ? "bg-green-500 font-mono font-semibold text-white" : "bg-red-500 font-mono font-semibold text-white"}
                >{effectorState}</Badge
            >
            <p class="text-sm text-muted-foreground">{effectorName}</p>
        </div>
    </Card.Content>
</Card.Root>
