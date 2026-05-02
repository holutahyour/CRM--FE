"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import apiHandler from "@/data/api/ApiHandler";
import AppDrawer from "@/components/app/app-drawer";
import { useQuery } from "@/hooks/use-query";
import { useModifyQuery } from "@/hooks/use-modify-query";
import { APP_EDIT_DEPARTMENT_DRAWER } from "@/lib/routes";
import { VStack } from "@chakra-ui/react";
import { Department } from "./types";

const schema = z.object({
  name:        z.string().min(1, "Department name is required"),
  code:        z.string().min(1, "Code is required").max(10, "Max 10 characters"),
  headName:    z.string().optional(),
  description: z.string().optional(),
  budget:      z.number({ invalid_type_error: "Enter a valid budget" }).optional(),
});

type FormValues = z.infer<typeof schema>;

interface EditDepartmentDrawerProps {
  dept: Department | null;
  onUpdated: (dept: Department) => void;
  onClose: () => void;
}

export default function EditDepartmentDrawer({ dept, onUpdated, onClose }: EditDepartmentDrawerProps) {
  const pathName = usePathname();
  const { router, searchParams, open } = useQuery(APP_EDIT_DEPARTMENT_DRAWER, "true");

  const redirectUri = useModifyQuery(null, searchParams, [
    { key: APP_EDIT_DEPARTMENT_DRAWER, value: "true" },
  ]);

  const discardChange = () => {
    onClose();
    router.push(pathName.split("?")[0]);
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", code: "", headName: "", description: "", budget: undefined },
  });

  // Populate form whenever the selected department changes
  useEffect(() => {
    if (dept) {
      reset({
        name:        dept.name ?? "",
        code:        dept.code ?? dept.departmentId ?? "",
        headName:    dept.headName ?? dept.head?.name ?? "",
        description: dept.description ?? "",
        budget:      dept.budget ?? dept.totalBudget ?? undefined,
      });
    }
  }, [dept, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!dept) return;
    try {
      const res = await apiHandler.departments.update(dept.id, {
        name:        values.name,
        code:        values.code.toUpperCase(),
        headName:    values.headName || undefined,
        description: values.description || undefined,
        budget:      values.budget || undefined,
      });

      const updated: Department =
        (res as any)?.isSuccess && (res as any).content
          ? (res as any).content
          : (res as any)?.id
          ? (res as any)
          : {
              ...dept,
              name:        values.name,
              code:        values.code.toUpperCase(),
              headName:    values.headName,
              description: values.description,
              budget:      values.budget,
            };

      onUpdated(updated);
      discardChange();
    } catch (e) {
      console.error("Failed to update department", e);
    }
  });

  const inputBase = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors";
  const inputOk   = "border-gray-200 focus:ring-green-400 focus:border-green-400";
  const inputErr  = "border-red-400 focus:ring-red-300";

  return (
    <AppDrawer
      title="Edit Department"
      placement="end"
      size="md"
      open={open}
      redirectUri={redirectUri}
      cancelQueryKey={APP_EDIT_DEPARTMENT_DRAWER}
      onSubmit={(e) => onSubmit(e) ?? Promise.resolve()}
      submitLabel="Save Changes"
      hasFooter
    >
      <VStack gap={5} align="stretch" pb={4}>
        <p className="text-sm text-green-600 -mt-2">
          Update the department details below
        </p>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register("name")}
            placeholder="e.g., Operations"
            className={`${inputBase} ${errors.name ? inputErr : inputOk}`}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>

        {/* Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department Code <span className="text-red-500">*</span>
          </label>
          <input
            {...register("code")}
            placeholder="e.g., OPS"
            maxLength={10}
            className={`${inputBase} uppercase ${errors.code ? inputErr : inputOk}`}
          />
          {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code.message}</p>}
        </div>

        {/* Head */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department Head</label>
          <input
            {...register("headName")}
            placeholder="e.g., Tom Operations"
            className={`${inputBase} ${inputOk}`}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Brief description of the department's role"
            className={`${inputBase} resize-none ${inputOk}`}
          />
        </div>

        {/* Budget */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Budget (₦)</label>
          <input
            {...register("budget", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
            type="number"
            min="0"
            placeholder="e.g., 2500000"
            className={`${inputBase} ${errors.budget ? inputErr : inputOk}`}
          />
          {errors.budget && <p className="text-xs text-red-500 mt-1">{errors.budget.message}</p>}
        </div>
      </VStack>
    </AppDrawer>
  );
}
