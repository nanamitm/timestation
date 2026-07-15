import { afterEach, beforeEach, describe, expect, it } from "vitest";

import "@components/navbar";
import { NavBar } from "@components/navbar";

import EventBus from "@shared/eventbus";
import { ReadyBusyEvent } from "@shared/events";
import { svgIcons } from "@shared/icons";
import "@shared/styles.css";

import { delay, getStyle, isSvgEqual } from "@test/utils";

describe("Nav bar", () => {
  let navBar: NavBar;
  let dropdown: HTMLDivElement;
  let menuButton: HTMLDivElement;
  let aboutLink: HTMLAnchorElement;
  let settingsLink: HTMLAnchorElement;
  let gitHubLink: HTMLAnchorElement;
  let aboutDialog: HTMLDialogElement;
  let settingsDialog: HTMLDialogElement;
  let menuSvg: SVGSVGElement;
  let closeMenuSvg: SVGSVGElement;
  let aboutSvg: SVGSVGElement;
  let settingsSvg: SVGSVGElement;
  let gitHubSvg: SVGSVGElement;
  let openSvg: SVGSVGElement;

  beforeEach(async () => {
    navBar = document.createElement("nav-bar");
    document.body.appendChild(navBar);
    await delay();
    dropdown = navBar.querySelector(".dropdown")!;
    menuButton = dropdown.querySelector("div[role=button].btn")!;
    aboutLink = dropdown.querySelector("ul li a")!;
    settingsLink = dropdown.querySelector("ul li:nth-of-type(2) a")!;
    gitHubLink = dropdown.querySelector("ul li:nth-of-type(3) a")!;
    aboutDialog = navBar.querySelector("about-modal dialog.modal")!;
    settingsDialog = navBar.querySelector("settings-modal dialog.modal")!;
    [menuSvg, closeMenuSvg, aboutSvg, settingsSvg, gitHubSvg, openSvg] =
      dropdown.querySelectorAll("svg");
  });

  afterEach(() => {
    navBar.remove();
  });

  it("renders with defaults", () => {
    expect(dropdown.hasAttribute("open")).toBe(false);
    expect(gitHubLink.href).toBe("https://github.com/nanamitm/timestation");
    expect(getStyle(settingsLink, "pointer-events")).toBe("none");
    expect(aboutDialog.hasAttribute("open")).toBe(false);
    expect(settingsDialog.hasAttribute("open")).toBe(false);
    expect(isSvgEqual(menuSvg, svgIcons.menu)).toBe(true);
    expect(isSvgEqual(closeMenuSvg, svgIcons.close)).toBe(true);
    expect(isSvgEqual(aboutSvg, svgIcons.help)).toBe(true);
    expect(isSvgEqual(settingsSvg, svgIcons.settings)).toBe(true);
    expect(isSvgEqual(gitHubSvg, svgIcons.github)).toBe(true);
    expect(isSvgEqual(openSvg, svgIcons.open)).toBe(true);
  });

  describe("handles ReadyBusyEvent", () => {
    it("enables settings item from event data", async () => {
      EventBus.publish(ReadyBusyEvent, true);
      await delay();
      expect(getStyle(settingsLink, "pointer-events")).not.toBe("none");
      EventBus.publish(ReadyBusyEvent, false);
      await delay();
      expect(getStyle(settingsLink, "pointer-events")).toBe("none");
    });
  });

  describe("provides a menu", () => {
    describe("has a menu button", () => {
      it("shows menu on click", () => {
        menuButton.click();
        expect(dropdown.hasAttribute("open")).toBe(true);
      });

      it("hides menu on another click", () => {
        menuButton.click();
        menuButton.click();
        expect(dropdown.hasAttribute("open")).toBe(false);
      });
    });

    describe("menu has an about item", () => {
      it("shows about modal and hides menu on click", () => {
        menuButton.click();
        aboutLink.click();
        expect(dropdown.hasAttribute("open")).toBe(false);
        expect(aboutDialog.hasAttribute("open")).toBe(true);
      });
    });

    describe("menu has a settings item", () => {
      it("shows settings modal and hides menu on click", () => {
        menuButton.click();
        settingsLink.click();
        expect(dropdown.hasAttribute("open")).toBe(false);
        expect(settingsDialog.hasAttribute("open")).toBe(true);
      });
    });

    describe("menu has a github item", () => {
      it("hides menu on click", () => {
        menuButton.click();
        gitHubLink.click();
        expect(dropdown.hasAttribute("open")).toBe(false);
      });
    });
  });
});
