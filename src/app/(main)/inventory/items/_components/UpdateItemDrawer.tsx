"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useSearchParams } from "next/navigation";
import { createItemSchema, CreateItemValues } from "@/data/schema/item";
import apiHandler from "@/data/api/ApiHandler";
import AppDrawer from "@/components/app/app-drawer";
import DynamicSelect from "./DynamicSelect";
import { useQuery } from "@/hooks/use-query";
import { useModifyQuery } from "@/hooks/use-modify-query";
import { VStack } from "@chakra-ui/react";
import { InventoryItem, mapApiToFrontendItem } from "./types";

const APP_UPDATE_INVENTORY_DRAWER = "inv_update_drawer";

interface UpdateItemDrawerProps {
  item: InventoryItem | null;
  onUpdated: (item: InventoryItem) => void;
}

export default function UpdateItemDrawer({ item, onUpdated }: UpdateItemDrawerProps) {
  const pathName = usePathname();
  const { router, searchParams, open } = useQuery(APP_UPDATE_INVENTORY_DRAWER, "true");

  const redirectUri = useModifyQuery(null, searchParams, [
    { key: APP_UPDATE_INVENTORY_DRAWER, value: "true" },
  ]);



  const discardChange = () => {
    router.push(pathName.split("?")[0]);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<CreateItemValues>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      name: "",
      sku: "",
      categoryId: "",
      vendorId: "",
      unitType: "piece",
      initialStock: 0,
      minStockLevel: 10,
      location: "",
      locationId: "",
      itemLocation: "",
      batchTracked: false,
      expiryTracked: false,
    },
  });

  const searchParamsHook = useSearchParams();
  const itemId = searchParamsHook.get("id");

  useEffect(() => {
    if (!open || !itemId) return;

    const fetchItem = async () => {
      try {
        const res = await apiHandler.items.getById(itemId);
        const data = res?.content?.data || res?.content || res;
        if (!data) return;

        reset({
          name: data.name || "",
          sku: data.sku || data.code || "",
          categoryId: data.categoryId || "",
          vendorId: data.vendorId || "",
          unitType: data.unitType || data.unit || "piece",
          initialStock: data.quantityOnHand ?? data.currentStock ?? 0,
          minStockLevel: data.minStockLevel ?? data.minStock ?? 0,
          locationId: data.locationId || "",
          itemLocation: data.itemLocation || "",
          batchTracked: data.batchTracked ?? false,
          expiryTracked: data.expiryTracked ?? false,
          description: data.description || "",
          barcode: data.barcode || "",
          storageConditions: data.storageConditions || "",
          costPrice: data.costPrice ?? undefined,
          sellingPrice: data.sellingPrice ?? undefined,
        });
      } catch (e) {
        console.error("Failed to fetch item for update", e);
      }
    };

    fetchItem();
  }, [itemId, open, reset]);

  // Clear the form when the drawer is closed
  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!itemId) return;

    try {
      const payload = {
        name: values.name,
        code: values.sku,
        sku: values.sku,
        unitType: values.unitType,
        categoryId: values.categoryId,
        vendorId: values.vendorId,
        description: values.description,
        locationId: values.locationId,
        itemLocation: values.itemLocation,
        costPrice: values.costPrice,
        sellingPrice: values.sellingPrice,
        barcode: values.barcode,
        storageConditions: values.storageConditions,
        minStockLevel: values.minStockLevel,
        quantityOnHand: values.initialStock,
        batchTracked: values.batchTracked,
        expiryTracked: values.expiryTracked,
      };

      const res = await apiHandler.items.update(itemId, payload);

      const updatedData = res?.content?.data || res?.content || res;
      let updatedItem: InventoryItem;
      if (updatedData && updatedData.id) {
        updatedItem = mapApiToFrontendItem(updatedData);
      } else {
        updatedItem = {
          id: itemId,
          name: values.name,
          category: values.categoryId || "Uncategorized",
          currentStock: values.initialStock || 0,
          minStock: values.minStockLevel || 0,
          unit: values.unitType,
          status: (values.initialStock || 0) <= (values.minStockLevel || 0) ? "Low Stock" : "Adequate",
          location: values.location || "",
          locationId: values.locationId || "",
          locationName: values.location || "",
          itemLocation: values.itemLocation || "",
          lastUpdatedDate: new Date().toISOString().split("T")[0],
          lastUpdatedBy: "Current User",
          vendorId: values.vendorId || "",
          categoryId: values.categoryId || "",
        } as InventoryItem;
      }

      onUpdated(updatedItem);
      reset();
      discardChange();
    } catch (e) {
      console.error("Failed to update inventory item", e);
    }
  });

  return (
    <AppDrawer
      title="Update Inventory Item"
      placement="end"
      size="md"
      open={open}
      redirectUri={redirectUri}
      cancelQueryKey={APP_UPDATE_INVENTORY_DRAWER}
      onSubmit={(e) => onSubmit(e) ?? Promise.resolve()}
      submitLabel="Save Changes"
      hasFooter
    >
      <VStack gap={5} align="stretch" pb={4}>
        <p className="text-sm text-blue-600 -mt-2">
          Update details for the selected inventory item
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register("name")}
              placeholder="e.g. A4 Paper"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${errors.name ? "border-red-400 focus:ring-red-300" : "border-gray-200 focus:ring-blue-400 focus:border-blue-400"
                }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU <span className="text-red-500">*</span>
            </label>
            <input
              {...register("sku")}
              placeholder="e.g. SKU-12345"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${errors.sku ? "border-red-400 focus:ring-red-300" : "border-gray-200 focus:ring-blue-400 focus:border-blue-400"
                }`}
            />
            {errors.sku && <p className="text-xs text-red-500 mt-1">{errors.sku.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <DynamicSelect
              apiConfig={apiHandler.categories}
              value={watch("categoryId") || ""}
              onChange={(id, name) => setValue("categoryId", id, { shouldValidate: true })}
              placeholder="Select Category"
              createLabel="Create category"
              defaultDisplayValue={item?.categoryName || item?.category}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <DynamicSelect
              apiConfig={apiHandler.vendors}
              value={watch("vendorId") || ""}
              onChange={(id, name) => setValue("vendorId", id, { shouldValidate: true })}
              placeholder="Select Vendor"
              createLabel="Create vendor"
              defaultDisplayValue={item?.vendorName}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Type <span className="text-red-500">*</span>
            </label>
            <input
              {...register("unitType")}
              placeholder="e.g. piece, box, ream"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${errors.unitType ? "border-red-400 focus:ring-red-300" : "border-gray-200 focus:ring-blue-400 focus:border-blue-400"
                }`}
            />
            {errors.unitType && <p className="text-xs text-red-500 mt-1">{errors.unitType.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
            <input
              {...register("barcode")}
              placeholder="Optional barcode"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
            <input
              {...register("initialStock", { valueAsNumber: true })}
              type="number"
              min="0"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${errors.initialStock ? "border-red-400 focus:ring-red-300" : "border-gray-200 focus:ring-blue-400 focus:border-blue-400"
                }`}
            />
            {errors.initialStock && <p className="text-xs text-red-500 mt-1">{errors.initialStock.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
            <input
              {...register("minStockLevel", { valueAsNumber: true })}
              type="number"
              min="0"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${errors.minStockLevel ? "border-red-400 focus:ring-red-300" : "border-gray-200 focus:ring-blue-400 focus:border-blue-400"
                }`}
            />
          </div>
        </div>

        <div className="flex gap-6 items-center py-2">
          <label className="flex items-center gap-3 w-auto cursor-pointer">
            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" {...register("batchTracked")} />
            <span className="text-sm text-gray-700 font-medium">Batch Tracked</span>
          </label>

          <label className="flex items-center gap-3 w-auto cursor-pointer">
            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" {...register("expiryTracked")} />
            <span className="text-sm text-gray-700 font-medium">Expiry Tracked</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <DynamicSelect
              apiConfig={apiHandler.locations}
              value={watch("locationId") || ""}
              onChange={(id, name) => {
                setValue("locationId", id, { shouldValidate: true });
                setValue("location", name, { shouldValidate: true }); // Syncing the readable string too
              }}
              placeholder="Select Location"
              createLabel="Create location"
              defaultDisplayValue={item?.locationName || item?.location}
            />
          </div>

          {watch("locationId") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specific Spot</label>
              <input
                {...register("itemLocation")}
                placeholder="e.g. Aisle 4, Shelf 2"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            {...register("description")}
            rows={2}
            placeholder="Optional item details"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Storage Conditions</label>
          <textarea
            {...register("storageConditions")}
            rows={2}
            placeholder="e.g. Store in a cool, dry place"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors resize-none"
          />
        </div>
      </VStack>
    </AppDrawer>
  );
}
