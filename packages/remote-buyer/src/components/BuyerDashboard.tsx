import React, { useState, useEffect, useMemo } from "react";
import "./BuyerDashBoard.css";
import Product from "./Product.tsx";
import Models from "./Models.tsx";
import ItemMasterCatalog from "./ItemMasterCatalog.tsx";
import Header from "./Header";
import QsAns from "./Qsans.tsx";
import AllRfqsSection from "./dashboard/AllRfqsSection";
import DashboardHome from "./dashboard/DashboardHome";
import QuotationComparisonView from "./dashboard/QuotationComparisonView";
import SupplierProfileModal from "./dashboard/SupplierProfileModal";
import { BUYER_NAV_PATHS, buildHeaderNavItems } from "./dashboard/navConfig";
import type { MatchCard, RfqPageView } from "./dashboard/types";
import { logoutBuyer, getBuyerProfile, fetchBuyerDashboardAnalytics, createBuyerChatApi } from "../api/Buyerapi";
import { createRfqApi } from "../api/createRfqApi";
import { CONTRACT_PAGE_SIZE } from "../constants";
import { useBuyerRfqs } from "../hooks/useBuyerRfqs";
import { useAllRfqs } from "../hooks/useAllRfqs";
import { useRfqDetail } from "../hooks/useRfqDetail";
import { useMaterialApprovals } from "../hooks/useMaterialApprovals";
import { useContracts } from "../hooks/useContracts";
import { useBuyerAuthStore } from "../store/useBuyerAuthStore";
import UserTemplate from "../../../remote-platform-user/src/components/UserTemplate.tsx";
import ContractTemplate from "../../../remote-platform-user/src/components/ContractTemplate.tsx";
import BidComparisonAwardView from "../../../remote-platform-user/src/components/BidComparisonAwardView.tsx";
import MaterialTable from "../../../remote-platform-user/src/components/Material/MaterialTable";
import MaterialApprovalDetail from "../../../remote-platform-user/src/components/Material/MaterialApprovalDetail";
import ContractTable from "../../../remote-platform-user/src/components/Contract/ContractTable";
import ContractDetail from "../../../remote-platform-user/src/components/Contract/ContractDetail";
import ApprovalManagement from "../../../remote-platform-user/src/components/ApprovalManagement/ApprovalManagement.tsx";
import WishlistSection from "./wishlist/WishlistSection";
import { ChatPanel, CompanyProfile, CreateRFQ, useAsyncData, useRouteNav } from '@vosox/shared-ui';

const BuyersDashboard: React.FC = () => {

  const [activeNav, setActiveNav] = useRouteNav(BUYER_NAV_PATHS, "dashboard");
  const [loggingOut, setLoggingOut] = useState(false);

  const [selectedProfile, setSelectedProfile] = useState<MatchCard | null>(null);

  const analytics = useAsyncData(fetchBuyerDashboardAnalytics);

  // STATE FOR QUOTATION COMPARISON
  const [selectedQuotationsRfq, setSelectedQuotationsRfq] = useState<any | null>(null);

  const { buyerId, rfqs, loadingRfqs, rfqsError, visibleRfqCount, loadRfqs } = useBuyerRfqs();

  const [rfqPageView, setRfqPageView] = useState<RfqPageView>("dashboard");
  const [previousRfqPageView, setPreviousRfqPageView] = useState<"dashboard" | "allRfqs">("dashboard");

  const {
    fullPageRfq,
    fullPageRfqId,
    loadingFullPageRfq,
    fullPageRfqError,
    freezingBid,
    chatCounterparties,
    openRfqDetail,
    clearRfqDetail,
    handleFreezeBid,
  } = useRfqDetail();
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      if (rfqPageView === "rfqDetail" || rfqPageView === "qsAns" || rfqPageView === "quotationComparison") {
        const targetView = previousRfqPageView || "allRfqs";
        setRfqPageView(targetView);
        setActiveNav(targetView);
        clearRfqDetail();
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [rfqPageView, previousRfqPageView]);

  const {
    allRfqsList,
    loadingAllRfqs,
    allRfqsError,
    allRfqsLoaded,
    allRfqsPage,
    allRfqsHasMore,
    loadAllRfqsPage,
    handleAllRfqsNextPage,
    handleAllRfqsPrevPage,
  } = useAllRfqs({ buyerId, rfqs, rfqsError, rfqPageView });

  const refreshRfqs = async () => {
    await loadRfqs();
    await loadAllRfqsPage(1);
  }

  const handleOpenAllRfqs = async () => {
    setActiveNav("allRfqs");
    setRfqPageView("allRfqs");
    if (allRfqsLoaded || loadingAllRfqs) return;

    await loadAllRfqsPage(1);
  };

  const handleBackToDashboard = () => {
    setRfqPageView("dashboard");
    setActiveNav("dashboard");
  };

  const currentUserId = useBuyerAuthStore((state) => state.personDetail?.userId || null);
  const buyerProfile = useBuyerAuthStore((state) => state.personDetail);
  const isLoadingBuyerProfile = useBuyerAuthStore((state) => state.personDetailLoading);

  const { selectedMaterial, setSelectedMaterial, handleMaterialApprovalSubmitted } = useMaterialApprovals(activeNav);

  const {
    contractRecords,
    loadingContract,
    contractError,
    contractPage,
    setContractPage,
    selectedContract,
    setSelectedContract,
  } = useContracts(activeNav);

  // The RFQ list has its own URL (/rfqs). When the URL changes by itself (Back/Forward,
  // reload, a shared link), bring the RFQ view in line with it.
  useEffect(() => {
    if (activeNav === "allRfqs" && rfqPageView === "dashboard") {
      handleOpenAllRfqs();
    } else if (activeNav !== "allRfqs" && rfqPageView === "allRfqs") {
      setRfqPageView("dashboard");
    }
  }, [activeNav]);

  const handleNavClick = (key: string) => {
    if (key === "activeRFQs" || key === "allRfqs") {
      handleOpenAllRfqs();
      return;
    }
    if (key === "rfqDetail") {
      setRfqPageView("rfqDetail");
      setActiveNav("rfqDetail");
      return;
    }
    setActiveNav(key);
    setRfqPageView("dashboard");
  };

  const handleViewRfqDetailsFullPage = async (rfqId: string) => {
    if (rfqPageView === "dashboard" || rfqPageView === "allRfqs") {
      setPreviousRfqPageView(rfqPageView);
    }
    window.history.pushState({ rfqPageView: "rfqDetail" }, "");
    setRfqPageView("rfqDetail");
    setActiveNav("rfqDetail");
    await openRfqDetail(rfqId, [...allRfqsList, ...rfqs]);
  };

  const handleBackToAllRfqs = async () => {
    const targetView = previousRfqPageView || "allRfqs";
    setRfqPageView(targetView);
    setActiveNav(targetView);
    clearRfqDetail();

    if (targetView === "allRfqs" && !allRfqsLoaded && !loadingAllRfqs) {
      await loadAllRfqsPage(1);
    }
  };

  const handleBackFromQuotationComparison = () => {
    setRfqPageView("rfqDetail");
    setSelectedQuotationsRfq(null);
  };

  const handleOpenQsAns = () => {
    setRfqPageView("qsAns");
  };

  const handleBackToRfqDetail = () => {
    setRfqPageView("rfqDetail");
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutBuyer();
    } catch {
      // The session is cleared locally below even when the server call fails.
    } finally {
      sessionStorage.clear();
      window.dispatchEvent(new CustomEvent("session:expired"));
      setLoggingOut(false);
    }
  };

  const headerNavItems = useMemo(
    () => buildHeaderNavItems(rfqPageView, fullPageRfq?.rfqNumber),
    [rfqPageView, fullPageRfq],
  );

  return (
    <Header navItems={headerNavItems} activeNav={activeNav} onNavClick={handleNavClick} onLogout={handleLogout}>
        <div className="pud-main">
          <div className="pud-content">
            {activeNav === "createRFQ" ? (
              <CreateRFQ onNavClick={handleNavClick} onRfqCreated={refreshRfqs} api={createRfqApi} />
            ) : activeNav === "product" ? (
              <Product />
            ) : activeNav === "models" ? (
              <Models />
            ) : activeNav === "template" ? (
              <UserTemplate />
            ) : activeNav === "contractTemplate" ? (
              <ContractTemplate />
            ) : activeNav === "materialService" ? (
              <ItemMasterCatalog buyerId={buyerId || ""} organizationId={buyerProfile?.organizationId || ""} />
            ) : activeNav === "material" ? (
              selectedMaterial ? (
                <MaterialApprovalDetail
                  material={selectedMaterial}
                  currentUserId={currentUserId}
                  onBack={() => setSelectedMaterial(null)}
                  onApprovalSubmitted={handleMaterialApprovalSubmitted}
                />
              ) : (
                <MaterialTable onRowClick={setSelectedMaterial} />
              )
            ) : activeNav === "contract" ? (
              selectedContract ? (
                <ContractDetail
                  contract={selectedContract}
                  currentUserId={currentUserId}
                  onBack={() => setSelectedContract(null)}
                />
              ) : (
                <ContractTable
                  records={contractRecords}
                  loading={loadingContract}
                  error={contractError}
                  onRowClick={setSelectedContract}
                  page={contractPage}
                  onPreviousPage={() => setContractPage((p) => Math.max(1, p - 1))}
                  onNextPage={() => setContractPage((p) => p + 1)}
                  hasNextPage={contractRecords.length === CONTRACT_PAGE_SIZE}
                />
              )
            ) : activeNav === "approvalManagement" ? (
              <ApprovalManagement canCreate />
            ) : activeNav === "wishlistApprovals" ? (
              <WishlistSection buyerId={buyerId || ""} currentUserId={currentUserId} mode="approve" />
            ) : rfqPageView === "allRfqs" ? (
              <AllRfqsSection
                rfqs={allRfqsList}
                page={allRfqsPage}
                loading={loadingAllRfqs}
                loaded={allRfqsLoaded}
                error={allRfqsError}
                hasMore={allRfqsHasMore}
                onBack={handleBackToDashboard}
                onOpenRfq={handleViewRfqDetailsFullPage}
                onPrevPage={handleAllRfqsPrevPage}
                onNextPage={handleAllRfqsNextPage}
              />
            ) : rfqPageView === "rfqDetail" ? (
              <BidComparisonAwardView
                rfq={fullPageRfq}
                loading={loadingFullPageRfq}
                error={fullPageRfqError}
                freezingBid={freezingBid}
                onFreeze={handleFreezeBid}
                onBack={handleBackToAllRfqs}
                onQsAns={handleOpenQsAns}
                onChatClick={() => setIsChatOpen(true)}
                buyerProfile={buyerProfile}
                isLoadingBuyerProfile={isLoadingBuyerProfile}
              />
            ) : rfqPageView === "quotationComparison" ? (
              <QuotationComparisonView rfq={selectedQuotationsRfq} onClose={handleBackFromQuotationComparison} />
            ) : rfqPageView === "qsAns" ? (
              <QsAns
                rfq={fullPageRfq}
                loading={loadingFullPageRfq}
                error={fullPageRfqError && !fullPageRfq ? fullPageRfqError : null}
                onBack={handleBackToRfqDetail}
              />
            ) : activeNav === "companyProfile" ? (
              <CompanyProfile
                mode="network-admin"
                entityLabel="Buyer"
                fetchProfile={getBuyerProfile}
              />
            ) : (
              <DashboardHome
                analytics={analytics}
                rfqs={rfqs}
                loadingRfqs={loadingRfqs}
                rfqsError={rfqsError}
                visibleRfqCount={visibleRfqCount}
                onCreateRfq={() => handleNavClick("createRFQ")}
                onViewRfqs={() => handleNavClick("activeRFQs")}
                onOpenRfq={handleViewRfqDetailsFullPage}
                onViewProfile={setSelectedProfile}
              />
            )}
          </div>
        </div>

        {selectedProfile && (
          <SupplierProfileModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} />
        )}

        {isChatOpen && fullPageRfqId && (
          <ChatPanel
            role="buyer"
            onClose={() => setIsChatOpen(false)}
            rfqId={fullPageRfqId}
            rfqNumber={fullPageRfq?.rfqNumber}
            rfqTitle={fullPageRfq?.title}
            counterparties={chatCounterparties}
            currentUserProfile={buyerProfile}
            isLoadingCurrentUserProfile={isLoadingBuyerProfile}
            api={createBuyerChatApi(fullPageRfqId)}
            hubParams={{ rfqId: fullPageRfqId }}
          />
        )}
    </Header>
  );
};

export default BuyersDashboard;
