import { AMBIENT_SOUND_CONFIGS } from '../constants'
import type { AmbientPreset } from '../types'

export interface MultiTrackVolumes {
  rain: number // 0 - 100
  fire: number // 0 - 100
  wind: number // 0 - 100
}

const TRACK_PATHS: Record<'rain' | 'fire' | 'wind', string> = {
  rain: '/audio/ambient/rain.mp3',
  fire: '/audio/ambient/fire.mp3',
  wind: '/audio/ambient/wind.mp3',
}

class AmbientAudioTrack {
  public audio: HTMLAudioElement
  private fadeTimer: number | null = null
  private isPlayPending = false
  public targetRatio: number = 0

  constructor(src: string) {
    this.audio = new Audio(src)
    this.audio.loop = true
    this.audio.preload = 'none'
    this.audio.volume = 0
  }

  public setVolumeImmediate(vol: number): void {
    this.clearFade()
    const clamped = Math.max(0, Math.min(1, vol))
    this.audio.volume = clamped
    if (clamped > 0.005) {
      this.safePlay()
    } else {
      this.safePause()
    }
  }

  public fadeTo(targetVol: number, durationMs = 200): void {
    this.clearFade()
    const clamped = Math.max(0, Math.min(1, targetVol))
    if (clamped > 0.005) {
      this.safePlay()
    }
    const start = this.audio.volume
    const diff = clamped - start
    if (Math.abs(diff) < 0.01) {
      this.audio.volume = clamped
      if (clamped <= 0.005) this.safePause()
      return
    }

    const steps = 8
    const stepTime = durationMs / steps
    let currentStep = 0
    this.fadeTimer = window.setInterval(() => {
      currentStep++
      const factor = currentStep / steps
      this.audio.volume = Math.max(0, Math.min(1, start + diff * factor))
      if (currentStep >= steps) {
        this.clearFade()
        this.audio.volume = clamped
        if (clamped <= 0.005) this.safePause()
      }
    }, stepTime)
  }

  public safePlay(): void {
    if (this.audio.paused && !this.isPlayPending) {
      this.isPlayPending = true
      this.audio
        .play()
        .then(() => {
          this.isPlayPending = false
        })
        .catch(() => {
          this.isPlayPending = false
        })
    }
  }

  public safePause(): void {
    if (!this.audio.paused) {
      try {
        this.audio.pause()
      } catch {}
    }
  }

  private clearFade(): void {
    if (this.fadeTimer !== null) {
      clearInterval(this.fadeTimer)
      this.fadeTimer = null
    }
  }

  public dispose(): void {
    this.clearFade()
    this.safePause()
    try {
      this.audio.src = ''
    } catch {}
  }
}

export class AmbientAudioEngine {
  private naturalTracks: Map<'rain' | 'fire' | 'wind', AmbientAudioTrack> = new Map()
  private soloTrack: AmbientAudioTrack | null = null
  private currentSoloPreset: AmbientPreset = 'off'
  private masterVolume: number = 0.5
  private isEnabled: boolean = false
  private savedMultiVols: MultiTrackVolumes = { rain: 0, fire: 0, wind: 0 }

  constructor() {}

  public getEnabled(): boolean {
    return this.isEnabled
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    if (!enabled) {
      this.stopAll()
    } else {
      if (this.currentSoloPreset !== 'off' && this.currentSoloPreset !== 'rain' && this.currentSoloPreset !== 'fire' && this.currentSoloPreset !== 'wind') {
        this.playPreset(this.currentSoloPreset)
      } else if (this.savedMultiVols.rain > 0 || this.savedMultiVols.fire > 0 || this.savedMultiVols.wind > 0) {
        this.setMultiTrackVolumes(this.savedMultiVols, false)
      } else if (this.currentSoloPreset === 'rain' || this.currentSoloPreset === 'fire' || this.currentSoloPreset === 'wind') {
        this.playPreset(this.currentSoloPreset)
      } else {
        this.playPreset('rain')
      }
    }
  }

  private getOrCreateTrack(key: 'rain' | 'fire' | 'wind'): AmbientAudioTrack {
    let track = this.naturalTracks.get(key)
    if (!track) {
      track = new AmbientAudioTrack(TRACK_PATHS[key])
      this.naturalTracks.set(key, track)
    }
    return track
  }

  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol))
    if (this.isEnabled) {
      this.applyAllVolumes(false)
    }
  }

  public setMultiTrackVolumes(vols: MultiTrackVolumes, immediate = true): void {
    this.savedMultiVols = { ...vols }

    if (!this.isEnabled) {
      return
    }

    const rTrack = this.getOrCreateTrack('rain')
    const fTrack = this.getOrCreateTrack('fire')
    const wTrack = this.getOrCreateTrack('wind')

    rTrack.targetRatio = Math.max(0, Math.min(1, vols.rain / 100))
    fTrack.targetRatio = Math.max(0, Math.min(1, vols.fire / 100))
    wTrack.targetRatio = Math.max(0, Math.min(1, vols.wind / 100))

    const rVol = rTrack.targetRatio * this.masterVolume
    const fVol = fTrack.targetRatio * this.masterVolume
    const wVol = wTrack.targetRatio * this.masterVolume

    if (immediate) {
      rTrack.setVolumeImmediate(rVol)
      fTrack.setVolumeImmediate(fVol)
      wTrack.setVolumeImmediate(wVol)
    } else {
      rTrack.fadeTo(rVol)
      fTrack.fadeTo(fVol)
      wTrack.fadeTo(wVol)
    }

    if (this.soloTrack && (vols.rain > 0 || vols.fire > 0 || vols.wind > 0)) {
      this.stopSoloPreset()
    }
  }

  public playPreset(preset: AmbientPreset, volume?: number): void {
    if (volume !== undefined) {
      this.masterVolume = Math.max(0, Math.min(1, volume))
    }

    if (preset === 'off') {
      this.stopAll()
      return
    }

    this.currentSoloPreset = preset

    if (!this.isEnabled) {
      return
    }

    if (preset === 'rain' || preset === 'fire' || preset === 'wind') {
      this.stopSoloPreset()
      this.setMultiTrackVolumes(
        {
          rain: preset === 'rain' ? 80 : 0,
          fire: preset === 'fire' ? 80 : 0,
          wind: preset === 'wind' ? 80 : 0,
        },
        false
      )
      this.currentSoloPreset = preset
      return
    }

    // 独立音源 (waves, study, cafe, pink_noise, white_noise, brown_noise)
    this.naturalTracks.forEach((t) => {
      t.targetRatio = 0
      t.fadeTo(0, 150)
    })

    const config = AMBIENT_SOUND_CONFIGS[preset]
    if (!config?.audioSrc) return

    if (this.currentSoloPreset !== preset || !this.soloTrack) {
      this.stopSoloPreset()
      this.soloTrack = new AmbientAudioTrack(config.audioSrc)
      this.currentSoloPreset = preset
    }

    this.soloTrack.fadeTo(this.masterVolume, 250)
  }

  private stopSoloPreset(): void {
    if (this.soloTrack) {
      this.soloTrack.fadeTo(0, 150)
      this.soloTrack.dispose()
      this.soloTrack = null
    }
    this.currentSoloPreset = 'off'
  }

  public stopAll(): void {
    this.naturalTracks.forEach((track) => {
      track.targetRatio = 0
      track.setVolumeImmediate(0)
    })
    this.stopSoloPreset()
  }

  private applyAllVolumes(immediate = false): void {
    this.naturalTracks.forEach((track) => {
      const vol = track.targetRatio * this.masterVolume
      if (immediate) track.setVolumeImmediate(vol)
      else track.fadeTo(vol)
    })
    if (this.soloTrack && this.currentSoloPreset !== 'off') {
      if (immediate) this.soloTrack.setVolumeImmediate(this.masterVolume)
      else this.soloTrack.fadeTo(this.masterVolume)
    }
  }

  public dispose(): void {
    this.stopAll()
    this.naturalTracks.forEach((track) => track.dispose())
    this.naturalTracks.clear()
    this.stopSoloPreset()
  }
}
