// Round 3: one shared clock for everything that keeps moving (loaders, diagram markers, meters).
// It runs only while at least one subscriber is on screen and motion is active, so the visitor
// motion switch, reduced motion and hidden tabs stop every signal in one place.
import { isMotionActive, onMotionChange } from "./lifecycle.js";

const subscribers = new Map();
let timer = 0;
let count = 0;

function interval() {
  const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tick"));
  return Number.isFinite(value) && value > 0 ? value : 40;
}

function step() {
  count += 1;
  subscribers.forEach((entry) => {
    if (entry.visible) entry.callback(count);
  });
}

function sync() {
  const anyVisible = [...subscribers.values()].some((entry) => entry.visible);
  const shouldRun = anyVisible && isMotionActive();
  if (shouldRun && !timer) timer = window.setInterval(step, interval());
  if (!shouldRun && timer) {
    window.clearInterval(timer);
    timer = 0;
  }
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    subscribers.forEach((value) => {
      if (value.element === entry.target) value.visible = entry.isIntersecting;
    });
  });
  sync();
});

// onTick(element, callback(tickCount)) → unsubscribe. The callback runs every --tick while the element is visible.
export function onTick(element, callback) {
  const key = Symbol("tick");
  subscribers.set(key, { element, callback, visible: false });
  observer.observe(element);
  return () => {
    subscribers.delete(key);
    if (![...subscribers.values()].some((entry) => entry.element === element)) observer.unobserve(element);
    sync();
  };
}

onMotionChange(sync);
