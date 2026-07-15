import { afterEach, describe, expect, it, vi } from "vitest";

import AppSettings, {
  AppSetting,
  defaultAppSettings,
  knownJjyKhz,
  knownStations,
} from "@shared/appsettings";
import { supportedLocales } from "@shared/locales";

type TestSettingValues = [
  setting: AppSetting,
  validValues: readonly any[],
  invalidValues: readonly any[],
];

const testSettingValues: TestSettingValues[] = [
  ["station", knownStations, ["BZZT", "AAAAAAA", 123]],
  ["locale", supportedLocales, ["he-RP-Ffff", 654]],
  ["jjyKhz", knownJjyKhz, ["he-RP-Ffff", 654]],
  [
    "offset",
    [-86399999, -11111, 0, 11111, 86399999],
    [-86400000, 86400000, Infinity, "hi"],
  ],
  ["dut1", [-999, -99, 0, 99, 999], [-1000, 1000, "abc", -Infinity]],
  ["audible", [true, false], ["!!!", 0.1, "null"]],
  ["noclip", [true, false], ["zzzz", 0, null]],
  ["square", [true, false], ["zzzz", 0, null]],
  ["sync", [true, false], ["aaaaa", 1, undefined]],
  ["dark", [true, false], ["", -1, "undefined"]],
  ["nanny", [true, false], ["fff", Infinity, BigInt(0)]],
  ["advisory", [true, false], ["...", -0.1, "Infinity"]],
] as const;

const localStoragePrototype = Object.getPrototypeOf(window.localStorage);

const FakeLocalStorage = {
  clear: vi.spyOn(localStoragePrototype, "clear"),
  getItem: vi.spyOn(localStoragePrototype, "getItem"),
  setItem: vi.spyOn(localStoragePrototype, "setItem"),
} as const;

describe("AppSettings", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("is a singleton", () => {
    const Class = AppSettings.constructor as any;
    expect(() => new Class()).toThrowError("AppSettings is a singleton class.");
  });

  describe("set", () => {
    describe.each(testSettingValues)(
      "%s",
      (setting, validValues, invalidValues) => {
        it("stores valid values", () => {
          validValues.forEach((value) => {
            AppSettings.set(setting as AppSetting, value);
            expect(FakeLocalStorage.setItem).toHaveBeenLastCalledWith(
              setting,
              `${value}`,
            );
          });
        });

        it("throws on invalid values", () => {
          invalidValues.forEach((value) => {
            expect(() =>
              AppSettings.set(setting as AppSetting, value as any),
            ).toThrow(`"${value}" is an invalid value for ${setting}.`);
            expect(FakeLocalStorage.setItem).not.toHaveBeenCalled();
          });
        });
      },
    );
  });

  describe("get", () => {
    describe.each(testSettingValues)(
      "%s",
      (setting, validValues, invalidValues) => {
        it("returns valid stored values", () => {
          validValues.forEach((value) => {
            FakeLocalStorage.getItem.mockReturnValueOnce(`${value}`);
            expect(AppSettings.get(setting as AppSetting)).toBe(value);
          });
        });

        it("stores and returns default with invalid stored values", () => {
          invalidValues.forEach((value) => {
            const defaultValue = defaultAppSettings[setting as AppSetting];
            FakeLocalStorage.getItem.mockReturnValueOnce(`${value}`);
            expect(AppSettings.get(setting as AppSetting)).toBe(defaultValue);
            expect(FakeLocalStorage.setItem).toHaveBeenLastCalledWith(
              setting,
              `${defaultValue}`,
            );
          });
        });
      },
    );
  });

  describe("reset", () => {
    it("clears local storage", () => {
      AppSettings.reset();
      expect(FakeLocalStorage.clear).toHaveBeenCalled();
    });
  });
});
