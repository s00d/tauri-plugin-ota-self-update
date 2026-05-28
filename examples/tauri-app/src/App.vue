<script setup>
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import * as otaApi from "tauri-plugin-ota-self-update-api";

const response = ref("");
const nativeVersion = ref("unknown");
const otaVersion = ref("none");
const effectiveVersion = ref("unknown");
const versionSource = ref("native");
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
  updateResponse(`Candidate=${candidate}, current(effective)=${effectiveVersion.value}.`, "DEBUG");
  updateResponse(
    "If versions are equal or track rules deny transition (release->release, prerelease->prerelease), available=false is expected.",
    "DEBUG"
  );
}

async function refreshPluginVersion() {
  try {
    const v = await otaApi.getCurrentVersion();
    nativeVersion.value = v.nativeVersion;
    otaVersion.value = v.otaVersion ?? "none";
    effectiveVersion.value = v.effectiveVersion;
    versionSource.value = v.source;
  } catch (err) {
    nativeVersion.value = "unknown";
    otaVersion.value = "unknown";
    effectiveVersion.value = "unknown";
    versionSource.value = "native";
    updateResponse(err?.message || String(err), "VERSION_ERROR");
  }
}

async function greet() {
  greetMsg.value = await invoke("greet", { name: name.value });
}

async function checkAndApply() {
  try {
    response.value = "";
    updateResponse(`Starting OTA check (channel=${defaultChannel}, baseUrl=${exampleBaseUrl})`);
    await otaApi.setChannel(defaultChannel);
    updateResponse(`Channel set to "${defaultChannel}"`, "DEBUG");

    const meta = await otaApi.checkWithMeta();
    updateResponse(meta, "META");
    const update = await otaApi.check();
    if (update) {
      const applyResult = await update.apply();
      updateResponse(applyResult, "APPLY");
      await refreshPluginVersion();
      updateResponse(
        `Update applied. Effective version now=${effectiveVersion.value} (source=${versionSource.value}).`
      );
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

async function rollbackOta() {
  try {
    const result = await invoke("plugin:ota-self-update|rollback_update");
    updateResponse(result, "ROLLBACK");
    await refreshPluginVersion();
    updateResponse(
      `Rollback finished. Effective version now=${effectiveVersion.value} (source=${versionSource.value}).`
    );
  } catch (err) {
    updateResponse(err?.message || String(err), "ROLLBACK_ERROR");
  }
}

refreshPluginVersion().then(() => {
  checkAndApply();
});
</script>

<template>
  <main class="container">
    <h1>Welcome to Tauri + Vue!</h1>
    <p>Native version: {{ nativeVersion }}</p>
    <p>OTA version: {{ otaVersion }}</p>
    <p>Effective version (plugin): {{ effectiveVersion }} [{{ versionSource }}]</p>
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
      <button @click="rollbackOta">Rollback OTA Update</button>
      <div v-html="response"></div>
    </div>
  </main>
</template>
