import { z } from "zod";

/**
 * Untrusted checkout input only. Never accept prices, totals, stock levels,
 * product names, or payment status from the browser as authoritative.
 * The server endpoint re-fetches products and calculates totals
 * from the database before creating an order.
 */
const trimmedText = (max: number) => z.string().trim().min(1).max(max);

const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(30)
  .regex(/^[+0-9() .-]+$/, "Enter a valid phone number.")
  .refine(
    (phone) => (phone.match(/[0-9]/g) ?? []).length >= 7,
    "Enter a phone number containing at least 7 digits.",
  );

export const checkoutRequestSchema = z
  .object({
    requestKey: z.string().uuid(),
    customer: z.object({
      name: trimmedText(120),
      phone: phoneSchema,
      email: z.union([z.literal(""), z.string().trim().email().max(254)]).optional().default(""),
    }).strict(),
    fulfilmentMethod: z.enum(["delivery", "pickup"]),
    deliveryAddress: z.object({
      address: z.string().trim().max(240),
      city: z.string().trim().max(100),
      state: z.string().trim().max(100),
    }).strict(),
    customerNote: z.string().trim().max(1000).optional().default(""),
    items: z.array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
      }).strict(),
    ).min(1).max(50),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.fulfilmentMethod === "delivery") {
      for (const field of ["address", "city", "state"] as const) {
        if (!value.deliveryAddress[field].trim()) {
          ctx.addIssue({
            code: "custom",
            path: ["deliveryAddress", field],
            message: "This field is required for delivery.",
          });
        }
      }
    }

    const ids = value.items.map((item) => item.productId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "Each product must appear only once; combine quantities for duplicate products.",
      });
    }
  });

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
