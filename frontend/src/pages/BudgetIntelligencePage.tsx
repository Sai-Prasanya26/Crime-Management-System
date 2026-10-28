import React, { useEffect, useState, useCallback } from 'react';
import { BadgeDollarSign } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import BudgetCostAnalysisView from '../components/budget/BudgetCostAnalysisView';
import { geographyApi } from '../api';
import type { StateItem } from '../types';

export const BudgetIntelligencePage: React.FC = () => {
  const [states, setStates] = useState<StateItem[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStates = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const statesRes = await geographyApi.getStates();
      setStates(statesRes.items);
    } catch (err: any) {
      setError(err?.message || 'Failed to load states list.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStates();
  }, [fetchStates]);

  return (
    <DashboardLayout
      hideSidebar
      icon={BadgeDollarSign}
      title="Budget & Cost Analysis"
      subtitle="Estimated operational costs and budget planning"
      onRefresh={() => fetchStates(true)}
      isRefreshing={isRefreshing}
    >
      {isLoading && (
        <div className="rounded-lg border border-[#D9E1EA] bg-white p-8 shadow-2xs">
          <LoadingState message="Initializing fiscal intelligence and cost engine..." />
        </div>
      )}

      {error && (
        <ErrorState
          title="Initialization Error"
          message={error}
          onRetry={() => fetchStates()}
        />
      )}

      {!isLoading && !error && (
        <BudgetCostAnalysisView
          states={states}
          selectedStateId={selectedStateId}
          onStateSelect={setSelectedStateId}
        />
      )}
    </DashboardLayout>
  );
};

export default BudgetIntelligencePage;
