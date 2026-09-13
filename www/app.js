(() => {
  "use strict";

  const DEFAULT_START_ISO = "2026-09-12T16:43:00-03:00";
  const STORAGE_KEY = "nosso-tempo-v4-settings";
  const ONBOARD_KEY = "nosso-tempo-v4-onboarded";

  const DEFAULTS = {
    startISO: DEFAULT_START_ISO,
    theme: "discreet",
    accent: "#FFFFFF",
    cardY: 42,
    cardScale: 92,
    cardAlpha: 10,
    showSeconds: false,
    showSince: false,
    showMilestone: false,
    heart: "outline",
    protectSettings: false,
    notifications: false,
    backgroundEnabled: false,
    backgroundDim: 38
  };

  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");

  let state = loadLocal();
  let backgroundPreviewData = "";

  function loadLocal() {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function nativePlugin() {
    return window.Capacitor?.Plugins?.NossoTempo || null;
  }


  function normalizeHex(value) {
    const clean = String(value || "")
      .trim()
      .replace(/^#/, "")
      .replace(/[^0-9a-fA-F]/g, "")
      .slice(0, 6)
      .toUpperCase();

    return clean.length === 6 ? `#${clean}` : null;
  }

  async function loadNativeBackgroundPreview() {
    const plugin = nativePlugin();
    if (!plugin || !state.backgroundEnabled) return;

    try {
      const result = await plugin.getBackgroundImage();
      if (result?.imageData) {
        backgroundPreviewData = result.imageData;
      }
    } catch (error) {
      console.warn("Não foi possível carregar a imagem de fundo:", error);
    }
  }

  async function compressImage(file) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });

    const maxW = 1440;
    const maxH = 2560;
    const ratio = Math.min(1, maxW / image.width, maxH / image.height);

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));

    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.88);
  }

  async function setBackgroundFromFile(file) {
    if (!file) return;

    try {
      const dataUrl = await compressImage(file);
      backgroundPreviewData = dataUrl;
      state.backgroundEnabled = true;

      const plugin = nativePlugin();
      if (plugin) {
        await plugin.saveBackgroundImage({ imageData: dataUrl });
      }

      saveLocal();
      await saveNative();
      applyPreview();
      updateBackgroundSummary();
    } catch (error) {
      console.error(error);
      alert("Não foi possível usar essa imagem. Tente outra foto.");
    }
  }

  async function removeBackgroundImage() {
    backgroundPreviewData = "";
    state.backgroundEnabled = false;

    const plugin = nativePlugin();
    if (plugin) {
      try {
        await plugin.clearBackgroundImage();
      } catch (error) {
        console.warn("Não foi possível remover a imagem nativa:", error);
      }
    }

    saveLocal();
    await saveNative();
    applyPreview();
    updateBackgroundSummary();
  }

  function updateBackgroundSummary() {
    const summary = $("bgSummary");
    if (!summary) return;
    summary.textContent = state.backgroundEnabled
      ? "Foto personalizada ativa"
      : "Usando fundo padrão";
  }

  async function loadNative() {
    const plugin = nativePlugin();
    if (!plugin) return;

    try {
      const native = await plugin.getSettings();
      if (native && native.startTime) {
        state = {
          ...state,
          startISO: new Date(native.startTime).toISOString(),
          theme: native.theme ?? state.theme,
          accent: native.accent ?? state.accent,
          cardY: native.cardY ?? state.cardY,
          cardScale: native.cardScale ?? state.cardScale,
          cardAlpha: native.cardAlpha ?? state.cardAlpha,
          showSeconds: native.showSeconds ?? state.showSeconds,
          showSince: native.showSince ?? state.showSince,
          showMilestone: native.showMilestone ?? state.showMilestone,
          heart: native.heart ?? state.heart,
          protectSettings: native.protectSettings ?? state.protectSettings,
          notifications: native.notifications ?? state.notifications,
          backgroundEnabled: native.backgroundEnabled ?? state.backgroundEnabled,
          backgroundDim: native.backgroundDim ?? state.backgroundDim
        };
        saveLocal();
      }
    } catch (error) {
      console.warn("Configurações nativas indisponíveis:", error);
    }
  }

  async function saveNative() {
    const plugin = nativePlugin();
    if (!plugin) return;

    try {
      await plugin.saveSettings({
        startTime: new Date(state.startISO).getTime(),
        theme: state.theme,
        accent: state.accent,
        cardY: Number(state.cardY),
        cardScale: Number(state.cardScale),
        cardAlpha: Number(state.cardAlpha),
        showSeconds: Boolean(state.showSeconds),
        showSince: Boolean(state.showSince),
        showMilestone: Boolean(state.showMilestone),
        heart: state.heart,
        protectSettings: Boolean(state.protectSettings),
        notifications: Boolean(state.notifications),
        backgroundEnabled: Boolean(state.backgroundEnabled),
        backgroundDim: Number(state.backgroundDim)
      });
    } catch (error) {
      console.warn("Não foi possível salvar no Android:", error);
    }
  }

  const themeLabels = {
    discreet: "Discreto",
    glass: "Vidro",
    oled: "OLED",
    aurora: "Aurora",
    material: "Material",
    minimal: "Minimal"
  };

  function getStart() {
    const date = new Date(state.startISO);
    return Number.isNaN(date.getTime()) ? new Date(DEFAULT_START_ISO) : date;
  }

  function heartSymbol() {
    return ({ outline: "♡", solid: "♥", spark: "✦", none: "" })[state.heart] ?? "♡";
  }

  function formatStartLong() {
    const d = getStart();
    const date = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "long", year: "numeric"
    }).format(d);
    const time = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit", minute: "2-digit", hour12: false
    }).format(d);
    return `Desde ${date} • ${time}`;
  }

  function formatStartShort() {
    const d = getStart();
    const date = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric"
    }).format(d);
    const time = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit", minute: "2-digit", hour12: false
    }).format(d);
    return `${date} • ${time}`;
  }

  function elapsed(now = new Date()) {
    const total = Math.max(0, Math.floor((now - getStart()) / 1000));
    return {
      total,
      days: Math.floor(total / 86400),
      hours: Math.floor((total % 86400) / 3600),
      minutes: Math.floor((total % 3600) / 60),
      seconds: total % 60
    };
  }

  function milestoneCandidates() {
    const start = getStart();
    const list = [];
    const fixedDays = [10, 30, 50, 100, 200, 365, 500, 730, 1000, 1500, 2000];

    for (const days of fixedDays) {
      list.push({
        at: new Date(start.getTime() + days * 86400000),
        label: days === 365 ? "1 ano" : days === 730 ? "2 anos" : `${days} dias`,
        kind: "days"
      });
    }

    for (let months = 1; months <= 60; months++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + months);
      const years = Math.floor(months / 12);
      let label;
      if (months % 12 === 0) label = `${years} ${years === 1 ? "ano" : "anos"}`;
      else label = `${months} ${months === 1 ? "mês" : "meses"}`;
      list.push({ at: d, label, kind: "month" });
    }

    return list.sort((a, b) => a.at - b.at);
  }

  function nextMilestone(now = new Date()) {
    const start = getStart();
    const candidates = milestoneCandidates();
    const next = candidates.find(item => item.at > now) || candidates[candidates.length - 1];
    const previous = [...candidates].reverse().find(item => item.at <= now) || { at: start };

    const span = Math.max(1, next.at - previous.at);
    const done = Math.max(0, Math.min(span, now - previous.at));
    const progress = Math.round((done / span) * 100);

    return { ...next, previousAt: previous.at, progress };
  }

  function remainingText(target, now = new Date()) {
    let seconds = Math.max(0, Math.floor((target - now) / 1000));
    const days = Math.floor(seconds / 86400);
    seconds %= 86400;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `Faltam ${days}d ${hours}h`;
    if (hours > 0) return `Faltam ${hours}h ${minutes}min`;
    return `Faltam ${minutes}min`;
  }

  function updateClock() {
    const now = new Date();
    const e = elapsed(now);
    const m = nextMilestone(now);

    $("days").textContent = pad(e.days);
    $("hours").textContent = pad(e.hours);
    $("minutes").textContent = pad(e.minutes);
    $("seconds").textContent = pad(e.seconds);
    $("daysBig").textContent = e.days;

    $("pDays").textContent = pad(e.days);
    $("pHours").textContent = pad(e.hours);
    $("pMinutes").textContent = pad(e.minutes);
    $("pSeconds").textContent = pad(e.seconds);

    $("previewClock").textContent = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit", minute: "2-digit", hour12: false
    }).format(now);

    $("previewDate").textContent = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long", day: "2-digit", month: "long"
    }).format(now);

    $("sinceLabel").textContent = formatStartLong();
    $("previewSince").textContent = formatStartLong();
    $("startSummary").textContent = formatStartShort();

    $("milestoneTitle").textContent = `${m.label} juntos`;
    $("milestoneRemaining").textContent = remainingText(m.at, now);
    $("previewMilestone").textContent = `Próximo marco: ${m.label}`;
    $("progressValue").textContent = m.progress;
    $("progressRing").style.setProperty("--progress", `${m.progress * 3.6}deg`);
  }

  function applyPreview() {
    const preview = $("phonePreview");
    preview.dataset.theme = state.theme;
    preview.style.setProperty("--accent", state.accent);
    preview.style.setProperty("--card-y", `${state.cardY}%`);
    preview.style.setProperty("--card-scale", state.cardScale / 100);
    preview.style.setProperty("--card-alpha", state.cardAlpha / 100);

    document.documentElement.style.setProperty("--accent", state.accent);
    $("themeName").textContent = themeLabels[state.theme] || "Vidro";
    $("previewHeart").textContent = heartSymbol();

    $("pSeconds").parentElement.style.display = state.showSeconds ? "" : "none";
    $("previewSince").style.display = state.showSince ? "" : "none";
    $("previewMilestone").style.display = state.showMilestone ? "" : "none";

    document.querySelectorAll(".theme-option").forEach(btn => {
      btn.classList.toggle("selected", btn.dataset.theme === state.theme);
    });

    preview.style.setProperty("--photo-dim", String(state.backgroundDim / 100));

    if (state.backgroundEnabled && backgroundPreviewData) {
      preview.classList.add("has-photo");
      preview.style.backgroundImage = `url("${backgroundPreviewData}")`;
    } else {
      preview.classList.remove("has-photo");
      preview.style.removeProperty("background-image");
    }

    updateBackgroundSummary();
  }

  function fillSettingsForm() {
    $("accentInput").value = state.accent;
    $("accentHexInput").value = state.accent.replace("#", "").toUpperCase();
    $("positionInput").value = state.cardY;
    $("scaleInput").value = state.cardScale;
    $("alphaInput").value = state.cardAlpha;
    $("showSecondsInput").checked = state.showSeconds;
    $("showSinceInput").checked = state.showSince;
    $("showMilestoneInput").checked = state.showMilestone;
    $("heartInput").value = state.heart;
    $("protectInput").checked = state.protectSettings;
    $("notificationsInput").checked = state.notifications;
    $("dimInput").value = state.backgroundDim;
    updateRangeLabels();
    applyPreview();
  }

  function readSettingsForm() {
    state.theme = document.querySelector(".theme-option.selected")?.dataset.theme || state.theme;
    const typedHex = normalizeHex($("accentHexInput").value);
    state.accent = typedHex || $("accentInput").value.toUpperCase();
    state.cardY = Number($("positionInput").value);
    state.cardScale = Number($("scaleInput").value);
    state.cardAlpha = Number($("alphaInput").value);
    state.showSeconds = $("showSecondsInput").checked;
    state.showSince = $("showSinceInput").checked;
    state.showMilestone = $("showMilestoneInput").checked;
    state.heart = $("heartInput").value;
    state.protectSettings = $("protectInput").checked;
    state.notifications = $("notificationsInput").checked;
    state.backgroundDim = Number($("dimInput").value);
  }

  function updateRangeLabels() {
    $("positionValue").textContent = `${$("positionInput").value}%`;
    $("scaleValue").textContent = `${$("scaleInput").value}%`;
    $("alphaValue").textContent = `${$("alphaInput").value}%`;
    $("dimValue").textContent = `${$("dimInput").value}%`;
  }

  async function requireIdentity() {
    if (!state.protectSettings) return true;
    const plugin = nativePlugin();
    if (!plugin) return true;

    try {
      const result = await plugin.confirmIdentity();
      return result?.authenticated !== false;
    } catch {
      return false;
    }
  }

  async function openSettings() {
    if (!(await requireIdentity())) return;
    fillSettingsForm();
    $("settingsDialog").showModal();
  }

  async function openDateEditor() {
    if (!(await requireIdentity())) return;
    const start = getStart();
    $("startDateInput").value = `${start.getFullYear()}-${pad(start.getMonth()+1)}-${pad(start.getDate())}`;
    $("startTimeInput").value = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
    $("dateDialog").showModal();
  }

  async function applyWallpaper() {
    const plugin = nativePlugin();
    if (!plugin) {
      alert("Instale o APK Android para ativar o Live Wallpaper.");
      return;
    }
    await saveNative();
    try {
      await plugin.openWallpaperPicker();
    } catch {
      alert("Não foi possível abrir o seletor de papel de parede neste aparelho.");
    }
  }

  async function refreshWallpaperStatus() {
    const el = $("wallpaperStatus");
    const plugin = nativePlugin();
    if (!plugin) {
      el.textContent = "Prévia web";
      return;
    }
    try {
      const result = await plugin.isWallpaperActive();
      if (result?.active) {
        el.textContent = "Wallpaper ativo";
        el.classList.add("active");
      } else {
        el.textContent = "Ainda não aplicado";
        el.classList.remove("active");
      }
    } catch {
      el.textContent = "Status indisponível";
    }
  }

  function backupPayload() {
    return JSON.stringify({
      app: "Nosso Tempo",
      version: 2,
      exportedAt: new Date().toISOString(),
      settings: state
    }, null, 2);
  }

  async function requestNotificationsIfNeeded() {
    if (!state.notifications) return;
    const plugin = nativePlugin();
    if (!plugin) return;
    try {
      await plugin.requestNotificationPermission();
    } catch {}
  }

  // Events
  $("settingsBtn").addEventListener("click", openSettings);
  $("editStartBtn").addEventListener("click", openDateEditor);
  $("applyWallpaperBtn").addEventListener("click", applyWallpaper);

  $("pickImageBtn").addEventListener("click", () => $("bgImageInput").click());
  $("chooseBgSettingsBtn").addEventListener("click", () => $("bgImageInput").click());
  $("removeBgBtn").addEventListener("click", removeBackgroundImage);

  $("bgImageInput").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    await setBackgroundFromFile(file);
    event.target.value = "";
  });

  document.querySelectorAll(".theme-option").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".theme-option").forEach(x => x.classList.remove("selected"));
      btn.classList.add("selected");
      state.theme = btn.dataset.theme;
      applyPreview();
    });
  });

  ["positionInput","scaleInput","alphaInput","dimInput","showSecondsInput","showSinceInput","showMilestoneInput","heartInput"]
    .forEach(id => $(id).addEventListener("input", () => {
      readSettingsForm();
      updateRangeLabels();
      applyPreview();
    }));

  $("accentInput").addEventListener("input", () => {
    const color = $("accentInput").value.toUpperCase();
    $("accentHexInput").value = color.replace("#", "");
    $("accentHexInput").parentElement.classList.remove("invalid");
    state.accent = color;
    applyPreview();
  });

  $("accentHexInput").addEventListener("input", () => {
    const input = $("accentHexInput");
    input.value = input.value
      .replace(/^#/, "")
      .replace(/[^0-9a-fA-F]/g, "")
      .slice(0, 6)
      .toUpperCase();

    const color = normalizeHex(input.value);
    input.parentElement.classList.toggle("invalid", !color && input.value.length === 6);

    if (color) {
      state.accent = color;
      $("accentInput").value = color;
      applyPreview();
    }
  });

  $("resetStyleBtn").addEventListener("click", () => {
    state = {
      ...state,
      theme: DEFAULTS.theme,
      accent: DEFAULTS.accent,
      cardY: DEFAULTS.cardY,
      cardScale: DEFAULTS.cardScale,
      cardAlpha: DEFAULTS.cardAlpha,
      showSeconds: DEFAULTS.showSeconds,
      showSince: DEFAULTS.showSince,
      showMilestone: DEFAULTS.showMilestone,
      heart: DEFAULTS.heart,
      backgroundDim: DEFAULTS.backgroundDim
    };
    fillSettingsForm();
  });

  $("settingsForm").addEventListener("submit", async () => {
    readSettingsForm();
    saveLocal();
    await requestNotificationsIfNeeded();
    await saveNative();
    applyPreview();
    updateClock();
  });

  $("dateForm").addEventListener("submit", async (event) => {
    const date = $("startDateInput").value;
    const time = $("startTimeInput").value;
    if (!date || !time) {
      event.preventDefault();
      return;
    }
    state.startISO = new Date(`${date}T${time}:00`).toISOString();
    saveLocal();
    await saveNative();
    updateClock();
  });

  $("backupBtn").addEventListener("click", async () => {
    if (!(await requireIdentity())) return;
    $("backupText").value = backupPayload();
    $("backupMessage").textContent = "";
    $("backupDialog").showModal();
  });

  $("closeBackupBtn").addEventListener("click", () => $("backupDialog").close());

  $("copyBackupBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("backupText").value);
      $("backupMessage").textContent = "Backup copiado.";
    } catch {
      $("backupText").select();
      document.execCommand("copy");
      $("backupMessage").textContent = "Backup copiado.";
    }
  });

  $("importBackupBtn").addEventListener("click", async () => {
    try {
      const parsed = JSON.parse($("backupText").value);
      const imported = parsed.settings || parsed;
      state = { ...DEFAULTS, ...state, ...imported };
      saveLocal();
      await saveNative();
      fillSettingsForm();
      applyPreview();
      updateClock();
      $("backupMessage").textContent = "Backup importado com sucesso.";
    } catch {
      $("backupMessage").textContent = "JSON inválido. Confira o conteúdo.";
    }
  });

  $("onboardingForm").addEventListener("submit", async () => {
    const date = $("onboardDate").value;
    const time = $("onboardTime").value;
    if (date && time) {
      state.startISO = new Date(`${date}T${time}:00`).toISOString();
      saveLocal();
      await saveNative();
      localStorage.setItem(ONBOARD_KEY, "1");
      updateClock();
    }
  });

  function prepareOnboarding() {
    const start = getStart();
    $("onboardDate").value = `${start.getFullYear()}-${pad(start.getMonth()+1)}-${pad(start.getDate())}`;
    $("onboardTime").value = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
    if (!localStorage.getItem(ONBOARD_KEY)) {
      setTimeout(() => $("onboardingDialog").showModal(), 300);
    }
  }

  async function init() {
    await loadNative();
    await loadNativeBackgroundPreview();
    fillSettingsForm();
    applyPreview();
    updateClock();
    prepareOnboarding();
    refreshWallpaperStatus();

    setInterval(updateClock, 1000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        updateClock();
        refreshWallpaperStatus();
      }
    });
  }

  init();
})();
