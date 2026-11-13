(() => {
  "use strict";

  const preferenceKey = "angry-birds-chaos:muted";
  const aliases = {
    release: "launch",
    impact: "hit",
    explosion: "blast",
    power: "ability",
  };
  const cueCooldowns = { hit: 0.075, break: 0.09, pig: 0.055, blast: 0.105 };
  const lastPlayed = new Map();
  let context;
  let output;
  let noiseBuffer;
  let pendingCue;
  let unlocking;
  let muted = false;

  try {
    muted = window.localStorage.getItem(preferenceKey) === "1";
  } catch {
    // The game still works when browser storage is disabled.
  }

  function initialize() {
    if (context && context.state !== "closed") return true;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    try {
      context = new AudioContext();
      output = context.createGain();
      output.gain.value = muted ? 0 : 0.55;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -18;
      limiter.knee.value = 12;
      limiter.ratio.value = 6;
      limiter.attack.value = 0.005;
      limiter.release.value = 0.13;
      output.connect(limiter);
      limiter.connect(context.destination);

      noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.65), context.sampleRate);
      const samples = noiseBuffer.getChannelData(0);
      let seed = 17371;
      for (let i = 0; i < samples.length; i += 1) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        samples[i] = seed / 2147483648 - 1;
      }
      lastPlayed.clear();
      return true;
    } catch {
      context?.close().catch(() => {});
      context = undefined;
      return false;
    }
  }

  function unlock() {
    if (!initialize()) return Promise.resolve(false);
    if (context.state === "running") return Promise.resolve(true);
    if (unlocking) return unlocking;
    unlocking = context.resume().then(() => {
      if (context.state !== "running") return false;
      if (pendingCue) play(pendingCue);
      pendingCue = undefined;
      return true;
    }, () => false).finally(() => {
      unlocking = undefined;
    });
    return unlocking;
  }

  function setMuted(value) {
    muted = Boolean(value);
    if (muted) pendingCue = undefined;
    if (context && output) {
      const now = context.currentTime;
      output.gain.cancelScheduledValues(now);
      output.gain.setTargetAtTime(muted ? 0 : 0.55, now, 0.012);
    }
    try {
      window.localStorage.setItem(preferenceKey, muted ? "1" : "0");
    } catch {
      // The current session still respects the mute setting.
    }
    return muted;
  }

  function envelope(time, duration, volume) {
    const node = context.createGain();
    node.gain.setValueAtTime(0.001, time);
    node.gain.linearRampToValueAtTime(volume, time + 0.008);
    node.gain.exponentialRampToValueAtTime(0.001, time + duration);
    node.connect(output);
    return node;
  }

  function tone(time, wave, startHz, endHz, duration, volume) {
    const oscillator = context.createOscillator();
    const gain = envelope(time, duration, volume);
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(startHz, time);
    oscillator.frequency.exponentialRampToValueAtTime(endHz, time + duration);
    oscillator.connect(gain);
    oscillator.onended = () => gain.disconnect();
    oscillator.start(time);
    oscillator.stop(time + duration + 0.012);
  }

  function noise(time, filterType, startHz, endHz, duration, volume) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = envelope(time, duration, volume);
    source.buffer = noiseBuffer;
    filter.type = filterType;
    filter.frequency.setValueAtTime(startHz, time);
    filter.frequency.exponentialRampToValueAtTime(endHz, time + duration);
    source.connect(filter);
    filter.connect(gain);
    source.onended = () => gain.disconnect();
    source.start(time);
    source.stop(time + duration + 0.012);
  }

  const cues = {
    pull(time) {
      tone(time, "triangle", 210, 420, 0.12, 0.105);
      noise(time, "bandpass", 420, 670, 0.10, 0.045);
    },
    launch(time) {
      tone(time, "triangle", 485, 138, 0.18, 0.19);
      noise(time, "bandpass", 1700, 230, 0.19, 0.17);
      tone(time + 0.025, "sine", 125, 68, 0.14, 0.13);
    },
    hit(time) {
      noise(time, "lowpass", 740, 180, 0.13, 0.19);
      tone(time, "sine", 114, 46, 0.15, 0.17);
    },
    break(time) {
      noise(time, "bandpass", 1500, 490, 0.11, 0.14);
      noise(time + 0.028, "highpass", 3400, 890, 0.12, 0.07);
    },
    blast(time) {
      noise(time, "lowpass", 1900, 65, 0.52, 0.40);
      tone(time, "sine", 121, 28, 0.39, 0.40);
      noise(time + 0.075, "bandpass", 310, 99, 0.39, 0.18);
    },
    pig(time) {
      tone(time, "triangle", 490, 285, 0.10, 0.14);
      tone(time + 0.05, "triangle", 760, 360, 0.17, 0.13);
    },
    ability(time) {
      tone(time, "triangle", 320, 735, 0.15, 0.15);
      tone(time + 0.055, "triangle", 525, 1110, 0.16, 0.10);
      noise(time, "bandpass", 750, 2900, 0.19, 0.08);
    },
    win(time) {
      [392, 494, 587, 784].forEach((pitch, index) => {
        tone(time + index * 0.09, "triangle", pitch, pitch, 0.31, 0.16);
      });
      tone(time + 0.27, "sine", 196, 196, 0.48, 0.18);
    },
    loss(time) {
      [329, 247, 174].forEach((pitch, index) => {
        tone(time + index * 0.12, "triangle", pitch, pitch * 0.97, 0.27, 0.12);
      });
    },
    click(time) {
      tone(time, "sine", 640, 420, 0.07, 0.09);
    },
  };

  function play(name) {
    if (muted || !context || typeof name !== "string") return false;
    const cue = Object.hasOwn(aliases, name) ? aliases[name] : name;
    if (!Object.hasOwn(cues, cue)) return false;
    if (context.state !== "running") {
      if (unlocking) pendingCue = cue;
      return false;
    }
    const time = context.currentTime;
    const previous = lastPlayed.get(cue) ?? -Infinity;
    if (time - previous < (cueCooldowns[cue] ?? 0.032)) return false;
    lastPlayed.set(cue, time);
    cues[cue](time);
    return true;
  }

  window.BirdAudio = { unlock, play, setMuted, isMuted: () => muted };
})();
