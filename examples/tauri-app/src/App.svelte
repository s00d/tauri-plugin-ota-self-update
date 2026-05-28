<script>
  import Greet from './lib/Greet.svelte'
  import { getVersion } from '@tauri-apps/api/app'
  import { check, checkWithMeta } from 'tauri-plugin-ota-self-update-api'

	let response = $state('')
  let appVersion = $state('unknown')

	function updateResponse(returnValue) {
		response += `[${new Date().toLocaleTimeString()}] ` + (typeof returnValue === 'string' ? returnValue : JSON.stringify(returnValue)) + '<br>'
	}

  getVersion()
    .then((version) => {
      appVersion = version
    })
    .catch(() => {
      appVersion = 'unknown'
    })

	async function checkAndApply() {
		try {
			const meta = await checkWithMeta()
			updateResponse(meta)
			const update = await check()
			if (update) {
				await update.apply()
				updateResponse('Update downloaded and unpacked into cache. Reload app to pick changes.')
			}
		} catch (err) {
			updateResponse(err)
		}
	}
</script>

<main class="container">
  <h1>Welcome to Tauri!</h1>
  <p>App version: {appVersion}</p>

  <div class="row">
    <a href="https://vite.dev" target="_blank">
      <img src="/vite.svg" class="logo vite" alt="Vite Logo" />
    </a>
    <a href="https://tauri.app" target="_blank">
      <img src="/tauri.svg" class="logo tauri" alt="Tauri Logo" />
    </a>
    <a href="https://svelte.dev" target="_blank">
      <img src="/svelte.svg" class="logo svelte" alt="Svelte Logo" />
    </a>
  </div>

  <p>
    Click on the Tauri, Vite, and Svelte logos to learn more.
  </p>

  <div class="row">
    <Greet />
  </div>

  <div>
    <button onclick="{checkAndApply}">Check OTA Update</button>
    <div>{@html response}</div>
  </div>

</main>

<style>
  .logo.vite:hover {
    filter: drop-shadow(0 0 2em #747bff);
  }

  .logo.svelte:hover {
    filter: drop-shadow(0 0 2em #ff3e00);
  }
</style>
