"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePathname } from "next/navigation";
import { MONTH_NAMES, MonthlyReport } from "./types";
import apiHandler from "@/data/api/ApiHandler";
import AppDrawer from "@/components/app/app-drawer";
import { useQuery } from "@/hooks/use-query";
import { useModifyQuery } from "@/hooks/use-modify-query";
import { APP_MONTHLY_REPORT_DRAWER } from "@/lib/routes";
import { VStack } from "@chakra-ui/react";

const schema = z.object({
  goalTitle:     z.string().min(1, "Goal title is required"),
  month:         z.string().min(1, "Month is required"),
  year:          z.string().min(1, "Year is required"),
  targetValue:   z.number().min(0, "Target value must be ≥ 0"),
  achievedValue: z.number().min(0, "Achieved value must be ≥ 0"),
  notes:         z.string().optional(),
  departmentId:  z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface SubmitReportDrawerProps {
  departments: { id: string; name: string }[];
  onCreated: (report: MonthlyReport) => void;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

export default function SubmitReportDrawer({ departments, onCreated }: SubmitReportDrawerProps) {
  const pathName = usePathname();
  const { router, searchParams, open } = useQuery(APP_MONTHLY_REPORT_DRAWER, "true");

  const redirectUri = useModifyQuery(null, searchParams, [
    { key: APP_MONTHLY_REPORT_DRAWER, value: "true" },
  ]);

  const discardChange = () => {
    router.push(pathName.split("?")[0]);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      goalTitle:     "",
      month:         MONTH_NAMES[new Date().getMonth()],
      year:          currentYear.toString(),
      targetValue:   0,
      achievedValue: 0,
      notes:         "",
      departmentId:  "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const res = await apiHandler.monthlyReports.create({
        goalTitle:     values.goalTitle,
        targetValue:   values.targetValue,
        achievedValue: values.achievedValue,
        month:         values.month,
        year:          values.year,
        notes:         values.notes,
        departmentId:  values.departmentId || undefined,
      });
      const created: MonthlyReport =
        res?.isSuccess && res.content
          ? res.content
          : res?.id
            ? res
            : {
                id:             `temp-${Date.now()}`,
                goalTitle:      values.goalTitle,
                targetValue:    values.targetValue,
                achievedValue:  values.achievedValue,
                month:          values.month,
                year:           values.year,
                notes:          values.notes,
                departmentName: departments.find(d => d.id === values.departmentId)?.name,
              } as MonthlyReport;
      onCreated(created);
      reset();
      discardChange();
    } catch (e) {
      console.error("Failed to submit monthly report", e);
    }
  });

  const inputBase = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors";
  const inputOk   = "border-gray-200 focus:ring-green-400 focus:border-green-400";
  const inputErr  = "border-red-400 focus:ring-red-300";

  return (
    <AppDrawer
      title="Submit Monthly Report"
      placement="end"
      size="md"
      open={open}
      redirectUri={redirectUri}
      cancelQueryKey={APP_MONTHLY_REPORT_DRAWER}
      onSubmit={(e) => onSubmit(e) ?? Promise.resolve()}
      submitLabel="Submit Report"
      hasFooter
    >
      <VStack gap={5} align="stretch" pb={4}>
        <p className="text-sm text-green-600 -mt-2">
          Record your monthly goal achievements
        </p>

        {/* Month + Year */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              {...register("month")}
              className={`${inputBase} bg-white ${errors.month ? inputErr : inputOk}`}
            >
              {MONTH_NAMES.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              {...register("year")}
              className={`${inputBase} bg-white ${errors.year ? inputErr : inputOk}`}
            >
              {years.map(y => (
                <option key={y} value={y.toString()}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Goal Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Goal Title <span className="text-red-500">*</span>
          </label>
          <input
            {...register("goalTitle")}
            placeholder="e.g., Sales Target, Lead Generation"
            className={`${inputBase} ${errors.goalTitle ? inputErr : inputOk}`}
          />
          {errors.goalTitle && (
            <p className="text-xs text-red-500 mt-1">{errors.goalTitle.message}</p>
          )}
        </div>

        {/* Target + Achieved */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
            <input
              {...register("targetValue", { valueAsNumber: true })}
              type="number"
              min="0"
              placeholder="0"
              className={`${inputBase} ${errors.targetValue ? inputErr : inputOk}`}
            />
            {errors.targetValue && (
              <p className="text-xs text-red-500 mt-1">{errors.targetValue.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Achieved Value</label>
            <input
              {...register("achievedValue", { valueAsNumber: true })}
              type="number"
              min="0"
              placeholder="0"
              className={`${inputBase} ${errors.achievedValue ? inputErr : inputOk}`}
            />
            {errors.achievedValue && (
              <p className="text-xs text-red-500 mt-1">{errors.achievedValue.message}</p>
            )}
          </div>
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
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            {...register("notes")}
            rows={4}
            placeholder="Add any relevant notes or comments"
            className={`${inputBase} resize-none ${inputOk}`}
          />
        </div>
      </VStack>
    </AppDrawer>
  );
}
