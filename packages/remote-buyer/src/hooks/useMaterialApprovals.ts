import { useEffect, useState } from "react";
import { toastService } from "@vosox/shared-ui";
import type { PendingMaterialApproval, MaterialApprovalKpi } from "../../../remote-platform-user/src/components/Material/materialApi";
import { fetchPendingMaterialApprovals, fetchMaterialApprovalKpi } from "../../../remote-platform-user/src/components/Material/materialApi";

/** Material approvals list, filters and KPI counts; loads only while the "material" section is active. */
export const useMaterialApprovals = (activeNav: string) => {
  const [materialRecords, setMaterialRecords] = useState<PendingMaterialApproval[]>([]);
  const [loadingMaterial, setLoadingMaterial] = useState(false);
  const [materialError, setMaterialError] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<PendingMaterialApproval | null>(null);

  const [materialStatusFilter, setMaterialStatusFilter] = useState("");
  // materialSearchTerm is the debounced value that drives the API call.
  const [materialSearchInput, setMaterialSearchInput] = useState("");
  const [materialSearchTerm, setMaterialSearchTerm] = useState("");

  const [materialKpi, setMaterialKpi] = useState<MaterialApprovalKpi | null>(null);
  const [loadingMaterialKpi, setLoadingMaterialKpi] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setMaterialSearchTerm(materialSearchInput), 400);
    return () => clearTimeout(handle);
  }, [materialSearchInput]);

  const loadMaterialApprovals = () => {
    setLoadingMaterial(true);
    setMaterialError(null);
    fetchPendingMaterialApprovals({ status: materialStatusFilter, searchTerm: materialSearchTerm })
      .then(setMaterialRecords)
      .catch((err: any) => {
        setMaterialError(err.message || "Failed to load material approvals.");
        setMaterialRecords([]);
      })
      .finally(() => setLoadingMaterial(false));
  };

  // Loaded independently so search/status changes don't refetch KPI.
  const loadMaterialKpi = () => {
    setLoadingMaterialKpi(true);
    fetchMaterialApprovalKpi()
      .then(setMaterialKpi)
      .catch((err: any) => toastService.error(err.message || "Failed to load approval summary counts."))
      .finally(() => setLoadingMaterialKpi(false));
  };

  useEffect(() => {
    if (activeNav !== "material") return;
    setSelectedMaterial(null);
    loadMaterialKpi();
  }, [activeNav]);

  useEffect(() => {
    if (activeNav !== "material") return;
    loadMaterialApprovals();
  }, [activeNav, materialStatusFilter, materialSearchTerm]);

  const handleMaterialApprovalSubmitted = () => {
    setSelectedMaterial(null);
    loadMaterialApprovals();
    loadMaterialKpi();
  };

  return {
    materialRecords,
    loadingMaterial,
    materialError,
    selectedMaterial,
    setSelectedMaterial,
    materialStatusFilter,
    setMaterialStatusFilter,
    materialSearchInput,
    setMaterialSearchInput,
    setMaterialSearchTerm,
    materialKpi,
    loadingMaterialKpi,
    handleMaterialApprovalSubmitted,
  };
};
