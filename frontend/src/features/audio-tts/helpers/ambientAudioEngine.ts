import { AMBIENT_SOUND_CONFIGS } from '../constants'
import type { AmbientPreset } from '../types'

export interface MultiTrackVolumes {
  rain: number
  fire: number
  wind: number
}

class AmbientAudioTrack {
  public audio: HTMLAudioElement
  private isPlayPending = false

  constructor(src: string) {
    this.audio = new Audio(src)
    this.audio.loop = true
    this.audio.preload = 'auto'
    this.audio.volume = 0
  }

  public setVolumeImmediate(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol))
    this.audio.volume = clamped
    if (clamped > 0.005) {
      this.safePlay()
    } else {
      this.safePause()
    }
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

  public dispose(): void {
    this.safePause()
    try {
      this.audio.src = ''
      this.audio.load()
    } catch {}
  }
}

/**
 * 阅境单一白噪音独占音频引擎
 * 仅同时播放单一环境音效，拖动音量滑块即时线性响应
 */
export class AmbientAudioEngine {
  private currentTrack: AmbientAudioTrack | null = null
  private currentPreset: AmbientPreset = 'off'
  private masterVolume: number = 0.5
  private isEnabled: boolean = false

  public getEnabled(): boolean {
    return this.isEnabled
  }

  public getCurrentPreset(): AmbientPreset {
    return this.currentPreset
  }

  public getMasterVolume(): number {
    return this.masterVolume
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    if (!enabled) {
      this.stopAll()
    } else {
      const targetPreset = this.currentPreset !== 'off' ? this.currentPreset : 'rain'
      this.playPreset(targetPreset, this.masterVolume)
    }
  }

  /**
   * 实时线性设置主音量（滑块拖拽时即时生效，无任何定时器延迟）
   */
  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol))
    if (this.currentTrack && this.isEnabled && this.currentPreset !== 'off') {
      this.currentTrack.setVolumeImmediate(this.masterVolume)
    }
  }

  /**
   * 播放指定白噪音/环境音（独占单音源播放）
   */
  public playPreset(preset: AmbientPreset, volume?: number): void {
    if (volume !== undefined) {
      this.masterVolume = Math.max(0, Math.min(1, volume))
    }

    if (preset === 'off') {
      this.stopAll()
      return
    }

    const config = AMBIENT_SOUND_CONFIGS[preset]
    if (!config?.audioSrc) {
      this.stopAll()
      return
    }

    // 若当前已在播放同一音源，只需更新音量与确保播放
    if (this.currentPreset === preset && this.currentTrack) {
      if (this.isEnabled) {
        this.currentTrack.setVolumeImmediate(this.masterVolume)
        this.currentTrack.safePlay()
      }
      return
    }

    // 切换新音源：释放旧音轨并创建新音轨
    if (this.currentTrack) {
      this.currentTrack.dispose()
      this.currentTrack = null
    }

    this.currentPreset = preset
    const newTrack = new AmbientAudioTrack(config.audioSrc)
    this.currentTrack = newTrack

    if (this.isEnabled) {
      newTrack.setVolumeImmediate(this.masterVolume)
      newTrack.safePlay()
    }
  }

  /**
   * 兼容旧版多轨接口：自动映射为单一音源
   */
  public setMultiTrackVolumes(vols: MultiTrackVolumes, _immediate = true): void {
    if (!this.isEnabled) return
    if (vols.rain > 0) {
      this.setMasterVolume(vols.rain / 100)
      this.playPreset('rain')
    } else if (vols.fire > 0) {
      this.setMasterVolume(vols.fire / 100)
      this.playPreset('fire')
    } else if (vols.wind > 0) {
      this.setMasterVolume(vols.wind / 100)
      this.playPreset('wind')
    } else {
      this.stopAll()
    }
  }

  public stopAll(): void {
    if (this.currentTrack) {
      this.currentTrack.dispose()
      this.currentTrack = null
    }
    this.currentPreset = 'off'
  }

  public dispose(): void {
    this.stopAll()
  }
}

