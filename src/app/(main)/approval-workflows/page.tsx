"use client";

import { useState, useEffect, useCallback } from "react";
import { GitBranch, Loader, Settings2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import apiHandler from "@/data/api/ApiHandler";
import { useModifyQuery } from "@/hooks/use-modify-query";
import { APP_WORKFLOW_DRAWER } from "@/lib/routes";
import { IWorkflowTemplate, IWorkflowStepRequest } from "@/data/interface/IWorkflow";
import ApprovalWorkflowStepper from "@/components/app/ApprovalWorkflowStepper";
import WorkflowStepsDrawer from "./_components/WorkflowStepsDrawer";

const USE_MOCK = process.env.NEXT_PUBLIC_DISABLE_MOCK_DATA !== "true";

const MOCK_TEMPLATES: IWorkflowTemplate[] = [
  {
    id: "mock-req-template",
    workflowType: 1,
    name: "Requisitions Workflow",
    isActive: true,
    steps: [
      { id: "s1", stepOrder: 1, stepName: "Line Manager", roleId: "role-1", roleName: "Manager" },
      { id: "s2", stepOrder: 2, stepName: "Finance Review", roleId: "role-2", roleName: "Finance Officer" },
      { id: "s3", stepOrder: 3, stepName: "Director Approval", roleId: "role-3", roleName: "Director" },
    ],
  },
  {
    id: "mock-ir-template",
    workflowType: 2,
    name: "Item Requests Workflow",
    isActive: true,
    steps: [
      { id: "s4", stepOrder: 1, stepName: "Supervisor", roleId: "role-1", roleName: "Manager" },
      { id: "s5", stepOrder: 2, stepName: "Procurement", roleId: "role-4", roleName: "Procurement Officer" },
    ],
  },
];

const MOCK_ROLES: { id: string; name: string }[] = [
  { id: "role-1", name: "Manager" },
  { id: "role-2", name: "Finance Officer" },
  { id: "role-3", name: "Director" },
  { id: "role-4", name: "Procurement Officer" },
];

const WORKFLOW_TYPE_LABELS: Record<number, string> = {
  1: "Requisitions",
  2: "Item Requests",
};

const WORKFLOW_TYPES = [1, 2];

interface WorkflowCardProps {
  workflowType: number;
  template: IWorkflowTemplate | undefined;
  roles: { id: string; name: string }[];
  onEditClick: (template: IWorkflowTemplate | null, type: number) => void;
  editUrl: string;
}

function WorkflowCard({
  workflowType,
  template,
  roles,
  onEditClick,
  editUrl,
}: WorkflowCardProps) {
  const router = useRouter();
  const label = WORKFLOW_TYPE_LABELS[workflowType] ?? `Type ${workflowType}`;

  const steps = template?.steps ?? [];
  const stepperSteps = steps
    .slice()
    .sort((a, b) => a.stepOrder - b.stepOrder)
    .map((s) => ({ name: s.stepName, status: "waiting" as const }));

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
      {/* Card header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">{label}</h2>
            {template && (
              <p className="text-xs text-gray-400 mt-0.5">{template.name}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            onEditClick(template ?? null, workflowType);
            router.push(editUrl);
          }}
          className="flex items-center gap-1.5 text-sm text-white bg-[#7cc843] hover:bg-[#68a638] px-3 py-1.5 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Edit Steps
        </button>
      </div>

      {/* Steps stepper */}
      <div>
        {steps.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No steps configured</p>
        ) : (
          <ApprovalWorkflowStepper steps={stepperSteps} />
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-gray-400 pt-1 border-t border-gray-50">
        <span>{steps.length} step{steps.length !== 1 ? "s" : ""}</span>
        {template && (
          <span
            className={`px-2 py-0.5 rounded-full font-medium ${
              template.isActive
                ? "bg-green-50 text-green-600"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {template.isActive ? "Active" : "Inactive"}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ApprovalWorkflowsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [templates, setTemplates] = useState<IWorkflowTemplate[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Which template is being edited (for the drawer)
  const [activeTemplate, setActiveTemplate] = useState<IWorkflowTemplate | null>(null);
  const [activeType, setActiveType] = useState<number>(1);

  // Build edit URLs for each workflow type (value = template ID or a placeholder)
  const reqTemplate = templates.find((t) => t.workflowType === 1);
  const irTemplate = templates.find((t) => t.workflowType === 2);

  const reqDrawerUrl = useModifyQuery(
    null,
    searchParams,
    [{ key: APP_WORKFLOW_DRAWER, value: reqTemplate?.id ?? "new-req" }],
    "set"
  );
  const irDrawerUrl = useModifyQuery(
    null,
    searchParams,
    [{ key: APP_WORKFLOW_DRAWER, value: irTemplate?.id ?? "new-ir" }],
    "set"
  );

  const fetchData = useCallback(async () => {
    try {
      if (USE_MOCK) {
        setTemplates(MOCK_TEMPLATES);
        setRoles(MOCK_ROLES);
        return;
      }

      const [templatesRes, rolesRes] = await Promise.all([
        apiHandler.workflowTemplates.list(),
        apiHandler.roles.list(),
      ]);

      if (templatesRes?.isSuccess && Array.isArray(templatesRes.content)) {
        setTemplates(templatesRes.content);
      } else if (Array.isArray(templatesRes)) {
        setTemplates(templatesRes as IWorkflowTemplate[]);
      }

      const rArr =
        rolesRes?.isSuccess && Array.isArray(rolesRes.content)
          ? rolesRes.content
          : Array.isArray(rolesRes)
          ? rolesRes
          : [];
      setRoles(rArr);
    } catch (e) {
      console.error("Failed to fetch approval workflows data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleSaved = useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Determine the drawer's templateId and initial steps based on activeTemplate
  const drawerTemplateId =
    activeTemplate?.id ??
    (activeType === 1 ? reqTemplate?.id ?? "new-req" : irTemplate?.id ?? "new-ir");

  const drawerInitialSteps: IWorkflowStepRequest[] = (
    activeTemplate?.steps ?? []
  )
    .slice()
    .sort((a, b) => a.stepOrder - b.stepOrder)
    .map((s) => ({
      stepName: s.stepName,
      stepOrder: s.stepOrder,
      roleId: s.roleId,
      userId: s.userId,
    }));

  return (
    <div className="p-6 space-y-6">
      {/* Drawer — single instance, switches template via key */}
      <WorkflowStepsDrawer
        key={drawerTemplateId}
        templateId={drawerTemplateId}
        initialSteps={drawerInitialSteps}
        roles={roles}
        onSaved={handleSaved}
      />

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approval Workflows</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure multi-step approval chains for requisitions and item requests
          </p>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Loader className="w-6 h-6 text-green-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WorkflowCard
            workflowType={1}
            template={reqTemplate}
            roles={roles}
            onEditClick={(tpl, type) => {
              setActiveTemplate(tpl);
              setActiveType(type);
            }}
            editUrl={reqDrawerUrl}
          />
          <WorkflowCard
            workflowType={2}
            template={irTemplate}
            roles={roles}
            onEditClick={(tpl, type) => {
              setActiveTemplate(tpl);
              setActiveType(type);
            }}
            editUrl={irDrawerUrl}
          />
        </div>
      )}
    </div>
  );
}
