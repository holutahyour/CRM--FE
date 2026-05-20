"use client";

import { useState, useCallback, useRef } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Grip, Plus, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { VStack } from "@chakra-ui/react";
import AppDrawer from "@/components/app/app-drawer";
import { useQuery } from "@/hooks/use-query";
import { useModifyQuery } from "@/hooks/use-modify-query";
import { APP_WORKFLOW_DRAWER } from "@/lib/routes";
import { IWorkflowStepRequest } from "@/data/interface/IWorkflow";
import apiHandler from "@/data/api/ApiHandler";

const DRAG_TYPE = "STEP";

interface Role {
  id: string;
  name: string;
}

interface DraggableStepProps {
  index: number;
  step: IWorkflowStepRequest;
  roles: Role[];
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onChangeName: (index: number, value: string) => void;
  onChangeRole: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}

function DraggableStep({
  index,
  step,
  roles,
  onMove,
  onChangeName,
  onChangeRole,
  onRemove,
}: DraggableStepProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: DRAG_TYPE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop<{ index: number }>({
    accept: DRAG_TYPE,
    hover(item) {
      if (item.index === index) return;
      onMove(item.index, index);
      item.index = index;
    },
  });

  drop(dragPreview(ref));

  const inputBase =
    "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors border-gray-200 focus:ring-green-400 focus:border-green-400";

  return (
    <div
      ref={ref}
      className={`flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm transition-opacity ${
        isDragging ? "opacity-40" : "opacity-100"
      }`}
    >
      {/* Drag handle */}
      <div ref={drag as any} className="cursor-grab text-gray-400 shrink-0">
        <Grip className="w-4 h-4" />
      </div>

      {/* Step order badge */}
      <span className="text-xs font-semibold text-gray-400 w-5 shrink-0">
        {index + 1}.
      </span>

      {/* Step name */}
      <input
        value={step.stepName}
        onChange={(e) => onChangeName(index, e.target.value)}
        placeholder="Step name"
        className={`${inputBase} flex-1 min-w-0`}
      />

      {/* Role dropdown */}
      <select
        value={step.roleId}
        onChange={(e) => onChangeRole(index, e.target.value)}
        className={`${inputBase} flex-1 min-w-0 bg-white`}
      >
        <option value="">Select role...</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="text-red-400 hover:text-red-600 transition-colors shrink-0"
        title="Remove step"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

interface WorkflowStepsDrawerProps {
  templateId: string;
  initialSteps: IWorkflowStepRequest[];
  roles: Role[];
  onSaved: () => void;
}

function WorkflowStepsDrawerInner({
  templateId,
  initialSteps,
  roles,
  onSaved,
}: WorkflowStepsDrawerProps) {
  const pathName = usePathname();
  const { router, searchParams, open } = useQuery(APP_WORKFLOW_DRAWER, templateId);

  const redirectUri = useModifyQuery(null, searchParams, [
    { key: APP_WORKFLOW_DRAWER, value: templateId },
  ]);

  const [steps, setSteps] = useState<IWorkflowStepRequest[]>(initialSteps);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reset local steps whenever the drawer opens with fresh initialSteps
  const prevOpenRef = useRef(false);
  if (open && !prevOpenRef.current) {
    setSteps(initialSteps);
    setError(null);
  }
  prevOpenRef.current = open;

  const handleMove = useCallback((dragIndex: number, hoverIndex: number) => {
    setSteps((prev) => {
      const next = [...prev];
      const [dragged] = next.splice(dragIndex, 1);
      next.splice(hoverIndex, 0, dragged);
      return next.map((s, i) => ({ ...s, stepOrder: i + 1 }));
    });
  }, []);

  const handleChangeName = useCallback((index: number, value: string) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, stepName: value } : s))
    );
  }, []);

  const handleChangeRole = useCallback((index: number, value: string) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, roleId: value } : s))
    );
  }, []);

  const handleRemove = useCallback((index: number) => {
    setSteps((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, stepOrder: i + 1 }))
    );
  }, []);

  const handleAdd = () => {
    setSteps((prev) => [
      ...prev,
      { stepName: "", stepOrder: prev.length + 1, roleId: "" },
    ]);
  };

  const handleSubmit = async () => {
    setError(null);
    for (const s of steps) {
      if (!s.stepName.trim()) {
        setError("All steps must have a name.");
        return;
      }
      if (!s.roleId) {
        setError("All steps must have a role assigned.");
        return;
      }
    }
    if (steps.length === 0) {
      setError("At least one step is required.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = steps.map((s, i) => ({
        ...s,
        stepOrder: i + 1,
      }));
      await apiHandler.workflowTemplates.upsertSteps(templateId, payload);
      onSaved();
      router.push(pathName.split("?")[0]);
    } catch (e) {
      console.error("Failed to save workflow steps", e);
      setError("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppDrawer
      title="Edit Workflow Steps"
      placement="end"
      size="md"
      open={open}
      redirectUri={redirectUri}
      cancelQueryKey={APP_WORKFLOW_DRAWER}
      onSubmit={() => handleSubmit()}
      submitLabel={isSaving ? "Saving..." : "Save Steps"}
      hasFooter
      onDiscardChange={() => router.push(pathName.split("?")[0])}
    >
      <VStack gap={4} align="stretch" pb={4}>
        <p className="text-sm text-gray-500">
          Drag steps to reorder. Each step requires a name and an assigned role.
        </p>

        {error && (
          <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {steps.map((step, index) => (
            <DraggableStep
              key={`step-${index}`}
              index={index}
              step={step}
              roles={roles}
              onMove={handleMove}
              onChangeName={handleChangeName}
              onChangeRole={handleChangeRole}
              onRemove={handleRemove}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium transition-colors mt-1"
        >
          <Plus className="w-4 h-4" />
          Add Step
        </button>
      </VStack>
    </AppDrawer>
  );
}

export default function WorkflowStepsDrawer(props: WorkflowStepsDrawerProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <WorkflowStepsDrawerInner {...props} />
    </DndProvider>
  );
}
