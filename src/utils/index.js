import { db } from "@/db";
import { Dialog, Notify } from "quasar";
import { errorNotification, successNotification } from "./notifications";

export function confirmDeleteFeature(id) {
  Dialog.create({
    title: "Confirm Delete",
    color: "primary",
    message: "Are you sure you want to delete this feature?",
    cancel: true,
    persistent: true,
    ok: {
      label: "Delete",
      color: "negative",
      icon: "delete",
    },

    cancel: {
      label: "Cancel",
      color: "grey-7",
      flat: true,
      icon: "close",
    },
  }).onOk(async () => {
    try {
      await db.features.delete(id);
      successNotification("Feature Deleted Successfully");
    } catch (error) {
      errorNotification(error.message);
    }
  });
}
