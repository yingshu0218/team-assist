"use client";

import { useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { LedgerProvider } from "@/hooks/use-ledger";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AuthGate } from "@/components/auth-gate";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardView } from "@/components/dashboard-view";
import { TransactionsView } from "@/components/transactions-view";
import { CategoriesView } from "@/components/categories-view";
import { TagsView } from "@/components/tags-view";
import { SyncSettingsView } from "@/components/sync-settings-view";
import { AuthSettingsView } from "@/components/auth-settings-view";
import { TodosView } from "@/components/todos/todos-view";
import { CrmContactsView } from "@/components/crm/crm-contacts-view";
import { CrmGroupsView } from "@/components/crm/crm-groups-view";
import { CrmEventsView } from "@/components/crm/crm-events-view";
import { CrmRelationshipsView } from "@/components/crm/crm-relationships-view";
import { CrmGraphView } from "@/components/crm/crm-graph-view";
import { CrmTimelineView } from "@/components/crm/crm-timeline-view";
import { LedgerLoading } from "@/components/ledger-loading";

export type Tab = "dashboard" | "transactions" | "categories" | "tags" | "todos" | "settings" | "auth-settings" | "crm-contacts" | "crm-groups" | "crm-events" | "crm-relationships" | "crm-graph" | "crm-timeline";

function AppContent() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  return (
    <AuthGate>
      <LedgerProvider>
        <SidebarProvider>
          <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <SidebarInset>
            <LedgerLoading>
              {activeTab === "dashboard" && <DashboardView onNavigate={setActiveTab} />}
              {activeTab === "transactions" && <TransactionsView />}
              {activeTab === "categories" && <CategoriesView />}
              {activeTab === "tags" && <TagsView />}
              {activeTab === "todos" && <TodosView />}
              {activeTab === "settings" && <SyncSettingsView />}
              {activeTab === "auth-settings" && <AuthSettingsView />}
              {activeTab === "crm-contacts" && <CrmContactsView />}
              {activeTab === "crm-groups" && <CrmGroupsView />}
              {activeTab === "crm-events" && <CrmEventsView />}
              {activeTab === "crm-relationships" && <CrmRelationshipsView />}
              {activeTab === "crm-graph" && <CrmGraphView />}
              {activeTab === "crm-timeline" && <CrmTimelineView />}
            </LedgerLoading>
          </SidebarInset>
        </SidebarProvider>
      </LedgerProvider>
    </AuthGate>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
