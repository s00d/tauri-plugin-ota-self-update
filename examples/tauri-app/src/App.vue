<script setup>
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { check, checkWithMeta, setChannel } from "tauri-plugin-ota-self-update-api";

const response = ref("");
const appVersion = ref("unknown");
const name = ref("");
const greetMsg = ref("");

const exampleBaseUrl = "https://github.com/s00d/tauri-plugin-ota-self-update";
const defaultChannel = "stable";

function updateResponse(returnValue, level = "INFO") {
  const line = `[${new Date().toLocaleTimeString()}] [${level}] ${
    typeof returnValue === "string" ? returnValue : JSON.stringify(returnValue)
  }<br>`;
  response.value += line;
}

function explainNoUpdate(meta) {
  const candidate = meta?.update?.version;
  if (!candidate) {
    updateResponse(
      "No update candidate found. This usually means selected channel has no matching released manifest.",
      "DEBUG"
    );
    return;
  }
  updateResponse(`Candidate=${candidate}, current=${appVersion.value}.`, "DEBUG");
  updateResponse(
    "If versions are equal or track rules deny transition (release->release, prerelease->prerelease), available=false is expected.",
    "DEBUG"
  );
}

getVersion()
  .then((version) => {
    appVersion.value = version;
  })
  .catch(() => {
    appVersion.value = "unknown";
  });

async function greet() {
  greetMsg.value = await invoke("greet", { name: name.value });
}

async function checkAndApply() {
  try {
    response.value = "";
    updateResponse(`Starting OTA check (channel=${defaultChannel}, baseUrl=${exampleBaseUrl})`);
    await setChannel(defaultChannel);
    updateResponse(`Channel set to "${defaultChannel}"`, "DEBUG");

    const meta = await checkWithMeta();
    updateResponse(meta, "META");
    const update = await check();
    if (update) {
      const applyResult = await update.apply();
      updateResponse(applyResult, "APPLY");
      updateResponse("Update downloaded and unpacked into cache. Reload app to pick changes.");
    } else {
      updateResponse("check() returned null (no available update).");
      explainNoUpdate(meta);
    }
  } catch (err) {
    updateResponse(err?.message || String(err), "ERROR");
    if (err?.stack) {
      updateResponse(err.stack, "TRACE");
    }
  }
}
</script>

<template>
  <main class="container">
    <h1>Welcome to Tauri + Vue!</h1>
    <p>App version: {{ appVersion }}</p>
    <p>Debug target: {{ exampleBaseUrl }} (channel: {{ defaultChannel }})</p>

    <div class="row">
      <a href="https://vite.dev" target="_blank">
        <img src="/vite.svg" class="logo vite" alt="Vite Logo" />
      </a>
      <a href="https://tauri.app" target="_blank">
        <img src="/tauri.svg" class="logo tauri" alt="Tauri Logo" />
      </a>
    </div>

    <div class="row">
      <input id="greet-input" v-model="name" placeholder="Enter a name..." />
      <button @click="greet">Greet</button>
    </div>
    <p>{{ greetMsg }}</p>

    <div>
      <button @click="checkAndApply">Check OTA Update</button>
      <div v-html="response"></div>
    </div>
  </main>
</template>
