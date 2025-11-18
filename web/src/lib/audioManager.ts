"use client";

import { Howl } from "howler";

type PageMusic = "landing" | "flows" | "none";

class AudioManagerClass {
  private mainMenuMusic: Howl | null = null;
  private flowMusic: Howl | null = null;
  private hoverSound: Howl | null = null;
  private clickSound: Howl | null = null;
  private taskCompleteSound: Howl | null = null;
  
  private currentPageMusic: PageMusic = "none";
  private musicEnabled: boolean = true;
  private sfxEnabled: boolean = true;
  private reducedMotion: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      
      // Initialize sounds only if not reduced motion
      if (!this.reducedMotion) {
        this.initializeSounds();
      }
    }
  }

  private initializeSounds() {
    try {
      // Background music - subtle volume (slightly louder)
      this.mainMenuMusic = new Howl({
        src: ["/audio/mainmenu_song.mp3"],
        loop: true,
        volume: 0.33,
        preload: true,
        html5: false, // Use Web Audio API for better control
        onloaderror: (id, error) => {
          console.error("Failed to load mainMenuMusic:", error);
        },
      });

      this.flowMusic = new Howl({
        src: ["/audio/flow_song.mp3"],
        loop: true,
        volume: 0.25,
        preload: true,
        html5: false,
        onloaderror: (id, error) => {
          console.error("Failed to load flowMusic:", error);
        },
      });

      // SFX
      this.hoverSound = new Howl({
        src: ["/audio/hover.mp3"],
        volume: 0.15,
        preload: true,
        html5: false,
        onloaderror: (id, error) => {
          console.error("Failed to load hoverSound:", error);
        },
      });

      this.clickSound = new Howl({
        src: ["/audio/click.mp3"],
        volume: 0.33,
        preload: true,
        html5: false,
        onloaderror: (id, error) => {
          console.error("Failed to load clickSound:", error);
        },
      });

      this.taskCompleteSound = new Howl({
        src: ["/audio/task_complete.mp3"],
        volume: 0.33,
        preload: true,
        html5: false,
        onloaderror: (id, error) => {
          console.error("Failed to load taskCompleteSound:", error);
        },
      });
    } catch (error) {
      console.error("Error initializing sounds:", error);
    }
  }

  setPageMusic(page: PageMusic) {
    // Always update currentPageMusic state, even if music is disabled
    // This ensures we know what to play when music is re-enabled
    
    // Only fade out current music if it's different from the new page AND music is enabled
    if (this.currentPageMusic !== page && !this.reducedMotion && this.musicEnabled) {
      if (this.currentPageMusic === "landing" && this.mainMenuMusic && this.mainMenuMusic.playing()) {
        const currentVolume = this.mainMenuMusic.volume();
        this.mainMenuMusic.fade(currentVolume, 0, 500);
        setTimeout(() => {
          this.mainMenuMusic?.stop();
        }, 500);
      } else if (this.currentPageMusic === "flows" && this.flowMusic && this.flowMusic.playing()) {
        const currentVolume = this.flowMusic.volume();
        this.flowMusic.fade(currentVolume, 0, 500);
        setTimeout(() => {
          this.flowMusic?.stop();
        }, 500);
      }
    }

    // Update state first
    this.currentPageMusic = page;

    // Only play music if enabled and not reduced motion
    if (this.reducedMotion || !this.musicEnabled) {
      return;
    }

    // Fade in new music (only if it's different from what was playing)
    if (page === "landing" && this.mainMenuMusic) {
      // Only start playing if not already playing and sound is loaded
      if (!this.mainMenuMusic.playing() && this.mainMenuMusic.state() === 'loaded') {
        this.mainMenuMusic.volume(0);
        this.mainMenuMusic.play();
        this.mainMenuMusic.fade(0, 0.33, 1000);
      }
    } else if (page === "flows" && this.flowMusic) {
      // Only start playing if not already playing and sound is loaded
      if (!this.flowMusic.playing() && this.flowMusic.state() === 'loaded') {
        this.flowMusic.volume(0);
        this.flowMusic.play();
        this.flowMusic.fade(0, 0.25, 1000);
      }
    } else if (page === "none") {
      // Stop all music when page is "none"
      this.mainMenuMusic?.stop();
      this.flowMusic?.stop();
    }
  }

  playHover() {
    if (this.reducedMotion || !this.sfxEnabled) {
      return;
    }
    // Simple check: only play if sound is loaded, silently skip if not
    if (this.hoverSound?.state() === 'loaded') {
      this.hoverSound.stop();
      this.hoverSound.play();
    }
  }

  playClick() {
    if (this.reducedMotion || !this.sfxEnabled) {
      return;
    }
    // Simple check: only play if sound is loaded, silently skip if not
    if (this.clickSound?.state() === 'loaded') {
      this.clickSound.stop();
      this.clickSound.play();
    }
  }

  playTaskComplete() {
    if (this.reducedMotion || !this.sfxEnabled) {
      return;
    }
    // Simple check: only play if sound is loaded, silently skip if not
    if (this.taskCompleteSound?.state() === 'loaded') {
      this.taskCompleteSound.stop();
      this.taskCompleteSound.play();
    }
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    
    if (!this.musicEnabled) {
      // Fade out and stop all music smoothly
      if (this.mainMenuMusic && this.mainMenuMusic.playing()) {
        const currentVolume = this.mainMenuMusic.volume();
        this.mainMenuMusic.fade(currentVolume, 0, 500);
        setTimeout(() => {
          this.mainMenuMusic?.stop();
        }, 500);
      }
      if (this.flowMusic && this.flowMusic.playing()) {
        const currentVolume = this.flowMusic.volume();
        this.flowMusic.fade(currentVolume, 0, 500);
        setTimeout(() => {
          this.flowMusic?.stop();
        }, 500);
      }
    } else {
      // Resume current page music (only if not "none")
      if (this.currentPageMusic !== "none") {
        this.setPageMusic(this.currentPageMusic);
      }
    }
    
    return this.musicEnabled;
  }

  toggleSFX() {
    this.sfxEnabled = !this.sfxEnabled;
    return this.sfxEnabled;
  }

  isMusicEnabled() {
    return this.musicEnabled;
  }

  isSFXEnabled() {
    return this.sfxEnabled;
  }

  cleanup() {
    this.mainMenuMusic?.unload();
    this.flowMusic?.unload();
    this.hoverSound?.unload();
    this.clickSound?.unload();
    this.taskCompleteSound?.unload();
  }
}

// Singleton instance - only create on client side
let audioManagerInstance: AudioManagerClass | null = null;

export const audioManager = (() => {
  if (typeof window !== "undefined") {
    if (!audioManagerInstance) {
      audioManagerInstance = new AudioManagerClass();
    }
    return audioManagerInstance;
  }
  // Return a dummy object for server-side rendering
  return {
    playHover: () => {},
    playClick: () => {},
    playTaskComplete: () => {},
    toggleMusic: () => true,
    toggleSFX: () => true,
    isMusicEnabled: () => true,
    isSFXEnabled: () => true,
    setPageMusic: () => {},
  } as unknown as AudioManagerClass;
})();

