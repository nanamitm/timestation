import { html } from "lit";
import { customElement, property, query } from "lit/decorators.js";

import "@components/arrowdropdown";
import { ArrowDropdown } from "@components/arrowdropdown";
import "@components/collapsesetting";
import "@components/infodropdown";

import AppSettings from "@shared/appsettings";
import BaseElement, { registerEventHandler } from "@shared/element";
import { ReadyBusyEvent, SettingsEvent } from "@shared/events";
import { AdvancedSettingsGroup } from "@shared/groups";

@customElement("advanced-settings")
export class AdvancedSettings extends BaseElement {
  @property({ type: Boolean, reflect: true })
  accessor audible = false;

  @property({ type: Boolean, reflect: true })
  accessor noclip = true;

  @property({ type: Boolean, reflect: true })
  accessor square = false;

  @property({ type: Boolean, reflect: true })
  accessor sync = true;

  @query("advanced-settings arrow-dropdown", true)
  private accessor arrowDropdown!: ArrowDropdown;

  @registerEventHandler(SettingsEvent)
  handleSettings(eventType: string) {
    this.arrowDropdown.open = false;
    if (eventType === "save") this.#saveSettings();
  }

  @registerEventHandler(ReadyBusyEvent)
  handleReadyBusy(ready: boolean) {
    if (ready) this.#getSettings();
  }

  #getSettings() {
    this.audible = AppSettings.get("audible");
    this.noclip = AppSettings.get("noclip");
    this.square = AppSettings.get("square");
    this.sync = AppSettings.get("sync");
  }

  #saveSettings() {
    AppSettings.set("audible", this.audible);
    AppSettings.set("noclip", this.noclip);
    AppSettings.set("square", this.square);
    AppSettings.set("sync", this.sync);
  }

  #changeAudible = () => {
    this.audible = !this.audible;
  };

  #changeNoclip = () => {
    this.noclip = !this.noclip;
  };

  #changeSquare = () => {
    this.square = !this.square;
  };

  #changeSync = () => {
    this.sync = !this.sync;
  };

  protected render() {
    return html`
      <div class="flex flex-col">
        <div class="flex items-center">
          <h3 class="grow text-lg font-bold sm:text-xl">Advanced</h3>

          <arrow-dropdown
            classes="flex-nowrap after:shrink-0"
            .group=${AdvancedSettingsGroup}
          ></arrow-dropdown>
        </div>

        <collapse-setting
          .group=${AdvancedSettingsGroup}
          .content=${html`
            <div class="ml-2 mt-4 flex flex-col gap-4">
              <div class="flex h-12 items-center">
                <h4 class="font-semibold sm:text-lg">Audible</h4>

                <info-dropdown
                  class="grow"
                  classes="max-w-[13rem] min-[380px]:max-w-[17rem]"
                  .content=${html`
                    <h4 class="font-bold">Audible</h4>
                    <span class="text-sm">
                      Makes emulated time signal audible. Also prevents it from
                      setting clocks!
                    </span>
                  `}
                  grow
                ></info-dropdown>

                <input
                  class="checkbox mr-2"
                  type="checkbox"
                  name="audible"
                  @change=${this.#changeAudible}
                  .checked=${this.audible}
                />
              </div>

              <div class="flex h-12 items-center">
                <h4 class="font-semibold sm:text-lg">Smoothing</h4>

                <info-dropdown
                  class="grow"
                  classes="max-w-[12rem] min-[460px]:max-w-[21rem]"
                  .content=${html`
                    <h4 class="font-bold">Smoothing</h4>
                    <span class="text-sm">
                      Prevents clipping, but may be less compatible.
                    </span>
                  `}
                  grow
                ></info-dropdown>

                <input
                  class="checkbox mr-2"
                  type="checkbox"
                  name="noclip"
                  @change=${this.#changeNoclip}
                  .checked=${this.noclip}
                />
              </div>

              <div class="flex h-12 items-center">
                <h4 class="font-semibold sm:text-lg">Square wave</h4>

                <info-dropdown
                  class="grow"
                  classes="max-w-[14rem] min-[420px]:max-w-[22rem]"
                  .content=${html`
                    <h4 class="font-bold">Square wave</h4>
                    <span class="text-sm">
                      Uses a square-wave carrier. Its harmonics may improve
                      compatibility with some radio-controlled clocks.
                    </span>
                  `}
                  grow
                ></info-dropdown>

                <input
                  class="checkbox mr-2"
                  type="checkbox"
                  name="square"
                  @change=${this.#changeSquare}
                  .checked=${this.square}
                />
              </div>

              <div class="flex h-12 items-center">
                <h4 class="font-semibold sm:text-lg">Sync time</h4>

                <info-dropdown
                  class="grow"
                  classes="max-w-[11rem] min-[420px]:max-w-[20rem]"
                  .content=${html`
                    <h4 class="font-bold">Sync time</h4>
                    <span class="text-sm">
                      Sync time with server on next page reload.
                    </span>
                  `}
                  grow
                ></info-dropdown>

                <input
                  class="checkbox mr-2"
                  type="checkbox"
                  name="sync"
                  @change=${this.#changeSync}
                  .checked=${this.sync}
                />
              </div>
            </div>
          `}
        ></collapse-setting>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "advanced-settings": AdvancedSettings;
  }
}
