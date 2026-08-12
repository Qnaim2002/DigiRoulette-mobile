// ============================================================
// CINEMATIC AUDIO ENGINE v2 — Web Audio API
// World: adventurous/heroic march
// Battle: intense/chaotic heavy rhythm
// Boss: dark/ominous Chronomon DM theme
// ============================================================
class AudioManager {
  constructor() {
    this.ctx = null;
    this.bgmInterval = null;
    this.bgmInterval2 = null;
    this.currentBgmType = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this._musicVolume = 1.0;
    this._sfxVolume = 1.0;
    this._muted = false;
    this._activeBus = null; // set only for the synchronous span of a BGM beat, so SFX never leaks onto the music bus
    this._pendingSwitchTimeout = null; // handle for a scheduled-but-not-yet-fired crossfade switch (see startBGM)
    // ✅ BUGFIX (music overlap): every stopBGM()/switchNow() bumps this. Each playBeat closure
    // captures the generation it was born with and checks it on every tick — if a stale
    // interval is ever still alive when a newer track starts (racing timeouts, a leftover
    // interval from a fast lock/unlock cycle, etc.), it goes silent instead of writing sound
    // into the (now shared, live-referenced) musicGain node. This is the definitive guard:
    // it doesn't matter WHY two loops might exist, only the current generation is ever heard.
    this._bgmGeneration = 0;
    // ✅ HAPTICS: independent on/off flag (separate from audio mute — a player might want
    // buzzing feedback with SFX muted, or vice versa), backed by the Settings modal toggle.
    this._hapticsEnabled = true;
    // ✅ OSCILLATOR/NOISE POOLING: OscillatorNode and AudioBufferSourceNode are single-use by
    // spec — once started+stopped they can never be restarted, so there is no way to literally
    // pool and reuse THOSE nodes (every _osc call must create a fresh one; that part of the
    // "GC pressure" is unavoidable and inherent to the Web Audio API). What CAN be pooled is
    // the underlying AudioBuffer that _noise() feeds into its (still fresh, still single-use)
    // BufferSourceNode: an AudioBuffer is just read-only PCM data, and the exact same buffer
    // can safely back many different source nodes at once. Previously every _noise() call —
    // and it's called constantly: every hit, crit, miss, kick/snare/hihat tick in every BGM
    // track — allocated a new Float32Array and ran a Math.random() fill loop over it. This
    // cache generates each distinct duration bucket's noise buffer ONCE and reuses it for
    // every subsequent call at that duration, cutting the actual allocation+fill cost (the
    // real source of GC churn here) down to a handful of one-time buffers for the whole
    // session instead of thousands over a long battle.
    this._noiseBufferCache = new Map();
    // ✅ Tracks the last track REQUESTED via startBGM (distinct from `currentBgmType`, which
    // stopBGM() clears back to null) — used by things like the evolution overlay and the
    // tab-visibility resume logic to know what to switch back to once a temporary track
    // (e.g. "EVOLUTION") or a background pause is over. Previously this lived as a
    // module-level variable monkey-patched onto sfx.startBGM from GameScreen.jsx; it's a
    // property of the audio engine's own state, so it belongs here instead.
    this._lastRequestedTrack = null;
  }

  getLastRequestedTrack() {
    return this._lastRequestedTrack;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this._muted ? 0 : 1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this._musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this._sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  // ── INTERNAL HELPERS ──────────────────────────────────────
  // Both helpers route through `_activeBus` when set (only true during a BGM beat's
  // synchronous execution — see startBGM), otherwise default to the SFX bus.

  _osc(type, freq, startTime, duration, gainVal, destination, freqEnd = null) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, startTime + duration);
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(destination || this._activeBus || this.sfxGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  // ✅ POOLED: returns a shared, pre-generated AudioBuffer for the requested duration bucket
  // (rounded UP to the nearest 10ms so the buffer is never shorter than what's needed — a
  // short bucket would silently truncate the noise burst). Reused across every _noise() call
  // at that duration instead of regenerating the random-fill each time. Bounded so a future
  // caller passing wildly varied durations can't grow this unboundedly.
  _getNoiseBuffer(duration) {
    const bucketMs = Math.max(10, Math.ceil((duration * 1000) / 10) * 10);
    let buffer = this._noiseBufferCache.get(bucketMs);
    if (!buffer) {
      const bufferSize = Math.ceil(this.ctx.sampleRate * (bucketMs / 1000));
      buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      if (this._noiseBufferCache.size >= 60) {
        this._noiseBufferCache.delete(this._noiseBufferCache.keys().next().value);
      }
      this._noiseBufferCache.set(bucketMs, buffer);
    }
    return buffer;
  }

  _noise(startTime, duration, gainVal, cutoff = 800) {
    const buffer = this._getNoiseBuffer(duration);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, startTime);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this._activeBus || this.sfxGain);
    source.start(startTime);
    source.stop(startTime + duration + 0.01);
  }

  // ── BGM ───────────────────────────────────────────────────

  startBGM(type = "WORLD") {
    this.init();
    this._lastRequestedTrack = type;
    // ✅ BUGFIX: cancel any crossfade transition that a PREVIOUS startBGM call scheduled but
    // that hasn't fired yet. Without this, two startBGM calls close together (e.g. the
    // evolution overlay switching to "EVOLUTION" and then restoring the previous track soon
    // after) could each schedule their own delayed switchNow — and when both eventually fired,
    // one would land after the other and silently re-trigger stopBGM/start again, which is
    // what caused tracks to audibly restart or briefly overlap instead of landing cleanly on
    // whichever track was actually requested last.
    if (this._pendingSwitchTimeout) {
      clearTimeout(this._pendingSwitchTimeout);
      this._pendingSwitchTimeout = null;
    }
    if (this.currentBgmType === type) return;

    const switchNow = () => {
      this._pendingSwitchTimeout = null;
      this.stopBGM();
      this.currentBgmType = type;
      let beat = 0;
      // ✅ stopBGM() just bumped _bgmGeneration — this closure's copy is now the definitive
      // "am I still the current track?" token for every playBeat defined below.
      const myGeneration = this._bgmGeneration;

      if (type === "WORLD") {
      // ✅ Adventurous/heroic upbeat march
      // C major pentatonic march melody with strong bass pulse
      const marchMelody = [
        261.63, 329.63, 392.00, 523.25,
        392.00, 440.00, 392.00, 329.63,
        293.66, 349.23, 440.00, 523.25,
        493.88, 440.00, 392.00, 329.63
      ];
      const marchBass = [
        130.81, 130.81, 196.00, 196.00,
        174.61, 174.61, 130.81, 130.81,
        146.83, 146.83, 220.00, 220.00,
        164.81, 164.81, 130.81, 130.81
      ];
      const playBeat = () => {
        // ✅ Stale-interval guard — see _bgmGeneration note in constructor
        if (myGeneration !== this._bgmGeneration) { clearInterval(this.bgmInterval); return; }
        this._activeBus = this.musicGain;
        const t = this.ctx.currentTime;
        const idx = beat % marchMelody.length;

        // Heroic square wave melody — bold and bright
        this._osc('square', marchMelody[idx], t, 0.28, 0.06);
        // Triangle harmony a fifth above every 2nd beat
        if (beat % 2 === 0) {
          this._osc('triangle', marchMelody[idx] * 1.5, t, 0.20, 0.03);
        }
        // Strong march bass — triangle for warmth
        this._osc('triangle', marchBass[idx], t, 0.38, 0.08);
        // Sub bass on beat 1 and beat 3 (every 2 beats of 4-beat cycle)
        if (beat % 2 === 0) {
          this._osc('sine', marchBass[idx] * 0.5, t, 0.25, 0.10);
        }
        // March snare-like noise on beats 2 and 4
        if (beat % 4 === 1 || beat % 4 === 3) {
          this._noise(t, 0.06, 0.05, 2000);
        }
        // Bass drum kick on beat 1
        if (beat % 4 === 0) {
          this._osc('sine', 80, t, 0.15, 0.12, null, 30);
          this._noise(t, 0.04, 0.04, 200);
        }
        beat++;
        this._activeBus = null;
      };
      this.bgmInterval = setInterval(playBeat, 280);

    } else if (type === "BATTLE") {
      // ✅ Driving, moderately-paced intense battle theme — a minor-key riff over a punchy
      // kick/snare/hihat groove. Real energy and drive without being chaotic (too fast) or
      // sluggish (too slow).
      const driveMelody = [
        293.66, 349.23, 392.00, 349.23,
        293.66, 261.63, 293.66, 349.23
      ];
      const driveBass = [
        73.42, 73.42, 87.31, 73.42,
        65.41, 65.41, 73.42, 87.31
      ];
      const playBeat = () => {
        // ✅ Stale-interval guard — see _bgmGeneration note in constructor
        if (myGeneration !== this._bgmGeneration) { clearInterval(this.bgmInterval); return; }
        this._activeBus = this.musicGain;
        const t = this.ctx.currentTime;
        const idx = beat % driveMelody.length;

        // Driving minor-key riff — the main intensity carrier
        this._osc('sawtooth', driveMelody[idx], t, 0.22, 0.08);
        // Punchy square doubling for extra bite on strong beats
        if (beat % 2 === 0) {
          this._osc('square', driveMelody[idx], t, 0.16, 0.045);
        }

        // Syncopated bass line driving underneath
        this._osc('sawtooth', driveBass[idx], t, 0.24, 0.11);
        this._osc('sine', driveBass[idx] * 0.5, t, 0.22, 0.09);

        // Steady kick every beat for momentum
        this._osc('sine', 100, t, 0.14, 0.16, null, 32);
        this._noise(t, 0.04, 0.06, 250);

        // Snare on the backbeat (2 and 4)
        if (beat % 4 === 1 || beat % 4 === 3) {
          this._noise(t, 0.07, 0.11, 2800);
          this._osc('square', 190, t, 0.05, 0.05);
        }

        // Hi-hat on the offbeat for rhythmic drive
        if (beat % 2 === 1) this._noise(t, 0.025, 0.035, 6500);

        // Punchy rising accent stab every 8 beats
        if (beat % 8 === 6) {
          this._osc('sawtooth', driveMelody[idx] * 1.5, t, 0.20, 0.07, null, driveMelody[idx] * 2.2);
          this._noise(t, 0.10, 0.07, 1800);
        }

        beat++;
        this._activeBus = null;
      };
      this.bgmInterval = setInterval(playBeat, 300);

    } else if (type === "BOSS") {
      // ✅ Chronomon DM — dark, ominous, end-of-world feel
      // Diminished 7th chord progression, deep rumbling, dramatic stabs
      const darkMelody = [
        110.00, 116.54, 98.00, 103.83,
        92.50,  87.31,  98.00, 103.83,
        110.00, 92.50,  87.31, 116.54,
        103.83, 98.00,  92.50, 87.31
      ];
      const voidBass = [
        36.71, 36.71, 34.65, 34.65,
        32.70, 32.70, 36.71, 36.71,
        30.87, 30.87, 32.70, 32.70,
        34.65, 34.65, 36.71, 30.87
      ];
      const playBeat = () => {
        // ✅ Stale-interval guard — see _bgmGeneration note in constructor
        if (myGeneration !== this._bgmGeneration) { clearInterval(this.bgmInterval); return; }
        this._activeBus = this.musicGain;
        const t = this.ctx.currentTime;
        const idx = beat % darkMelody.length;

        // Ominous dark melody — sawtooth with downward bend
        this._osc('sawtooth', darkMelody[idx], t, 0.30, 0.07, null, darkMelody[idx] * 0.88);
        // Dark square layer
        this._osc('square', darkMelody[idx] * 0.5, t, 0.28, 0.05);
        // Deep void bass — layered sine + saw
        this._osc('sine',     voidBass[idx], t, 0.55, 0.16);
        this._osc('sawtooth', voidBass[idx], t, 0.50, 0.06);
        // Dramatic orchestral stab every 4 beats
        if (beat % 4 === 0) {
          this._osc('sawtooth', darkMelody[idx] * 2,  t, 0.20, 0.10);
          this._osc('square',   darkMelody[idx] * 1.5, t, 0.18, 0.08);
          this._noise(t, 0.14, 0.14, 1200);
        }
        // Doom kick — very low and heavy
        if (beat % 4 === 0) {
          this._osc('sine', 60, t, 0.20, 0.18, null, 18);
          this._noise(t, 0.06, 0.10, 250);
        }
        // Dread snare on 3
        if (beat % 4 === 2) {
          this._noise(t, 0.10, 0.12, 3500);
          this._osc('sine', 100, t, 0.08, 0.08);
        }
        // Unsettling hi-hat
        if (beat % 2 === 1) this._noise(t, 0.04, 0.03, 5000);
        beat++;
        this._activeBus = null;
      };
      this.bgmInterval = setInterval(playBeat, 200);

      } else if (type === "MENU") {
      // ✅ Calm, welcoming menu theme — a gentle chime arpeggio over a soft sustained pad.
      // Much slower and airier than the World march since there's no urgency on the menu.
      const chimeArpeggio = [
        523.25, 659.25, 783.99, 659.25,
        587.33, 698.46, 880.00, 698.46,
        523.25, 659.25, 783.99, 987.77,
        880.00, 783.99, 659.25, 587.33
      ];
      const padBass = [
        130.81, 130.81, 146.83, 146.83,
        164.81, 164.81, 130.81, 130.81
      ];
      const playBeat = () => {
        // ✅ Stale-interval guard — see _bgmGeneration note in constructor
        if (myGeneration !== this._bgmGeneration) { clearInterval(this.bgmInterval); return; }
        this._activeBus = this.musicGain;
        const t = this.ctx.currentTime;
        const idx = beat % chimeArpeggio.length;
        const bassIdx = beat % padBass.length;

        // Soft chime arpeggio — sine/triangle blend for a warm, bell-like tone
        this._osc('sine', chimeArpeggio[idx], t, 0.55, 0.045);
        this._osc('triangle', chimeArpeggio[idx], t, 0.35, 0.025);

        // Gentle sustained pad underneath, only changing every 2 beats
        if (beat % 2 === 0) {
          this._osc('sine', padBass[bassIdx], t, 0.9, 0.05);
          this._osc('triangle', padBass[bassIdx] * 2, t, 0.7, 0.02);
        }

        // A soft sparkle every 8 beats for a touch of magic
        if (beat % 8 === 0) {
          this._osc('sine', chimeArpeggio[idx] * 2, t, 0.4, 0.03);
        }

        beat++;
        this._activeBus = null;
      };
      this.bgmInterval = setInterval(playBeat, 420);

      } else if (type === "EVOLUTION") {
      // ✅ Bright, rising transformation theme — plays only while the full-screen evolution
      // overlay is up (see EvolutionOverlay in GameScreen.jsx). A driving pulse under an
      // ascending bell arpeggio, distinct from the one-shot playTransformSFX() hit so the two
      // layer cleanly instead of clashing.
      const evoArp = [
        392.00, 523.25, 659.25, 783.99,
        659.25, 783.99, 987.77, 1174.66,
        523.25, 659.25, 783.99, 987.77,
        783.99, 987.77, 1174.66, 1396.91
      ];
      const evoPulseBass = [
        196.00, 196.00, 246.94, 246.94,
        261.63, 261.63, 329.63, 329.63
      ];
      const playBeat = () => {
        // ✅ Stale-interval guard — see _bgmGeneration note in constructor
        if (myGeneration !== this._bgmGeneration) { clearInterval(this.bgmInterval); return; }
        this._activeBus = this.musicGain;
        const t = this.ctx.currentTime;
        const idx = beat % evoArp.length;
        const bassIdx = beat % evoPulseBass.length;

        // Ascending bell-like arpeggio — the main "reconstruction" sparkle
        this._osc('triangle', evoArp[idx], t, 0.30, 0.06);
        this._osc('sine', evoArp[idx] * 2, t, 0.22, 0.03);

        // Driving pulse underneath to keep momentum through the vortex buildup
        if (beat % 2 === 0) {
          this._osc('sawtooth', evoPulseBass[bassIdx], t, 0.26, 0.07);
        }
        if (beat % 4 === 0) {
          this._osc('sine', evoPulseBass[bassIdx] * 0.5, t, 0.30, 0.09);
        }

        // Sparkle accent every 8 beats
        if (beat % 8 === 7) {
          this._osc('sine', evoArp[idx] * 3, t, 0.18, 0.05);
        }

        beat++;
        this._activeBus = null;
      };
      this.bgmInterval = setInterval(playBeat, 190);

      } else if (type === "SHOP") {
      // ✅ Digital Shop theme — "Cozy Marketplace": warm, unhurried bell-like arpeggio over a
      // gentle sustained bass pad, with a soft "register ding" accent every 8 beats.
      const shopArp = [
        392.00, 493.88, 587.33, 493.88,
        440.00, 523.25, 659.25, 523.25,
        392.00, 493.88, 587.33, 698.46,
        659.25, 587.33, 493.88, 440.00
      ];
      const shopBass = [
        130.81, 130.81, 146.83, 146.83,
        164.81, 164.81, 130.81, 130.81
      ];
      const playBeat = () => {
        if (myGeneration !== this._bgmGeneration) { clearInterval(this.bgmInterval); return; }
        this._activeBus = this.musicGain;
        const t = this.ctx.currentTime;
        const idx = beat % shopArp.length;
        const bassIdx = beat % shopBass.length;

        // Warm bell-like arpeggio — the main "browsing the stalls" melody
        this._osc('sine', shopArp[idx], t, 0.42, 0.05);
        this._osc('triangle', shopArp[idx], t, 0.30, 0.03);

        // Gentle sustained pad, changing every 2 beats to stay unhurried
        if (beat % 2 === 0) {
          this._osc('sine', shopBass[bassIdx], t, 0.75, 0.06);
          this._osc('triangle', shopBass[bassIdx] * 2, t, 0.55, 0.02);
        }

        // Soft register-ding every 8 beats — a little "welcome in" chime
        if (beat % 8 === 0) {
          this._osc('sine', shopArp[idx] * 2, t, 0.35, 0.035);
        }

        beat++;
        this._activeBus = null;
      };
      this.bgmInterval = setInterval(playBeat, 360);

      }

      // Smoothly fade the new track in instead of snapping straight to full volume
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(0.0001, now);
      this.musicGain.gain.linearRampToValueAtTime(this._musicVolume, now + 0.3);
    };

    if (this.currentBgmType) {
      // ✅ Crossfade instead of a hard cut: fade the current track out, then switch and fade
      // the new one in. (True overlapping playback would clash since each theme has its own
      // key/rhythm — a quick fade-out/fade-in reads as a smooth transition, not an abrupt cut.)
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
      this.musicGain.gain.linearRampToValueAtTime(0.0001, now + 0.25);
      this._pendingSwitchTimeout = setTimeout(switchNow, 260);
    } else {
      switchNow();
    }
  }

  stopBGM() {
    if (this._pendingSwitchTimeout) { clearTimeout(this._pendingSwitchTimeout); this._pendingSwitchTimeout = null; }
    if (this.bgmInterval)  { clearInterval(this.bgmInterval);  this.bgmInterval  = null; }
    if (this.bgmInterval2) { clearInterval(this.bgmInterval2); this.bgmInterval2 = null; }
    this.currentBgmType = null;
    // ✅ Bump generation FIRST — this is what actually silences any interval that survives
    // the clearInterval calls above for whatever reason (see constructor note).
    this._bgmGeneration++;
    // ✅ BUGFIX (music overlap): clearInterval only stops FUTURE notes from being scheduled —
    // it does nothing to oscillators already ringing on musicGain (some beats schedule notes
    // up to ~0.9s long, e.g. MENU's pad bass). On mobile this bit hardest via the app's
    // visibilitychange handler: backgrounding the tab (locking the screen, swiping away,
    // a notification banner) calls stopBGM() then startBGM() again on return. If any old
    // notes were still ringing on musicGain when the new track's fade-in ramped that same
    // node back up, both tracks became audible together. Swapping in a brand-new musicGain
    // node here permanently severs the old notes from the speakers, so no future startBGM
    // call — no matter how soon it fires — can ever resurrect them.
    this._resetMusicBus();
  }

  // ✅ Creates a fresh musicGain node and reconnects it to masterGain, silenced at 0 until the
  // next startBGM() ramps it up. Called from stopBGM() so every track transition starts from
  // a bus with zero leftover audio on it.
  _resetMusicBus() {
    if (!this.ctx) return;
    if (this.musicGain) {
      try { this.musicGain.disconnect(); } catch {}
    }
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);
  }

  // ── SFX ───────────────────────────────────────────────────

  // ✅ UNIVERSAL BUTTON CLICK — a short, subtle tactile "tick" fired on every <button> press
  // across the whole app (wired up via a single global listener in GameScreen.jsx). Kept
  // deliberately quiet/brief so it layers cleanly under whatever more specific SFX a given
  // button might already trigger (potion chime, buy sound, evolve SFX, etc.) instead of
  // clashing with it.
  playUIClick() {
    this.init();
    const t = this.ctx.currentTime;
    this._osc('triangle', 950, t, 0.035, 0.045, null, 650);
    this._osc('sine', 1900, t, 0.02, 0.02);
  }

  playTick(frequency = 800) {
    this.init();
    const t = this.ctx.currentTime;
    this._osc('triangle', frequency, t, 0.04, 0.07);
    this._osc('sine', frequency * 0.5, t, 0.03, 0.04);
  }

  playHit() {
    this.init();
    const t = this.ctx.currentTime;
    this._osc('sawtooth', 180, t, 0.08, 0.34, null, 45);
    this._osc('sine', 90, t, 0.12, 0.42, null, 40);
    this._noise(t, 0.06, 0.16);
  }

  playCriticalHit() {
    this.init();
    const t = this.ctx.currentTime;
    this._osc('sawtooth', 80,  t, 0.40, 0.44, null, 35);
    this._osc('square',   160, t, 0.35, 0.38, null, 60);
    this._osc('sawtooth', 400, t, 0.25, 0.38, null, 1200);
    this._noise(t, 0.15, 0.30);
    this._osc('sine', 40, t, 0.20, 0.48, null, 20);
    setTimeout(() => {
      if (!this.ctx) return;
      const t2 = this.ctx.currentTime;
      this._osc('sawtooth', 120, t2, 0.25, 0.28, null, 50);
      this._noise(t2, 0.08, 0.16);
    }, 180);
  }

  playMiss() {
    this.init();
    const t = this.ctx.currentTime;
    this._osc('sine',     400, t, 0.22, 0.08, null, 80);
    this._osc('triangle', 300, t, 0.18, 0.06, null, 60);
  }

  playPotionSFX() {
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        this._osc('sine',     freq,       t, 0.20, 0.07);
        this._osc('triangle', freq * 1.5, t, 0.15, 0.04);
      }, i * 55);
    });
  }

  playItemSFX() {
    this.init();
    const t = this.ctx.currentTime;
    this._osc('sine',     300, t, 0.35, 0.12, null, 1400);
    this._osc('triangle', 600, t, 0.25, 0.08, null, 2000);
    setTimeout(() => {
      if (!this.ctx) return;
      const t2 = this.ctx.currentTime;
      this._osc('sine', 1200, t2, 0.15, 0.06);
      this._osc('sine', 1600, t2, 0.12, 0.05);
    }, 200);
  }

  playTransformSFX() {
    this.init();
    const t = this.ctx.currentTime;
    this._osc('sawtooth', 80,  t, 0.60, 0.15, null, 800);
    this._osc('square',   160, t, 0.55, 0.12, null, 1200);
    this._osc('sine',     200, t, 0.60, 0.10, null, 1600);
    this._noise(t, 0.20, 0.18);
    this._osc('sine', 40, t, 0.40, 0.18);
    setTimeout(() => {
      if (!this.ctx) return;
      const t2 = this.ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq) => {
        this._osc('triangle', freq, t2, 0.40, 0.09);
      });
    }, 500);
  }

  // ============================================================
  // ✅ PER-TIER EVOLUTION SFX — one distinct one-shot per evolution bracket,
  // escalating in weight/complexity as the tier climbs. Dispatched via
  // playEvolutionTierSFX(tier) using the same lowercase tier keys the game
  // hook computes from the pre-evolution Digimon's level (baby/child/adult/
  // perfect/ultimate/ultra). Falls back to the generic playTransformSFX for
  // any unrecognized tier so older callers never break.
  // ============================================================

  // Baby → Child: light, cute, high-pitched sparkle. Short and gentle.
  playEvoBabyToChild() {
    this.init();
    const t = this.ctx.currentTime;
    this._osc('sine', 700, t, 0.18, 0.10, null, 1400);
    this._osc('triangle', 1050, t, 0.14, 0.06, null, 1800);
    this._noise(t, 0.06, 0.05, 3000);
    [1046.50, 1318.51, 1568.00].forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const t2 = this.ctx.currentTime;
        this._osc('sine', freq, t2, 0.16, 0.06);
      }, 120 + i * 70);
    });
  }

  // Child → Adult: brighter, more energetic, a confident little fanfare.
  playEvoChildToAdult() {
    this.init();
    const t = this.ctx.currentTime;
    this._osc('sawtooth', 130, t, 0.35, 0.14, null, 500);
    this._osc('square', 260, t, 0.30, 0.10, null, 900);
    this._noise(t, 0.10, 0.10);
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const t2 = this.ctx.currentTime;
        this._osc('triangle', freq, t2, 0.24, 0.08);
        this._osc('sine', freq * 2, t2, 0.18, 0.04);
      }, 150 + i * 90);
    });
  }

  // Adult → Perfect: powerful, a bit of grit/distortion, longer buildup.
  playEvoAdultToPerfect() {
    this.init();
    const t = this.ctx.currentTime;
    this._osc('sawtooth', 90, t, 0.45, 0.20, null, 400);
    this._osc('square', 180, t, 0.40, 0.14, null, 700);
    this._osc('sawtooth', 360, t, 0.30, 0.09, null, 1400);
    this._noise(t, 0.16, 0.16);
    setTimeout(() => {
      if (!this.ctx) return;
      const t2 = this.ctx.currentTime;
      [392.00, 493.88, 587.33, 783.99].forEach((freq) => {
        this._osc('triangle', freq, t2, 0.35, 0.08);
      });
      this._noise(t2, 0.10, 0.10);
    }, 260);
  }

  // Perfect → Ultimate: dramatic, bass-heavy, layered chord stabs.
  playEvoPerfectToUltimate() {
    this.init();
    const t = this.ctx.currentTime;
    this._osc('sawtooth', 65, t, 0.55, 0.24, null, 300);
    this._osc('square', 130, t, 0.50, 0.18, null, 550);
    this._osc('sine', 45, t, 0.55, 0.22, null, 220);
    this._noise(t, 0.20, 0.18);
    setTimeout(() => {
      if (!this.ctx) return;
      const t2 = this.ctx.currentTime;
      [220.00, 277.18, 329.63, 440.00, 554.37].forEach((freq) => {
        this._osc('sawtooth', freq, t2, 0.40, 0.08);
      });
      this._noise(t2, 0.14, 0.14, 2200);
    }, 320);
    setTimeout(() => {
      if (!this.ctx) return;
      const t3 = this.ctx.currentTime;
      this._osc('sine', 55, t3, 0.35, 0.20, null, 25);
      this._noise(t3, 0.08, 0.10);
    }, 620);
  }

  // Ultimate → Ultra: epic, big multi-layer impact with a real climax hit.
  playEvoUltimateToUltra() {
    this.init();
    const t = this.ctx.currentTime;
    this._osc('sawtooth', 50, t, 0.65, 0.28, null, 200);
    this._osc('square', 100, t, 0.60, 0.20, null, 400);
    this._osc('sawtooth', 400, t, 0.35, 0.10, null, 1800);
    this._noise(t, 0.25, 0.22);
    setTimeout(() => {
      if (!this.ctx) return;
      const t2 = this.ctx.currentTime;
      [164.81, 207.65, 246.94, 329.63, 392.00, 523.25].forEach((freq) => {
        this._osc('sawtooth', freq, t2, 0.45, 0.09);
      });
      this._noise(t2, 0.18, 0.18, 2600);
    }, 300);
    setTimeout(() => {
      if (!this.ctx) return;
      // Climax hit
      const t3 = this.ctx.currentTime;
      this._osc('sine', 45, t3, 0.55, 0.30, null, 18);
      this._osc('square', 90, t3, 0.40, 0.20, null, 40);
      this._noise(t3, 0.22, 0.24, 3200);
    }, 680);
  }

  // Ultra → Ultra: a "reforge" rather than a climb — shimmering, ethereal,
  // cosmic timbre distinct from every tier above (no low-end climax stab).
  playEvoUltraToUltra() {
    this.init();
    const t = this.ctx.currentTime;
    this._osc('sine', 300, t, 0.50, 0.14, null, 1200);
    this._osc('triangle', 600, t, 0.45, 0.10, null, 2400);
    this._noise(t, 0.20, 0.10, 5000);
    const shimmer = [1046.50, 1244.51, 1567.98, 1864.66, 2093.00];
    shimmer.forEach((freq, i) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const t2 = this.ctx.currentTime;
        this._osc('sine', freq, t2, 0.30, 0.05);
        this._osc('triangle', freq * 0.5, t2, 0.30, 0.04);
      }, 80 + i * 100);
    });
    setTimeout(() => {
      if (!this.ctx) return;
      const t3 = this.ctx.currentTime;
      this._osc('sine', 130, t3, 0.40, 0.14, null, 90);
      this._noise(t3, 0.10, 0.08, 4200);
    }, 560);
  }

  // Ultra → Ultra+: the new capstone evolution — the single most epic one-shot in the game.
  // Distinct from the Ultra→Ultra "reforge" shimmer: this one climaxes with a huge multi-hit
  // stack instead of staying ethereal, so it reads as a genuine final tier breakthrough.
  playEvoUltraToOmega() {
    this.init();
    const t = this.ctx.currentTime;
    this._osc('sawtooth', 40, t, 0.70, 0.30, null, 160);
    this._osc('square', 80, t, 0.65, 0.22, null, 320);
    this._osc('sawtooth', 320, t, 0.40, 0.10, null, 2200);
    this._noise(t, 0.28, 0.24);
    setTimeout(() => {
      if (!this.ctx) return;
      const t2 = this.ctx.currentTime;
      [130.81, 164.81, 196.00, 261.63, 329.63, 392.00, 523.25].forEach((freq) => {
        this._osc('sawtooth', freq, t2, 0.50, 0.08);
      });
      this._noise(t2, 0.20, 0.20, 3000);
    }, 320);
    setTimeout(() => {
      if (!this.ctx) return;
      // First climax hit
      const t3 = this.ctx.currentTime;
      this._osc('sine', 42, t3, 0.55, 0.28, null, 16);
      this._osc('square', 84, t3, 0.42, 0.20, null, 36);
      this._noise(t3, 0.22, 0.24, 3400);
    }, 660);
    setTimeout(() => {
      if (!this.ctx) return;
      // Second, final climax hit — the Omega breakthrough
      const t4 = this.ctx.currentTime;
      this._osc('sine', 35, t4, 0.75, 0.34, null, 12);
      this._osc('sawtooth', 70, t4, 0.55, 0.24, null, 24);
      [659.25, 830.61, 987.77].forEach((freq) => {
        this._osc('triangle', freq, t4, 0.60, 0.07);
      });
      this._noise(t4, 0.30, 0.28, 4000);
    }, 940);
  }

  // Dispatcher — normalize + route to the correct one-shot, falling back to
  // the original generic transform sound for any unknown/legacy tier value.
  playEvolutionTierSFX(tier) {
    const key = (tier || "").toLowerCase().trim();
    const map = {
      baby: this.playEvoBabyToChild,
      child: this.playEvoChildToAdult,
      adult: this.playEvoAdultToPerfect,
      perfect: this.playEvoPerfectToUltimate,
      ultimate: this.playEvoUltimateToUltra,
      ultra: this.playEvoUltraToUltra,
      ultraplus: this.playEvoUltraToOmega,
    };
    const fn = map[key];
    if (fn) fn.call(this);
    else this.playTransformSFX();
  }

  playVictory() {
    this.init();
    this.stopBGM();
    const fanfare = [
      {freq: 261.63, delay: 0},
      {freq: 329.63, delay: 100},
      {freq: 392.00, delay: 200},
      {freq: 523.25, delay: 300},
      {freq: 659.25, delay: 380},
      {freq: 783.99, delay: 440},
    ];
    fanfare.forEach(({freq, delay}) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        this._osc('square',   freq,     t, 0.55, 0.14);
        this._osc('triangle', freq * 2, t, 0.40, 0.08);
        this._osc('sine',     freq,     t, 0.55, 0.10);
      }, delay);
    });
    setTimeout(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [261.63, 329.63, 392.00, 523.25].forEach((freq) => {
        this._osc('sine',     freq,     t, 0.80, 0.14);
        this._osc('triangle', freq * 2, t, 0.80, 0.06);
      });
      this._noise(t, 0.15, 0.08);
    }, 600);
  }

  playGameOver() {
    this.init();
    this.stopBGM();
    const t = this.ctx.currentTime;
    this._osc('sawtooth', 220, t, 1.20, 0.28, null, 27.5);
    this._osc('square',   110, t, 1.00, 0.22, null, 30);
    this._osc('sine',     55,  t, 1.20, 0.30, null, 20);
    this._noise(t, 0.40, 0.18);
    this._osc('sine', 40, t + 0.3, 0.80, 0.20, null, 18);
    setTimeout(() => {
      if (!this.ctx) return;
      const t2 = this.ctx.currentTime;
      this._noise(t2, 0.25, 0.20);
      this._osc('sine', 30, t2, 0.40, 0.25);
    }, 700);
  }

  // ✅ One-shot low-HP warning thump — a quiet double heartbeat, triggered once per "low HP episode"
  playLowHpWarning() {
    this.init();
    const t = this.ctx.currentTime;
    this._osc('sine', 55, t,        0.25, 0.22, null, 30);
    this._osc('sine', 55, t + 0.18, 0.20, 0.18, null, 28);
    this._noise(t, 0.08, 0.08, 400);
  }

  // ✅ Settings panel: independent Music and SFX volume controls (0–1), plus a mute toggle
  // that mutes everything (via masterGain) without disturbing the two individual levels.
  setMusicVolume(vol) {
    this.init();
    const clamped = Math.max(0, Math.min(1, vol));
    this._musicVolume = clamped;
    this.musicGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
  }

  setSfxVolume(vol) {
    this.init();
    const clamped = Math.max(0, Math.min(1, vol));
    this._sfxVolume = clamped;
    this.sfxGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
  }

  toggleMute() {
    this.init();
    this._muted = !this._muted;
    this.masterGain.gain.setValueAtTime(this._muted ? 0 : 1.0, this.ctx.currentTime);
    return this._muted;
  }

  // ============================================================
  // ✅ HAPTIC FEEDBACK — thin wrapper around navigator.vibrate(), gated by a Settings toggle
  // and by feature detection (desktop browsers / iOS Safari don't expose the Vibration API,
  // so this silently no-ops there rather than throwing). Kept independent of audio settings:
  // haptics are a physical-device concern, not a sound-mixing one.
  // ============================================================
  setHapticsEnabled(enabled) {
    this._hapticsEnabled = !!enabled;
  }

  vibrate(pattern) {
    if (!this._hapticsEnabled) return;
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    try { navigator.vibrate(pattern); } catch {}
  }

  // Short sharp double-buzz for a critical hit landing — lengthened/intensified so it
  // reads as a real hit even one-handed or in a pocket.
  hapticCrit() {
    this.vibrate([45, 25, 45, 25, 60]);
  }

  // Playful ramping buzz for a successful Wild/Legendary capture.
  hapticCapture() {
    this.vibrate([25, 15, 25, 15, 25, 15, 80]);
  }

  // ✅ NEW: a heavy single "thud" for a party member fainting. Long, low-frequency-feeling
  // pulses (as opposed to the quick multi-buzz sequences used elsewhere) so it reads as bad
  // news through touch alone, distinct from every other haptic in the game.
  hapticFaint() {
    this.vibrate([70, 40, 100]);
  }

  // ✅ Escalates in length/complexity with tier, mirroring playEvolutionTierSFX's own
  // per-tier escalation — so the buzz pattern itself communicates "how big" the evolution
  // was, the same way the sound and visual overlay already do. Re-tuned for a much wider
  // floor-to-ceiling spread than before: Baby is a single clean pulse, and each tier above
  // it gets both MORE pulses and LONGER/STRONGER-feeling pulses, so climbing tiers reads as
  // a genuinely escalating event rather than just "a couple more buzzes."
  hapticEvolutionTier(tier) {
    const key = (tier || "").toLowerCase().trim();
    const patterns = {
      baby:      [30],
      child:     [40, 20, 40],
      adult:     [55, 20, 55, 20, 55],
      perfect:   [70, 25, 70, 25, 70, 25, 70],
      ultimate:  [90, 30, 90, 30, 90, 30, 90, 30, 90],
      ultra:     [110, 35, 110, 35, 110, 35, 110, 35, 110, 35, 140],
      ultraplus: [130, 40, 130, 40, 130, 40, 130, 40, 130, 40, 130, 40, 200],
    };
    this.vibrate(patterns[key] || patterns.child);
  }
}

export const sfx = new AudioManager();
