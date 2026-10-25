import React, { useState } from 'react';
import { TabNav, TabKey } from '../components/TabNav.tsx';
import { ExecutiveSummaryView } from '../components/ExecutiveSummaryView.tsx';
import { SystemArchitectureView } from '../components/SystemArchitectureView.tsx';
import { DataContractView } from '../components/DataContractView.tsx';
import { ApiContractView } from '../components/ApiContractView.tsx';
import { AiQualityView } from '../components/AiQualityView.tsx';
import { SmartContractView } from '../components/SmartContractView.tsx';
import { FrontendDesignView } from '../components/FrontendDesignView.tsx';
import { HandoffRoadmapView } from '../components/HandoffRoadmapView.tsx';
import { FullMarkdownSpecView } from '../components/FullMarkdownSpecView.tsx';
import { PageHeader } from '../components/shared/PageHeader.tsx';
import { SampleDataNotice } from '../components/shared/SampleDataNotice.tsx';

export const SpecificationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('executive');

  return (
    <div className="space-y-6">
      <SampleDataNotice />

      <PageHeader
        title="Technical Architecture Specification"
        subtitle="Comprehensive 16-deliverable blueprint defining data contracts, REST API schema, Solidity provenance contract, and Antigravity implementation handoff."
        icon="menu_book"
        iconColor="text-emerald-700"
        badge={{ text: 'Phase 1 Blueprint & Contracts', variant: 'emerald' }}
      />

      <div className="bg-stone-900 rounded-xl overflow-hidden border border-stone-800 shadow-2xs">
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="p-4 sm:p-6 bg-slate-950 text-slate-100 min-h-[500px]">
          {activeTab === 'executive' && <ExecutiveSummaryView />}
          {activeTab === 'architecture' && <SystemArchitectureView />}
          {activeTab === 'contract' && <DataContractView />}
          {activeTab === 'api' && <ApiContractView />}
          {activeTab === 'ai' && <AiQualityView />}
          {activeTab === 'smartcontract' && <SmartContractView />}
          {activeTab === 'frontend' && <FrontendDesignView />}
          {activeTab === 'handoff' && <HandoffRoadmapView />}
          {activeTab === 'markdown' && <FullMarkdownSpecView />}
        </div>
      </div>
    </div>
  );
};
