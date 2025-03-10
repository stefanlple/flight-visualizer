import { init } from "./rangeSlider";

const FILTER_ICONS = {
  "filter-callsign": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12M6 12h8M6 16h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`,
  "filter-icao": `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`,
  "filter-country": `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
  "filter-altitude": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  "filter-velocity": `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 12l4-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`,
  "filter-vertical-rate": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16M6 16l4-6 4 4 4-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  "filter-on-ground": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16M8 14l8-4 2 2-4 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
};

const injectFilterIcons = () => {
  document.querySelectorAll(".filter-options > li").forEach((item) => {
    const filterClass = [...item.classList].find((cls) => FILTER_ICONS[cls]);
    if (!filterClass) return;

    const icon = document.createElement("span");
    icon.className = "filter-option-icon";
    icon.innerHTML = FILTER_ICONS[filterClass];
    item.prepend(icon);
  });
};

export const filterPair = {
  'document.querySelector(".filter-callsign")': document.querySelector(
    ".filter-callsign-item"
  ),
  'document.querySelector(".filter-icao")':
    document.querySelector(".filter-icao-item"),
  'document.querySelector(".filter-country")': document.querySelector(
    ".filter-country-item"
  ),
  'document.querySelector(".filter-altitude")': document.querySelector(
    ".filter-altitude-item"
  ),
  'document.querySelector(".filter-velocity")': document.querySelector(
    ".filter-velocity-item"
  ),
  'document.querySelector(".filter-vertical-rate")': document.querySelector(
    ".filter-vertical-rate-item"
  ),
  'document.querySelector(".filter-on-ground")': document.querySelector(
    ".filter-on-ground-item"
  ),
};

export const getVisible = (element) => !element.classList.contains("filter-option-active");

const toggleFilterItems = (element, linkedElement, isInactive) => {
  element.classList.toggle("filter-option-active", isInactive);
  linkedElement.classList.toggle("hidden", !isInactive);

  const slider = linkedElement.children[2].classList.contains("min-max-slider")
    ? linkedElement.children[2]
    : null;

  if (slider && slider.querySelectorAll(".legend").length < 2) {
    init(slider);
  }
};

const addClickEventOnFilterItem = (key, value) => {
  const object = eval(key);
  const valueObject = value;

  valueObject.children[1].innerHTML = object.dataset.tooltip;

  object.addEventListener("click", () =>
    toggleFilterItems(object, valueObject, getVisible(object))
  );

  const crossIcon = valueObject.children[0];
  crossIcon.addEventListener("click", () => {
    toggleFilterItems(object, valueObject, getVisible(object));
  });
};

/* INITIALIZATION */

injectFilterIcons();

for (const [key, value] of Object.entries(filterPair)) {
  addClickEventOnFilterItem(key, value);
}

document.querySelector(".reset-button").addEventListener("click", () => {
  tooltips.forEach((e) => {
    e.classList.remove("filter-option-active");
  });

  document.querySelectorAll(".filter-bar-item").forEach((e) => {
    e.classList.add("hidden");
  });
});

let sliders = document.querySelectorAll(".min-max-slider");
sliders.forEach(function (slider) {
  init(slider);
});

var tooltips = document.querySelectorAll(".filter-tooltip");

tooltips.forEach((element) => {
  const tooltipText = element.getAttribute("data-tooltip");
  element.innerHTML = `
    ${element.innerHTML}
    <span class="tooltip-text">${tooltipText}</span>
  `;
});
