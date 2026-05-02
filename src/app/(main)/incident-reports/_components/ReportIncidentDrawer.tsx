"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePathname } from "next/navigation";
import apiHandler from "@/data/api/ApiHandler";
import AppDrawer from "@/components/app/app-drawer";
import { useQuery } from "@/hooks/use-query";
import { useModifyQuery } from "@/hooks/use-modify-query";
import { APP_INCIDENT_DRAWER } from "@/lib/routes";
import { VStack } from "@chakra-ui/react";
import { Incident } from "./types";

const reportIncidentSchema = z.object({
  deviceName:   z.string().min(1, "Device name is required"),
  deviceCode:   z.string().min(1, "Device code/ID is required"),
  severity:     z.enum(["low", "medium", "high", "critical"], { required_error: "Severity is required" }),
  description:  z.string().min(5, "Please describe the issue"),
  departmentId: z.string().optional(),
});

type ReportIncidentValues = z.infer<typeof reportIncidentSchema>;

interface ReportIncidentDrawerProps {
  departments: { id: string; name: string }[];
  onCreated: (incident: Incident) => void;
}

export default function ReportIncidentDrawer({ departments, onCreated }: ReportIncidentDrawerProps) {
  const pathName = usePathname();
  const { router, searchParams, open } = useQuery(APP_INCIDENT_DRAWER, "true");

  const redirectUri = useModifyQuery(null, searchParams, [
    { key: APP_INCIDENT_DRAWER, value: "true" },
  ]);

  const discardChange = () => {
    router.push(pathName.split("?")[0]);
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ReportIncidentValues>({
    resolver: zodResolver(reportIncidentSchema),
    defaultValues: { deviceName: "", deviceCode: "", severity: "medium", description: "", departmentId: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const res = await apiHandler.incidents.create({
        deviceName:   values.deviceName,
        deviceCode:   values.deviceCode,
        severity:     values.severity,
        description:  values.description,
        departmentId: values.departmentId || undefined,
      });
      const created: Incident = res?.isSuccess && res.content
        ? res.content
        : res?.id
          ? res
          : {
              id: `temp-${Date.now()}`,
              deviceName:    values.deviceName,
              deviceCode:    values.deviceCode,
              severity:      values.severity,
              status:        "open",
              description:   values.description,
              departmentName: departments.find(d => d.id === values.departmentId)?.name,
            } as Incident;
      onCreated(created);
      reset();
      discardChange();
    } catch (e) {
      console.error("Failed to report incident", e);
    }
  });

  const inputBase =
    "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors";
  const inputOk = "border-gray-200 focus:ring-green-400 focus:border-green-400";
  const inputErr = "border-red-400 focus:ring-red-300";

  return (
    <AppDrawer
      title="Report Device Incident"
      placement="end"
      size="md"
      open={open}
      redirectUri={redirectUri}
      cancelQueryKey={APP_INCIDENT_DRAWER}
      onSubmit={(e) => onSubmit(e) ?? Promise.resolve()}
      submitLabel="Submit Report"
      hasFooter
    >
      <VStack gap={5} align="stretch" pb={4}>
        <p className="text-sm text-red-500 -mt-2">
          Report a device-related incident for tracking and resolution
        </p>

        {/* Device Name + Code */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register("deviceName")}
              placeholder="e.g. Laptop, Printer"
              className={`${inputBase} ${errors.deviceName ? inputErr : inputOk}`}
            />
            {errors.deviceName && (
              <p className="text-xs text-red-500 mt-1">{errors.deviceName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device Code / ID <span className="text-red-500">*</span>
            </label>
            <input
              {...register("deviceCode")}
              placeholder="e.g. LP-1234"
              className={`${inputBase} ${errors.deviceCode ? inputErr : inputOk}`}
            />
            {errors.deviceCode && (
              <p className="text-xs text-red-500 mt-1">{errors.deviceCode.message}</p>
            )}
          </div>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Severity <span className="text-red-500">*</span>
          </label>
          <select
            {...register("severity")}
            className={`${inputBase} bg-white ${errors.severity ? inputErr : inputOk}`}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          {errors.severity && (
            <p className="text-xs text-red-500 mt-1">{errors.severity.message}</p>
          )}
        </div>

        {/* Department */}
        {departments.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              {...register("departmentId")}
              className={`${inputBase} bg-white ${inputOk}`}
            >
              <option value="">Select a department...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Issue Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Issue Description <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register("description")}
            rows={4}
            placeholder="Describe the issue in detail..."
            className={`${inputBase} resize-none ${errors.description ? inputErr : inputOk}`}
          />
          {errors.description && (
            <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>
          )}
        </div>
      </VStack>
    </AppDrawer>
  );
}
