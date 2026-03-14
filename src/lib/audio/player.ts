export class PcmAudioPlayer {
  private context: AudioContext | null = null;
  private nextStartTime = 0;
  private readonly activeSources = new Set<AudioBufferSourceNode>();

  constructor(private readonly sampleRate = 24000) {}

  async init() {
    if (!this.context) {
      this.context = new AudioContext({ sampleRate: this.sampleRate });
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    if (this.nextStartTime < this.context.currentTime) {
      this.nextStartTime = this.context.currentTime;
    }
  }

  enqueueBase64Pcm(base64Data: string) {
    if (!base64Data) {
      return;
    }

    if (!this.context) {
      throw new Error("Audio context is not initialized.");
    }

    const bytes = this.base64ToUint8Array(base64Data);

    if (bytes.byteLength < 2) {
      return;
    }

    const sampleCount = Math.floor(bytes.byteLength / 2);
    const float32 = new Float32Array(sampleCount);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    for (let i = 0; i < sampleCount; i += 1) {
      const sample = view.getInt16(i * 2, true);
      float32[i] = sample / 32768;
    }

    const audioBuffer = this.context.createBuffer(1, sampleCount, this.sampleRate);

    // Use the channel buffer directly instead of copyToChannel to avoid the TS type mismatch.
    const channelData = audioBuffer.getChannelData(0);
    channelData.set(float32);

    const source = this.context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.context.destination);

    const startAt = Math.max(this.nextStartTime, this.context.currentTime + 0.01);
    source.start(startAt);

    this.nextStartTime = startAt + audioBuffer.duration;
    this.activeSources.add(source);

    source.onended = () => {
      this.activeSources.delete(source);
      try {
        source.disconnect();
      } catch {
        // no-op
      }
    };
  }

  stop() {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // no-op
      }

      try {
        source.disconnect();
      } catch {
        // no-op
      }
    }

    this.activeSources.clear();

    if (this.context) {
      this.nextStartTime = this.context.currentTime;
    } else {
      this.nextStartTime = 0;
    }
  }

  async close() {
    this.stop();

    if (this.context) {
      const context = this.context;
      this.context = null;
      this.nextStartTime = 0;
      await context.close();
    }
  }

  private base64ToUint8Array(base64: string) {
    const normalized = base64.replace(/\s/g, "");
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  }
}