/* eslint-disable no-promise-executor-return */
/* eslint-disable no-async-promise-executor */

import { html, render } from "lit";
import { vi } from "vitest";
import AppSettings from "@shared/appsettings";
import { defaultLocale } from "@shared/locales";

export const TestSettings = {
  station: "JJY",
  locale: defaultLocale,
  jjyKhz: 60,
  offset: -1234,
  dut1: 123,
  audible: false,
  noclip: false,
  square: false,
  sync: false,
  dark: false,
  nanny: false,
  advisory: false,
} as const;

export const FakeAppSettings = {
  get: vi
    .spyOn(AppSettings, "get")
    .mockImplementation((setting) => TestSettings[setting]),
  set: vi.spyOn(AppSettings, "set"),
  reset: vi.spyOn(AppSettings, "reset"),
} as const;

export function delay(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getStyle(element: HTMLElement, property: string) {
  return window.getComputedStyle(element).getPropertyValue(property);
}

export function isSvgEqual(
  svg: SVGSVGElement,
  template: ReturnType<typeof html>,
) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  render(template, container);

  const renderedSvg = container.querySelector("svg")!;
  const isEqual = svg.isEqualNode(renderedSvg);

  container.remove();

  return isEqual;
}
