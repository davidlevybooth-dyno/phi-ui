"use client";

import { useEffect, type ReactNode } from "react";
import { OrganizationSwitcher, useOrganization, useOrganizationList } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Ensures a Clerk active organization before rendering children, so Clerk's
 * <APIKeys /> mints org-scoped keys rather than user-scoped ones. A sole
 * membership is activated automatically; a multi-org member picks one.
 */
export function ActiveOrgGate({ children }: { children: ReactNode }) {
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const {
    isLoaded: listLoaded,
    setActive,
    userMemberships,
  } = useOrganizationList({ userMemberships: true });

  const memberships = userMemberships?.data ?? [];
  const soleOrgId = memberships.length === 1 ? memberships[0].organization.id : null;

  useEffect(() => {
    if (orgLoaded && !organization && soleOrgId && setActive) {
      void setActive({ organization: soleOrgId });
    }
  }, [orgLoaded, organization, soleOrgId, setActive]);

  if (!orgLoaded || !listLoaded) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (memberships.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You need to belong to an organization before you can create API keys. Ask an
        administrator for an invitation.
      </p>
    );
  }

  if (!organization) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Select the organization your API keys should belong to:
        </p>
        <OrganizationSwitcher hidePersonal />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Keys are scoped to{" "}
          <span className="font-medium text-foreground">{organization.name}</span>
        </p>
        {memberships.length > 1 && <OrganizationSwitcher hidePersonal />}
      </div>
      {children}
    </div>
  );
}
