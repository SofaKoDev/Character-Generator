(() => {
  "use strict";

  const STORAGE_KEY = "underdark_knight_characters_v1";

  const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

  const GENDERS = [
    { id: "MALE", label: "Male" },
    { id: "FEMALE", label: "Female" },
  ];

  // Exact D&D 3.5 race ranges & ability modifiers from V0_1/Race.java
  const RACES = {
    HUMAN: {
      id: "HUMAN",
      label: "Human",
      minAge: 15, maxAge: 30,
      minWeight: 90, maxWeight: 260,
      minHeight: 54, maxHeight: 89,
      mods: [0, 0, 0, 0, 0, 0],
    },
    ELF: {
      id: "ELF",
      label: "Elf",
      minAge: 80, maxAge: 180,
      minWeight: 70, maxWeight: 130,
      minHeight: 48, maxHeight: 66,
      mods: [0, 2, -2, 2, 0, 0],
    },
    DWARF: {
      id: "DWARF",
      label: "Dwarf",
      minAge: 40, maxAge: 70,
      minWeight: 150, maxWeight: 230,
      minHeight: 48, maxHeight: 58,
      mods: [2, 0, 2, 0, 0, -2],
    },
    GNOME: {
      id: "GNOME",
      label: "Gnome",
      minAge: 30, maxAge: 50,
      minWeight: 55, maxWeight: 80,
      minHeight: 30, maxHeight: 41,
      mods: [-2, 2, 2, 0, 0, 0],
    },
    HALFLING: {
      id: "HALFLING",
      label: "Halfling",
      minAge: 30, maxAge: 60,
      minWeight: 40, maxWeight: 60,
      minHeight: 38, maxHeight: 51,
      mods: [-2, 2, 0, 0, 2, 0],
    },
  };

  // Exact 3x3 alignment grid from V0_1/Alignment.java
  const ALIGNMENTS = [
    { id: "LG", short: "LG", label: "Lawful Good" },
    { id: "LN", short: "LN", label: "Lawful Neutral" },
    { id: "LE", short: "LE", label: "Lawful Evil" },
    { id: "NG", short: "NG", label: "Neutral Good" },
    { id: "NN", short: "TN", label: "True Neutral" },
    { id: "NE", short: "NE", label: "Neutral Evil" },
    { id: "CG", short: "CG", label: "Chaotic Good" },
    { id: "CN", short: "CN", label: "Chaotic Neutral" },
    { id: "CE", short: "CE", label: "Chaotic Evil" },
  ];

  // Exact dice methods from V0_1/Dice.java
  const DICE_METHODS = [
    { id: "3d6", label: "3d6", desc: "Classic roll" },
    { id: "5d6+1d3", label: "5d6 + 1d3", desc: "Top 3 of 5d6 + 1d3" },
    { id: "5d6", label: "5d6", desc: "Keep highest 3" },
  ];

  const SAMPLE_NAMES = [
    "Aldric", "Bramwell", "Caelum", "Drizzt", "Elara", "Fenris",
    "Garrick", "Helga", "Isolde", "Jorik", "Kaelen", "Lyra",
    "Mireille", "Nyx", "Orin", "Pippin", "Quillan", "Rowan",
    "Seraphina", "Thrain", "Ulric", "Vesper", "Wren", "Zarek",
  ];

  // --- Helpers ---
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function rollKeepHighest(diceCount, sides, keepCount) {
    const rolls = Array.from({ length: diceCount }, () => randInt(1, sides));
    rolls.sort((a, b) => b - a);
    return rolls.slice(0, keepCount).reduce((sum, n) => sum + n, 0);
  }

  function rollAbility(methodId) {
    switch (methodId) {
      case "5d6+1d3":
        return rollKeepHighest(5, 6, 3) + randInt(1, 3);
      case "5d6":
        return rollKeepHighest(5, 6, 3);
      case "3d6":
      default:
        return rollKeepHighest(3, 6, 3);
    }
  }

  function formatHeight(inches) {
    const feet = Math.floor(inches / 12);
    const rem = inches % 12;
    return `${feet}'${rem}"`;
  }

  function abilityModifier(score) {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  }

  function formatRaceMods(mods) {
    const parts = mods
      .map((val, idx) => (val !== 0 ? `${val > 0 ? "+" : ""}${val} ${ABILITIES[idx]}` : null))
      .filter(Boolean);
    return parts.length ? parts.join(", ") : "Balanced (+0)";
  }

  function generateCharacter({ name, gender, alignment, raceId, diceMethod }) {
    const race = RACES[raceId];
    const baseScores = Array.from({ length: 6 }, () => rollAbility(diceMethod));
    const scores = baseScores.map((score, i) => score + race.mods[i]);

    return {
      id: (crypto.randomUUID ? crypto.randomUUID() : `char_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      name: name.trim(),
      gender,
      alignment,
      race: raceId,
      diceMethod,
      age: randInt(race.minAge, race.maxAge),
      weight: randInt(race.minWeight, race.maxWeight),
      height: randInt(race.minHeight, race.maxHeight),
      scores,
      createdAt: Date.now(),
    };
  }

  function changeCharacterRace(character, newRaceId) {
    const oldRace = RACES[character.race];
    const newRace = RACES[newRaceId];
    const updatedScores = character.scores.map((score, i) => score - oldRace.mods[i] + newRace.mods[i]);

    return {
      ...character,
      race: newRaceId,
      age: randInt(newRace.minAge, newRace.maxAge),
      weight: randInt(newRace.minWeight, newRace.maxWeight),
      height: randInt(newRace.minHeight, newRace.maxHeight),
      scores: updatedScores,
    };
  }

  function characterToPlainText(char) {
    const raceLabel = RACES[char.race].label;
    const genderLabel = GENDERS.find((g) => g.id === char.gender)?.label ?? char.gender;
    const alignLabel = ALIGNMENTS.find((a) => a.id === char.alignment)?.label ?? char.alignment;
    return [
      `Name: ${char.name}`,
      `Race: ${raceLabel}  Age: ${char.age} yrs`,
      `Gender: ${genderLabel}  Alignment: ${alignLabel}`,
      `Weight: ${char.weight} lbs.  Height: ${formatHeight(char.height)}`,
      `Str: ${char.scores[0]}  Dex: ${char.scores[1]}  Con: ${char.scores[2]}`,
      `Int: ${char.scores[3]}  Wis: ${char.scores[4]}  Cha: ${char.scores[5]}`,
    ].join("\n");
  }

  // --- Persistence ---
  function loadRoster() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveRoster(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  // --- App State ---
  const state = {
    form: {
      gender: "MALE",
      race: "HUMAN",
      alignment: "NN",
      diceMethod: "3d6",
    },
    roster: loadRoster(),
    previewChar: null,
    selectedCharId: null,
  };

  // --- DOM Elements ---
  const els = {
    form: document.getElementById("characterForm"),
    charName: document.getElementById("charName"),
    randomNameBtn: document.getElementById("randomNameBtn"),
    randomAllBtn: document.getElementById("randomAllBtn"),
    genderGroup: document.getElementById("genderGroup"),
    raceGroup: document.getElementById("raceGroup"),
    alignmentGroup: document.getElementById("alignmentGroup"),
    diceGroup: document.getElementById("diceGroup"),

    sheetStatus: document.getElementById("sheetStatus"),
    sheetEmpty: document.getElementById("sheetEmpty"),
    sheetContent: document.getElementById("sheetContent"),
    sheetName: document.getElementById("sheetName"),
    sheetMeta: document.getElementById("sheetMeta"),
    sheetAge: document.getElementById("sheetAge"),
    sheetHeight: document.getElementById("sheetHeight"),
    sheetWeight: document.getElementById("sheetWeight"),
    sheetMethod: document.getElementById("sheetMethod"),
    abilitiesGrid: document.getElementById("abilitiesGrid"),
    copyTextBtn: document.getElementById("copyTextBtn"),

    previewActions: document.getElementById("previewActions"),
    saveCharBtn: document.getElementById("saveCharBtn"),
    rerollBtn: document.getElementById("rerollBtn"),
    discardBtn: document.getElementById("discardBtn"),

    savedActions: document.getElementById("savedActions"),
    alterRaceSelect: document.getElementById("alterRaceSelect"),
    applyRaceBtn: document.getElementById("applyRaceBtn"),
    eraseCharBtn: document.getElementById("eraseCharBtn"),

    rosterCount: document.getElementById("rosterCount"),
    rosterEmpty: document.getElementById("rosterEmpty"),
    rosterList: document.getElementById("rosterList"),

    eraseModal: document.getElementById("eraseModal"),
    eraseModalText: document.getElementById("eraseModalText"),
    cancelEraseBtn: document.getElementById("cancelEraseBtn"),
    confirmEraseBtn: document.getElementById("confirmEraseBtn"),

    toast: document.getElementById("toast"),
  };

  let toastTimer = null;
  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.add("hidden"), 2400);
  }

  // --- Render Controls ---
  function renderChoiceControls() {
    els.genderGroup.innerHTML = GENDERS.map(
      (g) => `
        <button type="button" class="choice-btn center ${state.form.gender === g.id ? "active" : ""}" data-gender="${g.id}">
          ${g.label}
        </button>`
    ).join("");

    els.raceGroup.innerHTML = Object.values(RACES).map(
      (r) => `
        <button type="button" class="choice-btn ${state.form.race === r.id ? "active" : ""}" data-race="${r.id}">
          <span>${r.label}</span>
          <span class="choice-sub">${formatRaceMods(r.mods)}</span>
        </button>`
    ).join("");

    els.alignmentGroup.innerHTML = ALIGNMENTS.map(
      (a) => `
        <button type="button" class="choice-btn center ${state.form.alignment === a.id ? "active" : ""}" data-alignment="${a.id}" title="${a.label}">
          <span>${a.short}</span>
          <span class="choice-sub">${a.label}</span>
        </button>`
    ).join("");

    els.diceGroup.innerHTML = DICE_METHODS.map(
      (d) => `
        <button type="button" class="choice-btn ${state.form.diceMethod === d.id ? "active" : ""}" data-dice="${d.id}">
          <span>${d.label}</span>
          <span class="choice-sub">${d.desc}</span>
        </button>`
    ).join("");
  }

  function populateAlterRaceSelect(currentRaceId) {
    els.alterRaceSelect.innerHTML = Object.values(RACES)
      .map((r) => `<option value="${r.id}" ${r.id === currentRaceId ? "selected" : ""}>${r.label}</option>`)
      .join("");
  }

  function getActiveCharacter() {
    if (state.previewChar) return { char: state.previewChar, isPreview: true };
    const found = state.roster.find((c) => c.id === state.selectedCharId);
    if (found) return { char: found, isPreview: false };
    return null;
  }

  function renderSheet() {
    const active = getActiveCharacter();
    if (!active) {
      els.sheetEmpty.classList.remove("hidden");
      els.sheetContent.classList.add("hidden");
      els.sheetStatus.classList.add("hidden");
      return;
    }

    const { char, isPreview } = active;
    const race = RACES[char.race];
    const genderLabel = GENDERS.find((g) => g.id === char.gender)?.label ?? char.gender;
    const alignLabel = ALIGNMENTS.find((a) => a.id === char.alignment)?.label ?? char.alignment;
    const diceLabel = DICE_METHODS.find((d) => d.id === char.diceMethod)?.label ?? char.diceMethod;

    els.sheetEmpty.classList.add("hidden");
    els.sheetContent.classList.remove("hidden");
    els.sheetStatus.classList.remove("hidden");
    els.sheetStatus.textContent = isPreview ? "Unsaved Preview" : "Saved Hero";
    els.sheetStatus.classList.toggle("saved", !isPreview);

    els.sheetName.textContent = char.name;
    els.sheetMeta.textContent = `${genderLabel} ${race.label} • ${alignLabel}`;
    els.sheetAge.textContent = `${char.age} yrs`;
    els.sheetHeight.textContent = formatHeight(char.height);
    els.sheetWeight.textContent = `${char.weight} lbs`;
    els.sheetMethod.textContent = diceLabel;

    els.abilitiesGrid.innerHTML = ABILITIES.map((abbr, idx) => {
      const score = char.scores[idx];
      const racial = race.mods[idx];
      const racialBadge =
        racial !== 0
          ? `<span class="ability-racial ${racial > 0 ? "pos" : "neg"}" title="Racial modifier">${racial > 0 ? `+${racial}` : racial}</span>`
          : "";
      return `
        <div class="ability-card">
          ${racialBadge}
          <div class="ability-name">${abbr}</div>
          <div class="ability-score">${score}</div>
          <div class="ability-mod">${abilityModifier(score)}</div>
        </div>`;
    }).join("");

    els.previewActions.classList.toggle("hidden", !isPreview);
    els.savedActions.classList.toggle("hidden", isPreview);

    if (!isPreview) {
      populateAlterRaceSelect(char.race);
    }
  }

  function renderRoster() {
    els.rosterCount.textContent = String(state.roster.length);
    els.rosterEmpty.classList.toggle("hidden", state.roster.length > 0);

    els.rosterList.innerHTML = state.roster
      .map((char) => {
        const raceLabel = RACES[char.race]?.label ?? char.race;
        const alignShort = ALIGNMENTS.find((a) => a.id === char.alignment)?.short ?? char.alignment;
        const isSelected = !state.previewChar && state.selectedCharId === char.id;
        return `
          <li class="roster-item ${isSelected ? "selected" : ""}" data-id="${char.id}" tabindex="0" role="button">
            <div>
              <div class="roster-item-name">${escapeHtml(char.name)}</div>
              <div class="roster-item-sub">${raceLabel} • ${alignShort} • ${char.age} yrs • ${formatHeight(char.height)}</div>
            </div>
            <div class="roster-item-stats">STR ${char.scores[0]} · DEX ${char.scores[1]} · CON ${char.scores[2]}</div>
          </li>`;
      })
      .join("");
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // --- Event Listeners ---
  els.genderGroup.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-gender]");
    if (!btn) return;
    state.form.gender = btn.dataset.gender;
    renderChoiceControls();
  });

  els.raceGroup.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-race]");
    if (!btn) return;
    state.form.race = btn.dataset.race;
    renderChoiceControls();
  });

  els.alignmentGroup.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-alignment]");
    if (!btn) return;
    state.form.alignment = btn.dataset.alignment;
    renderChoiceControls();
  });

  els.diceGroup.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-dice]");
    if (!btn) return;
    state.form.diceMethod = btn.dataset.dice;
    renderChoiceControls();
  });

  els.randomNameBtn.addEventListener("click", () => {
    els.charName.value = pickRandom(SAMPLE_NAMES);
    els.charName.focus();
  });

  els.randomAllBtn.addEventListener("click", () => {
    els.charName.value = pickRandom(SAMPLE_NAMES);
    state.form.gender = pickRandom(GENDERS).id;
    state.form.race = pickRandom(Object.keys(RACES));
    state.form.alignment = pickRandom(ALIGNMENTS).id;
    state.form.diceMethod = pickRandom(DICE_METHODS).id;
    renderChoiceControls();

    state.previewChar = generateCharacter({
      name: els.charName.value,
      gender: state.form.gender,
      alignment: state.form.alignment,
      raceId: state.form.race,
      diceMethod: state.form.diceMethod,
    });
    state.selectedCharId = null;
    renderSheet();
    renderRoster();
  });

  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = els.charName.value.trim();
    if (!name) {
      els.charName.focus();
      return;
    }
    state.previewChar = generateCharacter({
      name,
      gender: state.form.gender,
      alignment: state.form.alignment,
      raceId: state.form.race,
      diceMethod: state.form.diceMethod,
    });
    state.selectedCharId = null;
    renderSheet();
    renderRoster();
  });

  els.saveCharBtn.addEventListener("click", () => {
    if (!state.previewChar) return;
    state.roster.unshift(state.previewChar);
    saveRoster(state.roster);
    state.selectedCharId = state.previewChar.id;
    const savedName = state.previewChar.name;
    state.previewChar = null;
    renderSheet();
    renderRoster();
    showToast(`${savedName} saved to your roster.`);
  });

  els.rerollBtn.addEventListener("click", () => {
    if (!state.previewChar) return;
    state.previewChar = generateCharacter({
      name: state.previewChar.name,
      gender: state.previewChar.gender,
      alignment: state.previewChar.alignment,
      raceId: state.previewChar.race,
      diceMethod: state.previewChar.diceMethod,
    });
    renderSheet();
  });

  els.discardBtn.addEventListener("click", () => {
    state.previewChar = null;
    if (state.roster.length && !state.selectedCharId) {
      state.selectedCharId = state.roster[0].id;
    }
    renderSheet();
    renderRoster();
  });

  els.applyRaceBtn.addEventListener("click", () => {
    const idx = state.roster.findIndex((c) => c.id === state.selectedCharId);
    if (idx === -1) return;
    const newRaceId = els.alterRaceSelect.value;
    if (state.roster[idx].race === newRaceId) {
      showToast("Already that race.");
      return;
    }
    state.roster[idx] = changeCharacterRace(state.roster[idx], newRaceId);
    saveRoster(state.roster);
    renderSheet();
    renderRoster();
    showToast(`Changed race to ${RACES[newRaceId].label}.`);
  });

  els.copyTextBtn.addEventListener("click", async () => {
    const active = getActiveCharacter();
    if (!active) return;
    const text = characterToPlainText(active.char);
    try {
      await navigator.clipboard.writeText(text);
      showToast("Character sheet copied to clipboard.");
    } catch {
      showToast("Could not access clipboard.");
    }
  });

  els.rosterList.addEventListener("click", (e) => {
    const item = e.target.closest(".roster-item");
    if (!item) return;
    state.previewChar = null;
    state.selectedCharId = item.dataset.id;
    renderSheet();
    renderRoster();
  });

  els.rosterList.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const item = e.target.closest(".roster-item");
    if (!item) return;
    e.preventDefault();
    state.previewChar = null;
    state.selectedCharId = item.dataset.id;
    renderSheet();
    renderRoster();
  });

  // Perma-death modal
  els.eraseCharBtn.addEventListener("click", () => {
    const char = state.roster.find((c) => c.id === state.selectedCharId);
    if (!char) return;
    els.eraseModalText.textContent = `WARNING: Deleting ${char.name} is PERMA-DEATH. This cannot be undone.`;
    els.eraseModal.classList.remove("hidden");
  });

  els.cancelEraseBtn.addEventListener("click", () => {
    els.eraseModal.classList.add("hidden");
  });

  els.eraseModal.addEventListener("click", (e) => {
    if (e.target === els.eraseModal) {
      els.eraseModal.classList.add("hidden");
    }
  });

  els.confirmEraseBtn.addEventListener("click", () => {
    const idx = state.roster.findIndex((c) => c.id === state.selectedCharId);
    if (idx !== -1) {
      const removed = state.roster.splice(idx, 1)[0];
      saveRoster(state.roster);
      state.selectedCharId = state.roster[0]?.id ?? null;
      showToast(`${removed.name} has been erased.`);
    }
    els.eraseModal.classList.add("hidden");
    renderSheet();
    renderRoster();
  });

  // --- Initial Render ---
  if (state.roster.length > 0) {
    state.selectedCharId = state.roster[0].id;
  }
  renderChoiceControls();
  renderSheet();
  renderRoster();
})();
