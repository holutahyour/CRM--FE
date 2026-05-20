"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader, Upload, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { createRequisitionSchema, CreateRequisitionValues } from "@/data/schema/requisition";
import apiHandler from "@/data/api/ApiHandler";
import AppDrawer from "@/components/app/app-drawer";
import { useQuery } from "@/hooks/use-query";
import { useModifyQuery } from "@/hooks/use-modify-query";
import { APP_REQUISITION_DRAWER } from "@/lib/routes";
import { VStack } from "@chakra-ui/react";


interface CreateRequisitionFormProps {
  onCreated: (req: any) => void;
}

export default function CreateRequisitionForm({ onCreated }: CreateRequisitionFormProps) {
  const pathName = usePathname();

  // open = true when ?req_drawer=true is present in the URL
  const { router, searchParams, open } = useQuery(APP_REQUISITION_DRAWER, "true");

  const [departments, setDepartments] = useState<any[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      const fetchDepartments = async () => {
        setLoadingDepts(true);
        try {
          const res = await apiHandler.departments.list();
          if (res?.isSuccess && Array.isArray(res.content)) {
            setDepartments(res.content);
          } else if (Array.isArray(res)) {
            setDepartments(res);
          } else if (res?.items) {
            setDepartments(res.items);
          } else if (res?.data) {
            setDepartments(res.data);
          }
        } catch (e) {
          console.error("Failed to fetch departments", e);
        } finally {
          setLoadingDepts(false);
        }
      };
      fetchDepartments();
    }
  }, [open]);

  // URL to navigate to when the drawer closes (removes req_drawer param)
  const redirectUri = useModifyQuery(null, searchParams, [
    { key: APP_REQUISITION_DRAWER, value: "true" },
  ]);

  const discardChange = () => {
    router.push(pathName.split("?")[0]);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) setUploadedFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "image/*": [".png", ".jpg", ".jpeg"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateRequisitionValues>({
    resolver: zodResolver(createRequisitionSchema),
    defaultValues: { title: "", amount: 0, description: "", departmentId: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("amount", values.amount.toString());
      if (values.description) formData.append("description", values.description);
      formData.append("departmentId", values.departmentId);
      if (uploadedFile) formData.append("file", uploadedFile);

      const res = await apiHandler.requisitions.createWithFile(formData);
      if (res?.isSuccess && res.content) {
        onCreated(res.content);
      }
      reset();
      setUploadedFile(null);
      discardChange();
    } catch (e) {
      console.error("Failed to create requisition", e);
    }
  });

  return (
    <AppDrawer
      title="Create New Requisition"
      placement="end"
      size="md"
      open={open}
      redirectUri={redirectUri}
      cancelQueryKey={APP_REQUISITION_DRAWER}
      onSubmit={onSubmit}
      submitLabel="Submit Requisition"
      hasFooter
    >
      <VStack gap={5} align="stretch">
        {/* Subtitle */}
        <p className="text-sm text-green-600 -mt-2">
          Submit a new requisition for finance approval
        </p>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            {...register("title")}
            placeholder="Requisition title"
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${errors.title
              ? "border-red-400 focus:ring-red-300"
              : "border-gray-200 focus:ring-green-400 focus:border-green-400"
              }`}
          />
          {errors.title && (
            <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Department */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Department <span className="text-red-500">*</span>
          </label>
          <select
            {...register("departmentId")}
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors bg-white ${errors.departmentId
              ? "border-red-400 focus:ring-red-300"
              : "border-gray-200 focus:ring-green-400 focus:border-green-400"
              }`}
            disabled={loadingDepts}
          >
            <option value="">Select a department...</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {errors.departmentId && (
            <p className="text-xs text-red-500 mt-1">{errors.departmentId.message}</p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount (₦)
          </label>
          <input
            {...register("amount", { valueAsNumber: true })}
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${errors.amount
              ? "border-red-400 focus:ring-red-300"
              : "border-gray-200 focus:ring-green-400 focus:border-green-400"
              }`}
          />
          {errors.amount && (
            <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>
          )}
        </div>

        {/* Description */}
        {/* <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            {...register("description")}
            rows={4}
            placeholder="Provide details about this requisition"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-colors"
          />
        </div> */}

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Requisition File <span className="text-gray-400 text-xs">(optional)</span>
          </label>
          {uploadedFile ? (
            <div className="flex items-center justify-between border border-green-200 bg-green-50 rounded-lg px-3 py-2">
              <span className="text-sm text-green-700">{uploadedFile.name}</span>
              <button
                type="button"
                onClick={() => setUploadedFile(null)}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg px-4 py-6 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-green-400 bg-green-50"
                  : "border-gray-200 hover:border-green-300"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">
                {isDragActive
                  ? "Drop file here"
                  : "Drag & drop PDF or image, or click to browse"}
              </p>
              <p className="text-xs text-gray-400 mt-1">Max 10 MB</p>
            </div>
          )}
        </div>
      </VStack>
    </AppDrawer>
  );
}
