"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import apiHandler from "@/data/api/ApiHandler";
import AppDrawer from "@/components/app/app-drawer";
import { useQuery } from "@/hooks/use-query";
import { useModifyQuery } from "@/hooks/use-modify-query";
import { APP_UPDATE_USER_DRAWER } from "@/lib/routes";
import { VStack, Spinner } from "@chakra-ui/react";
import { CrmUser } from "./types";
import { useState, useEffect } from "react";

const schema = z.object({
  roleIds:      z.array(z.string()).min(1, "At least one role is required"),
  departmentId: z.string().optional(),
  accessLevel:  z.number().int().min(1).max(5),
});

type FormValues = z.infer<typeof schema>;

interface UpdateUserDrawerProps {
  onUpdated: (user: CrmUser) => void;
}

export default function UpdateUserDrawer({ onUpdated }: UpdateUserDrawerProps) {
  const pathName = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // The query parameter value should be the user ID
  const userId = searchParams.get(APP_UPDATE_USER_DRAWER);
  const open = !!userId;

  const redirectUri = useModifyQuery(null, searchParams, [
    { key: APP_UPDATE_USER_DRAWER, value: userId || "" },
  ]);

  const discardChange = () => {
    router.push(pathName.split("?")[0]);
  };

  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [roles, setRoles]             = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading]         = useState(false);
  const [selectedUser, setSelectedUser] = useState<CrmUser | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      roleIds:      [],
      departmentId: "",
      accessLevel:  1,
    },
  });

  useEffect(() => {
    if (open && userId) {
      setLoading(true);
      Promise.all([
        apiHandler.departments.list(),
        apiHandler.roles.list(),
        apiHandler.users.get_by_id(userId)
      ]).then(([deptRes, rolesRes, userRes]) => {
        const dArr = deptRes?.isSuccess && Array.isArray(deptRes.content) ? deptRes.content : Array.isArray(deptRes) ? deptRes : [];
        setDepartments(dArr);

        const rArr = rolesRes?.isSuccess && Array.isArray(rolesRes.content) ? rolesRes.content : Array.isArray(rolesRes) ? rolesRes : [];
        setRoles(rArr);

        const u = userRes?.isSuccess && userRes.content ? userRes.content : userRes;
        if (u) {
          const userName = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || '';
          setSelectedUser({ ...u, name: userName } as CrmUser);

          let currentRoleIds: string[] = [];
          if (u.roles && u.roles.length > 0) {
            currentRoleIds = u.roles.map((roleObjOrStr: any) => {
              const roleStr = typeof roleObjOrStr === 'string' ? roleObjOrStr : roleObjOrStr?.name;
              const match = rArr.find((r: any) => r.name === roleStr || r.id === roleObjOrStr?.id);
              return match ? match.id : null;
            }).filter(Boolean) as string[];
          }

          reset({
            roleIds: currentRoleIds,
            departmentId: u.departmentId || "",
            accessLevel: u.accessLevel || 1,
          });
        }
      }).catch(console.error).finally(() => setLoading(false));
    }
  }, [open, userId, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!userId || !selectedUser) return;
    try {
      const res = await apiHandler.users.update(userId, {
        firstName: selectedUser.name?.split(" ")[0] || "",
        lastName: selectedUser.name?.split(" ").slice(1).join(" ") || "",
        isActive: selectedUser.isActive ?? true,
        accessLevel: values.accessLevel,
        departmentId: values.departmentId || null,
        roleIds: values.roleIds
      });

      const updated: CrmUser = {
        ...selectedUser,
        accessLevel: values.accessLevel,
        departmentName: departments.find(d => d.id === values.departmentId)?.name,
        roleName: values.roleIds.map(id => roles.find(r => r.id === id)?.name).filter(Boolean).join(", "),
      };

      onUpdated(updated);
      reset();
      discardChange();
    } catch (e) {
      console.error("Failed to update user", e);
    }
  });

  const inputBase = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors";
  const inputOk   = "border-gray-200 focus:ring-green-400 focus:border-green-400";
  const inputErr  = "border-red-400 focus:ring-red-300";

  return (
    <AppDrawer
      title="Update User Details"
      placement="end"
      size="md"
      open={open && !!userId}
      redirectUri={redirectUri}
      cancelQueryKey={APP_UPDATE_USER_DRAWER}
      onSubmit={(e) => onSubmit(e) ?? Promise.resolve()}
      submitLabel={isSubmitting ? "Updating..." : "Update User"}
      hasFooter
    >
      {loading ? (
        <div className="flex items-center justify-center p-10">
          <Spinner />
        </div>
      ) : selectedUser ? (
        <VStack gap={5} align="stretch" pb={4}>
          <p className="text-sm text-green-600 -mt-2">
            Assign role and access level for {selectedUser.name}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              disabled
              value={selectedUser.name || ""}
              className={`${inputBase} bg-gray-50 text-gray-500`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              disabled
              value={selectedUser.email || ""}
              className={`${inputBase} bg-gray-50 text-gray-500`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Roles <span className="text-red-500">*</span>
            </label>
            <select
              multiple
              {...register("roleIds")}
              className={`${inputBase} bg-white h-24 ${errors.roleIds ? inputErr : inputOk}`}
            >
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Hold Ctrl (or Cmd) to select multiple</p>
            {errors.roleIds && <p className="text-xs text-red-500 mt-1">{errors.roleIds.message}</p>}
          </div>

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
      ) : (
        <div className="p-4 text-sm text-gray-500">User not found.</div>
      )}
    </AppDrawer>
  );
}
