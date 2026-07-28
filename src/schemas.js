import { z } from "zod";

// ---- Coordinate schema: rejects '' / null / undefined instead of coercing to 0 ----
const coordinatesSchema = (min, max, label) =>
  z.preprocess(
    (val) =>
      val === "" || val === null || val === undefined ? undefined : val,
    z.coerce
      .number({ required_error: `${label} is required` })
      .min(min, `${label} must be between ${min} and ${max}`)
      .max(max, `${label} must be between ${min} and ${max}`),
  );

export const fieldSchema = {
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title must be at most 100 characters"),

  description: z
    .string()
    .trim()
    .max(1000, "Description must be at most 1000 characters")
    .optional(),

  latitude: coordinatesSchema(-90, 90, "Latitude"),
  longitude: coordinatesSchema(-180, 180, "Longitude"),
};

export const featureSchema = z.object(fieldSchema);
