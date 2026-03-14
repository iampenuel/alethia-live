const TARGET_SAMPLE_RATE = 16_000;
const PROCESSOR_BUFFER_SIZE = 512;

function float32ToPcm16Buffer(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    const int16 =
      sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);

    view.setInt16(i * 2, int16, true);
  }

  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return window.btoa(binary);
}

export class BrowserMicInput {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private silentGain: GainNode | null = null;
  private running = false;
  private currentRate = TARGET_SAMPLE_RATE;

  get isRunning(): boolean {
    return this.running;
  }

  get sampleRate(): number {
    return this.currentRate;
  }

  async start(
    onChunk: (base64Data: string, mimeType: string) => void
  ): Promise<void> {
    if (this.running) {
      return;
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    this.context = new AudioContext({
      sampleRate: TARGET_SAMPLE_RATE,
    });

    await this.context.resume();

    this.currentRate = this.context.sampleRate;

    this.source = this.context.createMediaStreamSource(this.stream);
    this.processor = this.context.createScriptProcessor(
      PROCESSOR_BUFFER_SIZE,
      1,
      1
    );
    this.silentGain = this.context.createGain();
    this.silentGain.gain.value = 0;

    this.processor.onaudioprocess = (event) => {
      if (!this.running) {
        return;
      }

      const input = event.inputBuffer.getChannelData(0);
      const pcmBuffer = float32ToPcm16Buffer(input);
      const base64Data = arrayBufferToBase64(pcmBuffer);

      onChunk(base64Data, `audio/pcm;rate=${this.currentRate}`);
    };

    this.source.connect(this.processor);
    this.processor.connect(this.silentGain);
    this.silentGain.connect(this.context.destination);

    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;

    if (this.processor) {
      this.processor.onaudioprocess = null;
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.silentGain) {
      this.silentGain.disconnect();
      this.silentGain = null;
    }

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }

    if (this.context && this.context.state !== "closed") {
      await this.context.close();
    }

    this.context = null;
  }
}