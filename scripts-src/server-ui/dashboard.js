(function () {
  const tokenInput = document.getElementById("token");
  const rows = document.getElementById("rows");
  const info = document.getElementById("info");
  const infoCard = document.getElementById("infoCard");
  const releasesCard = document.getElementById("releasesCard");
  const loginBtn = document.getElementById("login");
  const storageKey = "ota_token";

  tokenInput.value = localStorage.getItem(storageKey) || "";

  function authHeaders() {
    const token = (tokenInput.value || "").trim();
    if (!token) return null;
    return { Authorization: "Bearer " + token, "Content-Type": "application/json" };
  }

  function setUnauthorizedState() {
    infoCard.style.display = "none";
    releasesCard.style.display = "none";
    info.textContent = "Authorization required";
    rows.innerHTML = "";
  }

  function setAuthorizedState() {
    infoCard.style.display = "block";
    releasesCard.style.display = "block";
  }

  async function api(path, options) {
    const headers = authHeaders();
    if (!headers) {
      setUnauthorizedState();
      throw new Error("Token required");
    }
    const response = await fetch(path, {
      ...options,
      headers: { ...headers, ...(options?.headers || {}) },
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response;
  }

  async function loadInfo() {
    try {
      const response = await api("/api/info");
      setAuthorizedState();
      const payload = await response.json();
      const stats = payload.stats || {};
      info.innerHTML = `
        <p><strong>What this dashboard is:</strong> a release control panel for OTA web-asset updates.  
        Your app checks this server for the latest version in a channel and downloads the linked archive.</p>

        <p><strong>How release selection works:</strong> clients read <code>releases.json</code> and use only entries with
        <code>status = released</code>. Draft and revoked entries stay visible to admins but are ignored by clients.</p>

        <p><strong>What each action does:</strong></p>
        <ul>
          <li><strong>Confirm</strong> -> marks a version as <code>released</code> (eligible for client updates).</li>
          <li><strong>Revoke</strong> -> marks a version as <code>revoked</code> (clients stop using it).</li>
          <li><strong>Draft</strong> -> marks a version as <code>draft</code> (prepared but not live).</li>
          <li><strong>Delete</strong> -> removes the release entry (and with purge also deletes files).</li>
        </ul>

        <p><strong>Current server summary:</strong>
        total=${stats.total ?? 0}, released=${stats.released ?? 0}, draft=${stats.draft ?? 0}, revoked=${stats.revoked ?? 0},
        stable=${stats.stable ?? 0}, beta=${stats.beta ?? 0}.</p>
      `;
    } catch (error) {
      setUnauthorizedState();
      info.textContent = String(error instanceof Error ? error.message : error);
    }
  }

  async function loadReleases() {
    try {
      const response = await api("/api/releases");
      const list = await response.json();
      rows.innerHTML = "";
      if (!list.length) {
        const tr = document.createElement("tr");
        tr.innerHTML = '<td class="empty" colspan="5">No releases yet. Publish first OTA package to see entries here.</td>';
        rows.appendChild(tr);
        return;
      }
      for (const entry of list) {
        const tr = document.createElement("tr");
        tr.innerHTML = "<td></td><td></td><td></td><td></td><td></td>";
        tr.children[0].textContent = entry.version;
        tr.children[1].innerHTML = `<span class="pill ${entry.channel}">${entry.channel}</span>`;
        tr.children[2].innerHTML = `<span class="pill ${entry.status || "released"}">${entry.status || "released"}</span>`;
        tr.children[3].textContent = entry.pubDate || "";
        const actions = tr.children[4];
        actions.className = "actions";

        [["Confirm", "confirm"], ["Revoke", "revoke"], ["Draft", "draft"]].forEach(([label, action]) => {
          const button = document.createElement("button");
          button.textContent = label;
          button.className = `btn ${action}`;
          button.onclick = () => mutate(entry.channel, entry.version, action);
          actions.appendChild(button);
        });

        const del = document.createElement("button");
        del.textContent = "Delete";
        del.className = "btn delete";
        del.onclick = () => mutate(entry.channel, entry.version, "delete");
        actions.appendChild(del);

        rows.appendChild(tr);
      }
    } catch {
      setUnauthorizedState();
    }
  }

  async function mutate(channel, version, action) {
    try {
      const actionLabel = action === "delete" ? "delete" : action;
      const confirmed = window.confirm(
        `Confirm action "${actionLabel}" for ${channel}/${version}?`
      );
      if (!confirmed) return;

      if (action === "delete") {
        await api(`/api/releases/${encodeURIComponent(channel)}/${encodeURIComponent(version)}?purge=true`, { method: "DELETE" });
      } else {
        await api(`/api/releases/${encodeURIComponent(channel)}/${encodeURIComponent(version)}/${action}`, { method: "POST" });
      }
      await loadInfo();
      await loadReleases();
    } catch (error) {
      alert(String(error instanceof Error ? error.message : error));
    }
  }

  loginBtn.onclick = async function () {
    const token = (tokenInput.value || "").trim();
    if (!token) {
      setUnauthorizedState();
      return;
    }
    try {
      await loadInfo();
      await loadReleases();
      localStorage.setItem(storageKey, token);
    } catch {
      setUnauthorizedState();
    }
  };

  if ((tokenInput.value || "").trim()) {
    loginBtn.click();
  } else {
    setUnauthorizedState();
  }
})();
