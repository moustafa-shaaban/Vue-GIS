import { db } from "@/db";
import { Dialog, Notify } from "quasar";

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
      Notify.create({
        message: "Feature Deleted Successfully",
        type: "positive",
        actions: [{ icon: "close", color: "white", round: true }],
      });
    } catch (error) {
      Notify.create({
        message: error.message,
        type: "negative",
        actions: [{ icon: "close", color: "white", round: true }],
      });
    }
  });
}
