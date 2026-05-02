"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePathname } from "next/navigation";
import apiHandler from "@/data/api/ApiHandler";
import AppDrawer from "@/components/app/app-drawer";
import { useQuery } from "@/hooks/use-query";
import { useModifyQuery } from "@/hooks/use-modify-query";
import { APP_ADD_USER_DRAWER } from "@/lib/routes";
import { VStack } from "@chakra-ui/react";
import { CrmUser } from "./types";
import { useState, useEffect } from "react";

const schema = z.object({
  name:         z.string().min(1, "Full name is required"),
  email:        z.string().email("Valid email is required"),
  role:         z.string().min(1, "Role is required"),
  departmentId: z.string().optional(),
  accessLevel:  z.number().int().min(1).max(5),
});

type FormValues = z.infer<typeof schema>;

const ROLES = [
  "Administrator",
  "Finance",
  "Inventory Officer",
  "ICT Administrator",
  "Department User",
  "HR Manager",
  "Auditor",
];

interface AddUserDrawerProps {
  onCreated: (user: CrmUser) => void;
}

export default function AddUserDrawer({ onCreated }: AddUserDrawerProps) {
  const pathName = usePathname();
  const { router, searchParams, open } = useQuery(APP_ADD_USER_DRAWER, "true");

  const redirectUri = useModifyQuery(null, searchParams, [
    { key: APP_ADD_USER_DRAWER, value: "true" },
  ]);

  const discardChange = () => {
    router.push(pathName.split("?")[0]);
  };

  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (open) {
      apiHandler.departments.list().then((res: any) => {
        const arr =
          res?.isSuccess && Array.isArray(res.content)
            ? res.content
            : Array.isArray(res) ? res : [];
        setDepartments(arr);
      }).catch(() => {});
    }
  }, [open]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:         "",
      email:        "",
      role:         "",
      departmentId: "",
      accessLevel:  1,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const res = await apiHandler.users.create({
        name:         values.name,
        email:        values.email,
        role:         values.role,
        departmentId: values.departmentId || undefined,
        accessLevel:  values.accessLevel,
      } as any);
      const created: CrmUser =
        (res as any)?.isSuccess && (res as any).content
          ? (res as any).content
          : (res as any)?.id
            ? (res as any)
            : {
                id:             `temp-${Date.now()}`,
                name:           values.name,
                email:          values.email,
                role:           values.role,
                accessLevel:    values.accessLevel,
                departmentName: departments.find(d => d.id === values.departmentId)?.name,
                isOnboarded:    false,
                isActive:       false,
              };
      onCreated(created);
      reset();
      discardChange();
    } catch (e) {
      console.error("Failed to create user", e);
    }
  });

  const inputBase = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors";
  const inputOk   = "border-gray-200 focus:ring-green-400 focus:border-green-400";
  const inputErr  = "border-red-400 focus:ring-red-300";

  return (
    <AppDrawer
      title="Add New User"
      placement="end"
      size="md"
      open={open}
      redirectUri={redirectUri}
      cancelQueryKey={APP_ADD_USER_DRAWER}
      onSubmit={(e) => onSubmit(e) ?? Promise.resolve()}
      submitLabel="Add User"
      hasFooter
    >
      <VStack gap={5} align="stretch" pb={4}>
        <p className="text-sm text-green-600 -mt-2">
          Manage user access and track activity
        </p>

        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register("name")}
            placeholder="e.g., John Smith"
            className={`${inputBase} ${errors.name ? inputErr : inputOk}`}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            {...register("email")}
            type="email"
            placeholder="e.g., john@company.com"
            className={`${inputBase} ${errors.email ? inputErr : inputOk}`}
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role <span className="text-red-500">*</span>
          </label>
          <select
            {...register("role")}
            className={`${inputBase} bg-white ${errors.role ? inputErr : inputOk}`}
          >
            <option value="">Select a role...</option>
            {ROLES.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role.message}</p>}
        </div>

        {/* Department */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <select
            {...register("departmentId")}
            className={`${inputBase} bg-white ${inputOk}`}
          >
            <option value="">Select a department...</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Access Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Access Level <span className="text-red-500">*</span>
          </label>
          <select
            {...register("accessLevel", { valueAsNumber: true })}
            className={`${inputBase} bg-white ${errors.accessLevel ? inputErr : inputOk}`}
          >
            {[1, 2, 3, 4, 5].map(l => (
              <option key={l} value={l}>Level {l}</option>
            ))}
          </select>
          {errors.accessLevel && <p className="text-xs text-red-500 mt-1">{errors.accessLevel.message}</p>}
        </div>
      </VStack>
    </AppDrawer>
  );
}
