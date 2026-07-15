/* eslint-disable no-console */

import EventBus from "@shared/eventbus";
import {
  TimeSignalReadyEvent,
  TimeSignalStateChangeEvent,
  VisualizerIconEvent,
} from "@shared/events";

import createTimeSignalModule from "../../wasm/timesignal.js";

interface TimeSignalModule extends EmscriptenModule {
  /* Emscripten library and WebAudio API functions. */
  addFunction(func: (...args: any) => any, signature: string): number;
  emscriptenRegisterAudioObject(object: AudioContext | AudioNode): number;
  emscriptenGetAudioObject(handle: number): AudioNode;

  /* Our functions. */
  _tsig_init(
    audioContextHandle: number,
    sampleRate: number,
    jsFinishInitCallbackPtr: number,
    jsCallbackPtr: number,
  ): void;

  _tsig_start(): void;

  _tsig_load_params(
    offset: number,
    stationIndex: number,
    jjyKhzIndex: number,
    dut1: number,
    audible: boolean,
    noclip: boolean,
    square: boolean,
  ): void;

  _tsig_stop(): void;

  _tsig_print_timestamp(timestamp: number, iters: number): number;
}

type TimeSignalModuleParams = {
  stationIndex: number;
  jjyKhzIndex: number;
  offset: number;
  dut1: number;
  audible: boolean;
  noclip: boolean;
  square: boolean;
};

const kTimeSignalState = [
  "idle",
  "startup",
  "reqparams",
  "loadparams",
  "fadein",
  "running",
  "fadeout",
  "suspend",
] as const;
export type TimeSignalState = (typeof kTimeSignalState)[number];

const kVisualizeMs = 5000 as const;
const kQuantums = 384 as const;
const kFftSize = 32 as const;

class RadioTimeSignal {
  static #instance: RadioTimeSignal;

  #module!: TimeSignalModule;

  #params?: TimeSignalModuleParams;

  audioContext!: AudioContext;

  audioWorkletNode!: AudioWorkletNode;

  analyserNode!: AnalyserNode;

  canvas!: HTMLCanvasElement;

  canvasCtx!: CanvasRenderingContext2D;

  animationId!: ReturnType<typeof requestAnimationFrame>;

  #state = 0;

  get state(): TimeSignalState {
    return kTimeSignalState[this.#state];
  }

  private set state(state: number) {
    this.#state = state;
    EventBus.publish(TimeSignalStateChangeEvent, this.state);
  }

  constructor() {
    if (RadioTimeSignal.#instance != null)
      throw new Error("RadioTimeSignal is a singleton class.");
    createTimeSignalModule().then(this.#init);
    RadioTimeSignal.#instance = this;
    EventBus.subscribe(this, VisualizerIconEvent, this.#handleVisualizerIcon);
  }

  #init = (module: TimeSignalModule) => {
    this.#module = module;

    this.audioContext = new AudioContext({ latencyHint: "playback" });
    const audioContextHandle = module.emscriptenRegisterAudioObject(
      this.audioContext,
    );

    /* Init continues below when Wasm invokes #finishInit() as a callback. */
    const finishInitPtr = module.addFunction(this.#finishInit, "vi");
    const communicatePtr = module.addFunction(this.#communicate, "vi");
    module._tsig_init(
      audioContextHandle,
      this.audioContext.sampleRate,
      finishInitPtr,
      communicatePtr,
    );
  };

  #finishInit = (audioWorkletNodeHandle: number) => {
    this.audioWorkletNode = this.#module.emscriptenGetAudioObject(
      audioWorkletNodeHandle,
    ) as AudioWorkletNode;
    this.analyserNode = this.audioContext.createAnalyser();
    this.audioWorkletNode.connect(this.analyserNode);
    this.analyserNode.connect(this.audioContext.destination);

    /* Rarely, against spec, the AudioContext seems to start on its own?! */
    if (this.audioContext.state === "running") this.audioContext.suspend();

    EventBus.publish(TimeSignalReadyEvent);
  };

  #handleVisualizerIcon = (canvas: HTMLCanvasElement) => {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext("2d")!;
  };

  #visualize = () => {
    const { width, height } = this.canvas;
    const quantumMs = kVisualizeMs / kQuantums;

    /* FFT size might be different from that requested. */
    this.analyserNode.fftSize = kFftSize;
    const { fftSize } = this.analyserNode;

    const frameData = new Uint8Array(fftSize);
    const data = new Array<number>(kQuantums).fill(0);
    let prevTimestamp: number | undefined;
    let k = 0;

    const draw = (timestamp?: number) => {
      if (prevTimestamp == null || timestamp == null) {
        prevTimestamp = timestamp;
        this.animationId = requestAnimationFrame(draw);
        return;
      }

      const elapsed = timestamp - prevTimestamp;
      const quantumsElapsed = Math.trunc(elapsed / quantumMs);

      if (quantumsElapsed > 0) {
        prevTimestamp += Math.trunc(quantumsElapsed) * quantumMs;

        this.analyserNode.getByteTimeDomainData(frameData);
        const magnitude = frameData.reduce(
          (acc, n) => Math.max(acc, Math.abs(n - 128)),
          0,
        );

        for (let i = 0; i < quantumsElapsed; i++) {
          data[k++] = magnitude;
          if (k === data.length) k = 0;
        }

        this.canvasCtx.clearRect(0, 0, width, height);
        this.canvasCtx.beginPath();
        this.canvasCtx.lineWidth = 2;

        /*
         * Workaround for not being able to access CSS variables directly.
         * Stroke color is daisyUI's base-content, which depends on dark mode.
         */
        const style = getComputedStyle(this.canvas);
        const color = style.getPropertyValue("--bc");
        this.canvasCtx.strokeStyle = `oklch(${color})`;

        for (let i = 0; i < data.length; i++) {
          const j = (i + k) % data.length;

          const x = (width * i) / data.length;
          const y = Math.max(1, height - 1 - (height * data[j]) / 128);

          if (i === 0) this.canvasCtx.moveTo(x, y);
          else this.canvasCtx.lineTo(x, y);
        }

        this.canvasCtx.stroke();
      }

      this.animationId = requestAnimationFrame(draw);
    };

    draw();
  };

  #communicate = (state: number) => {
    if (import.meta.env.DEV)
      console.log(`RadioTimeSignal.#communicate(${state});`);
    this.state = state;

    if (this.state === "idle") {
      this.audioContext.suspend().then(() => {
        cancelAnimationFrame(this.animationId);
        if (import.meta.env.DEV)
          console.log(`Suspended playback at ${Date.now()}`);
      });
    } else if (this.state === "reqparams") {
      this.#sendParams();
    } else if (this.state === "fadein") {
      this.#visualize();
    }
  };

  #sendParams = () => {
    if (this.#params == null) return;

    const { dut1, jjyKhzIndex, audible, noclip, offset, square, stationIndex } =
      this.#params;
    const outputLatencyMs = 1000 * this.audioContext.outputLatency;

    this.#module._tsig_load_params(
      offset + outputLatencyMs,
      stationIndex,
      jjyKhzIndex,
      dut1,
      audible,
      noclip,
      square,
    );

    if (import.meta.env.DEV)
      console.log(
        `Sent params at ${Date.now()}, output latency ${outputLatencyMs}`,
      );
  };

  start(params: TimeSignalModuleParams) {
    /*
     * We don't send parameters to the Audio Worklet thread immediately, as
     * AudioContext.outputLatency becomes available and somewhat stable only
     * *well* after audio playback has actually begun. The thread generates
     * silence for some time and signals an appropriate state change to
     * request params.
     */
    if (import.meta.env.DEV)
      console.log(`RadioTimeSignal.start() at ${Date.now()}`);
    this.#params = params;
    if (this.audioContext.state === "suspended")
      this.audioContext.resume().then(this.#module._tsig_start);
  }

  stop() {
    /*
     * Once again, we don't stop the Audio Worklet thread immediately, as
     * invoking AudioContext.suspend() with nonzero PCM values remaining in
     * output buffers discards those samples unplayed and results in an
     * audible pop as the output waveform abruptly becomes zero. So the thread
     * fades out and generates silence for some time before signaling an
     * appropriate state change to indicate that we may suspend it.
     */
    if (this.audioContext.state === "running") this.#module._tsig_stop();
  }
}

export default new RadioTimeSignal();
