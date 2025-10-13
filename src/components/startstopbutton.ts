import { html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import AppSettings, {
  Station,
  knownJjyKhz,
  knownStations,
} from "@shared/appsettings";
import BaseElement, { registerEventHandler } from "@shared/element";
import {
  ReadyBusyEvent,
  ServerOffsetEvent,
  TimeSignalStateChangeEvent,
} from "@shared/events";
import { svgIcons } from "@shared/icons";
import RadioTimeSignal from "@shared/radiotimesignal";

const kStartStopButtonText = {
  stopped: "Start",
  starting: "Stop",
  started: "Stop",
  stopping: "Stopping",
} as const;

type StartStopButtonState = keyof typeof kStartStopButtonText;

@customElement("start-stop-button")
export class StartStopButton extends BaseElement {
  #serverOffset = 0;

  @state()
  private accessor ready = false;

  @state()
  private accessor station!: Station;

  get #state(): StartStopButtonState {
    switch (RadioTimeSignal.state) {
      case "idle":
        return "stopped";

      case "startup":
      case "reqparams":
      case "loadparams":
        return "starting";

      case "fadein":
      case "running":
      case "fadeout":
        return "started";

      case "suspend":
      default:
        return "stopping";
    }
  }

  @query("start-stop-button dialog", true)
  private accessor dialog!: HTMLDialogElement;

  @query("start-stop-button dialog input", true)
  private accessor checkbox!: HTMLInputElement;

  showModal() {
    this.dialog.showModal();
  }

  #closeModal() {
    AppSettings.set("nanny", this.checkbox.checked);
  }

  #start() {
    if (AppSettings.get("nanny")) this.showModal();

    RadioTimeSignal.start({
      stationIndex: knownStations.indexOf(AppSettings.get("station")),
      jjyKhzIndex: knownJjyKhz.indexOf(AppSettings.get("jjyKhz")),
      offset: AppSettings.get("offset") + this.#serverOffset,
      dut1: AppSettings.get("dut1"),
      audible: AppSettings.get("audible"),
      noclip: AppSettings.get("noclip"),
    });
  }

  #stop() {
    RadioTimeSignal.stop();
  }

  #click() {
    if (this.#state === "stopped") this.#start();
    else this.#stop();
  }

  #getSettings() {
    this.station = AppSettings.get("station");
  }

  @registerEventHandler(ReadyBusyEvent)
  handleReadyBusy(ready: boolean) {
    if (ready) this.#getSettings();
    else this.#stop();
    this.ready = ready;
  }

  @registerEventHandler(TimeSignalStateChangeEvent)
  handleTimeSignalStateChange() {
    this.requestUpdate();
  }

  @registerEventHandler(ServerOffsetEvent)
  handleServerOffset(serverOffset: number) {
    this.#serverOffset = serverOffset;
  }

  protected render() {
    const classes = classMap({
      "btn-success": this.ready && this.#state === "stopped",
      "btn-error":
        this.ready && (this.#state === "starting" || this.#state === "started"),
      "btn-disabled": !this.ready || this.#state === "stopping",
    });

    let buttonText = "loading";
    if (this.ready) {
      const stateText = kStartStopButtonText[this.#state];
      const station =
        this.station === "JJY" ?
          `${this.station}${AppSettings.get("jjyKhz")}`
        : this.station;
      buttonText = `${stateText} ${station}`;
    }

    return html`
      <button
        class="${classes} btn btn-md btn-wide drop-shadow sm:btn-lg sm:w-[24rem]"
        @click=${this.#click}
      >
        ${buttonText}
      </button>

      <dialog class="modal" @close=${this.#closeModal}>
        <div
          class="modal-box flex max-h-[calc(100dvh-2rem)] w-[90%] max-w-[calc(100dvw-2rem)] flex-col gap-4"
        >
          <form class="flex items-center" method="dialog">
            <h3 class="grow text-xl font-bold sm:text-2xl">Safety Warning</h3>

            <!-- Invisible dummy button takes autofocus when modal is opened -->
            <button></button>

            <button class="btn btn-circle btn-ghost btn-sm p-0">
              <span class="size-6 sm:size-8">${svgIcons.close}</span>
            </button>
          </form>

          <div
            class="alert alert-warning grid-flow-col items-start text-start"
            role="alert"
          >
            <span class="size-6 sm:size-8">${svgIcons.warning}</span>
            <span class="flex min-w-0 flex-col gap-2">
              <p>
                <span class="font-bold">
                  DO NOT PLACE YOUR EARS NEAR THE SPEAKER TO DETERMINE VOLUME.
                </span>
              </p>
              <p>Use a visual volume indicator instead.</p>
              <p>
                The generated waveform has full dynamic range, but is pitched
                high enough to be difficult to perceive.
              </p>
              <p>
                <span class="font-bold">
                  Even if you &ldquo;can&rsquo;t hear anything&rdquo;,
                </span>
                many common devices are capable of playing it back loud enough
                to potentially cause
                <span class="font-bold">permanent hearing damage!</span>
              </p>
            </span>
          </div>

          <span class="flex">
            <span class="grow font-semibold">Show this warning next time</span>
            <input
              class="checkbox"
              type="checkbox"
              name="nanny"
              .checked=${AppSettings.get("nanny")}
            />
          </span>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "start-stop-button": StartStopButton;
  }
}
