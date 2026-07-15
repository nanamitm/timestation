import { defaultLocale, supportedLocales } from "@shared/locales";

const kSupportedLocales = new Set(supportedLocales);

const kStations = ["BPC", "DCF77", "JJY", "MSF", "WWVB"] as const;
export type Station = (typeof kStations)[number];
export const knownStations: readonly Station[] = [...kStations] as const;

const kJjyKhz = [40, 60] as const;
export type JjyKhz = (typeof kJjyKhz)[number];
export const knownJjyKhz: readonly JjyKhz[] = [...kJjyKhz] as const;

const kAppSettings = [
  "station",
  "locale",
  "jjyKhz",
  "offset",
  "dut1",
  "audible",
  "noclip",
  "square",
  "sync",
  "dark",
  "nanny",
  "advisory",
] as const;
export type AppSetting = (typeof kAppSettings)[number];
export const knownAppSettings: readonly AppSetting[] = [
  ...kAppSettings,
] as const;

const kValidators: Record<AppSetting, (x: any) => boolean> = {
  station: (x: any) => knownStations.includes(x),
  locale: (x: any) => kSupportedLocales.has(x),
  jjyKhz: (x: any) => knownJjyKhz.includes(x),
  offset: (x: any) => Number.isSafeInteger(x) && x > -86400000 && x < 86400000,
  dut1: (x: any) => Number.isSafeInteger(x) && x > -1000 && x < 1000,
  audible: (x: any) => typeof x === "boolean",
  noclip: (x: any) => typeof x === "boolean",
  square: (x: any) => typeof x === "boolean",
  sync: (x: any) => typeof x === "boolean",
  dark: (x: any) => typeof x === "boolean",
  nanny: (x: any) => typeof x === "boolean",
  advisory: (x: any) => typeof x === "boolean",
} as const;

export type AppSettingType = {
  station: Station;
  locale: string;
  jjyKhz: JjyKhz;
  offset: number;
  dut1: number;
  audible: boolean;
  noclip: boolean;
  square: boolean;
  sync: boolean;
  dark: boolean;
  nanny: boolean;
  advisory: boolean;
};

export const defaultAppSettings: AppSettingType = {
  station: "WWVB",
  locale: defaultLocale,
  jjyKhz: 40,
  offset: 0,
  dut1: 0,
  audible: false,
  noclip: true,
  square: false,
  sync: true,
  dark: window.matchMedia?.("(prefers-color-scheme: dark").matches ?? false,
  nanny: true,
  advisory: true,
} as const;

function convertStoredValue<T extends AppSetting>(
  setting: T,
  value?: string,
): AppSettingType[T] | undefined {
  let converted: any;
  if (value != null) {
    if (setting === "station" || setting === "locale") {
      converted = value;
    } else if (
      [
        "audible",
        "noclip",
        "square",
        "sync",
        "dark",
        "nanny",
        "advisory",
      ].includes(setting) &&
      (value === "true" || value === "false")
    ) {
      converted = value === "true";
    } else {
      const parsed = parseFloat(value);
      if (!Number.isNaN(parsed) && Number.isSafeInteger(parsed))
        converted = parsed;
    }
  }
  return converted != null ? (converted as AppSettingType[T]) : undefined;
}

function isValueValid(setting: AppSetting, value: any) {
  return kValidators[setting](value);
}

function hasLocalStorage() {
  /* cf. https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API */
  let storage: Storage | undefined;
  try {
    storage = window.localStorage;
    const x = "__storage_test__";
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return (
      e instanceof DOMException &&
      (e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        e.name === "QuotaExceededError") &&
      storage != null &&
      storage.length !== 0
    );
  }
}

class AppSettings {
  static #instance: AppSettings;

  #settings: AppSettingType = { ...defaultAppSettings };

  #hasLocalStorage = hasLocalStorage();

  constructor() {
    if (AppSettings.#instance != null)
      throw new Error("AppSettings is a singleton class.");
    AppSettings.#instance = this;
  }

  set<T extends AppSetting>(setting: T, value: AppSettingType[T]) {
    if (!isValueValid(setting, value))
      throw new Error(`"${value}" is an invalid value for ${setting}.`);
    if (this.#hasLocalStorage) window.localStorage.setItem(setting, `${value}`);
    else this.#settings[setting] = value;
  }

  get<T extends AppSetting>(setting: T): AppSettingType[T] {
    if (!this.#hasLocalStorage) return this.#settings[setting];

    const storedValue = window.localStorage.getItem(setting) ?? undefined;
    let value = convertStoredValue(setting, storedValue);
    if (value == null || !isValueValid(setting, value)) {
      value = defaultAppSettings[setting];
      this.set(setting, value);
    }
    return value;
  }

  reset() {
    if (this.#hasLocalStorage) window.localStorage.clear();
    else this.#settings = { ...defaultAppSettings };
  }
}

export default new AppSettings();
