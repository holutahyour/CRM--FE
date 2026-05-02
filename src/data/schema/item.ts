import { z } from "zod";

export const createItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  sku: z.string().min(1, "SKU is required"),
  categoryId: z.string().optional(),
  vendorId: z.string().optional(),
  description: z.string().optional(),
  unitType: z.string().min(1, "Unit type (e.g., piece) is required"),
  barcode: z.string().optional(),
  batchTracked: z.boolean().default(false),
  expiryTracked: z.boolean().default(false),
  minStockLevel: z.number().min(0).optional(),
  reorderQuantity: z.number().min(0).optional(),
  costPrice: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  imageUrl: z.string().optional(),
  storageConditions: z.string().optional(),
  // Keep these if you want to initialize stock upon creation
  initialStock: z.number().min(0, "Stock cannot be negative").optional(),
  location: z.string().optional(), // Kept for backward compatibility
  locationId: z.string().optional(),
  itemLocation: z.string().optional(),
});

export type CreateItemValues = z.infer<typeof createItemSchema>;
