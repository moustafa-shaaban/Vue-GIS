import { Notify } from "quasar";

export function successNotification(message) {
  Notify.create({
    type: "positive",
    message,
    position: "top-right",
    timeout: 3000,
    progress: true,
    actions: [{ icon: "close", color: "white" }],
  });
}

export function errorNotification(message) {
  Notify.create({
    type: "negative",
    message,
    position: "top",
    timeout: 5000,
    progress: true,
    actions: [{ icon: "close", color: "white" }],
  });
}

export function warningNotification(message) {
  Notify.create({
    type: "warning",
    message,
    position: "top",
    timeout: 4000,
    progress: true,
  });
}

export function infoNotification(message) {
  Notify.create({
    type: "info",
    message,
    position: "top",
    timeout: 4000,
    progress: true,
  });
}
