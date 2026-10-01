import React, { useEffect, useMemo, useState } from "react";
import Header from "./Header";
import ApprovalManagement from "./ApprovalManagement/ApprovalManagement";
import UserTemplate from "./UserTemplate.tsx";
import ContractTemplate from "./ContractTemplate.tsx";
import BidComparisonAwardView from "./BidComparisonAwardView.tsx";
import MaterialTable from "./Material/MaterialTable";
import MaterialApprovalDetail from "./Material/MaterialApprovalDetail";
import ContractTable from "./Contract/ContractTable";
import ContractDetail from "./Contract/ContractDetail";
import { logoutPlatformUser } from "../api/platformApi";
import {
  getBuyerProfile,
  fetchBuyerDashboardAnalytics,
  createBuyerChatApi,
} from "../../../remote-buyer/src/api/Buyerapi";
import { createRfqApi } from "../../../remote-buyer/src/api/createRfqApi";
import { CONTRACT_PAGE_SIZE } from "../../../remote-buyer/src/constants";
import { useBuyerRfqs } from "../../../remote-buyer/src/hooks/useBuyerRfqs";
import { useAllRfqs } from "../../../remote-buyer/src/hooks/useAllRfqs";
import { useRfqDetail } from "../../../remote-buyer/src/hooks/useRfqDetail";
import { useMaterialApprovals } from "../../../remote-buyer/src/hooks/useMaterialApprovals";
import { useContracts } from "../../../remote-buyer/src/hooks/useContracts";
import BuyerErpConfiguration from "../../../remote-buyer/src/components/erp/BuyerErpConfiguration";
import WishlistSection from "../../../remote-buyer/src/components/wishlist/WishlistSection";
import Product from "../../../remote-buyer/src/components/Product.tsx";
import Models from "../../../remote-buyer/src/components/Models.tsx";
import ItemMasterCatalog from "../../../remote-buyer/src/components/ItemMasterCatalog.tsx";
import QsAns from "../../../remote-buyer/src/components/Qsans.tsx";
import AllRfqsSection from "../../../remote-buyer/src/components/dashboard/AllRfqsSection";
import DashboardHome from "../../../remote-buyer/src/components/dashboard/DashboardHome";
import QuotationComparisonView from "../../../remote-buyer/src/components/dashboard/QuotationComparisonView";
import SupplierProfileModal from "../../../remote-buyer/src/components/dashboard/SupplierProfileModal";
import type { MatchCard, RfqPageView } from "../../../remote-buyer/src/components/dashboard/types";
import { useNetworkAdminAuthStore } from "../store/useAuthStore";
import {
  ChatPanel,
  CompanyProfile,
  CreateRFQ,
  useAsyncData,
  useRouteNav,
  type RouteNavPaths,
  HomeIcon,
  FilePlusIcon,
  FileCheckIcon,
  LayoutGridIcon,
  LayoutTemplateIcon,
  MoreHorizontalIcon,
  FileTextIcon,
} from "@vosox/shared-ui";

const NAV_PATHS: RouteNavPaths = {
  dashboard: "dashboard",
  wishlist: "wishlist",
  createRFQ: "create-rfq",
  allRfqs: "rfqs",
  activeRFQs: "rfqs",
  product: "product-catalog",
  models: "models",
  template: "templates",
  contractTemplate: "contract-templates",
  approvalManagement: "approval-management",
  material: "material-approvals",
  contract: "contract-approvals",
  materialService: "material-service",
  companyProfile: "company-profile",
  wishlistApprovals: "wishlist-approvals",
  purchaseOrderApi: "purchase-order-api",
};

const IconList = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);

const navItems = [
  { key: "dashboard", icon: <HomeIcon />, label: "Dashboard" },
  { key: "wishlist", icon: <IconList />, label: "Wishlist" },
  { key: "createRFQ", icon: <FilePlusIcon />, label: "Create RFQ" },
  { key: "product", icon: <FileCheckIcon />, label: "Product Catalog" },
  { key: "models", icon: <LayoutGridIcon />, label: "Models" },
  {
    key: "configuration",
    icon: <LayoutTemplateIcon />,
    label: "Configuration",
    subItems: [
      { key: "template", label: "Templates" },
      { key: "contractTemplate", label: "Contract Templates" },
      { key: "approvalManagement", label: "Approval Management" },
    ],
  },
  {
    key: "more",
    icon: <MoreHorizontalIcon />,
    label: "More",
    subItems: [
      {
        label: "Approval",
        items: [
          { key: "material", label: "Material" },
          { key: "contract", label: "Contract" },
          { key: "wishlistApprovals", label: "Wishlist" },
        ],
      },
      { key: "materialService", label: "Material & Service" },
      { key: "purchaseOrderApi", label: "Purchase Order API" },
    ],
  },
];

/** Sidebar items, plus a "View RFQ" entry while an RFQ's detail page is open. */
const buildHeaderNavItems = (rfqPageView: RfqPageView, rfqNumber: string | undefined) => {
  const items = [...navItems];

  if (rfqPageView === "rfqDetail") {
    const createIndex = items.findIndex((i) => i.key === "createRFQ");
    const rfqLabel = rfqNumber ? `View RFQ (${rfqNumber})` : "View RFQ";
    const detailItem = { key: "rfqDetail", icon: <FileTextIcon />, label: rfqLabel };
    if (createIndex !== -1) {
      items.splice(createIndex + 1, 0, detailItem);
    } else {
      items.unshift(detailItem);
    }
  }

  return items;
};

const OutletManagerDash: React.FC = () => {
  const currentUser = useNetworkAdminAuthStore((state) => state.currentUser);
  const buyerProfile = useNetworkAdminAuthStore((state) => state.personDetail);
  const isLoadingBuyerProfile = useNetworkAdminAuthStore((state) => state.personDetailLoading);
  const currentUserId = currentUser?.userId || currentUser?.id || null;

  const [selectedProfile, setSelectedProfile] = useState<MatchCard | null>(null);
  const [selectedQuotationsRfq, setSelectedQuotationsRfq] = useState<any | null>(null);

  const analytics = useAsyncData(fetchBuyerDashboardAnalytics);

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

  const [activeNav, setActiveNav] = useRouteNav(NAV_PATHS, "wishlist");

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
  };

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
    try {
      await logoutPlatformUser();
    } catch {
      // The session is cleared locally below even when the server call fails.
    } finally {
      sessionStorage.clear();
      window.dispatchEvent(new CustomEvent("session:expired"));
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
          {activeNav === "wishlist" ? (
            <WishlistSection buyerId={buyerId || ""} currentUserId={currentUserId} mode="manage" />
          ) : activeNav === "wishlistApprovals" ? (
            <WishlistSection buyerId={buyerId || ""} currentUserId={currentUserId} mode="approve" />
          ) : activeNav === "purchaseOrderApi" ? (
            <BuyerErpConfiguration />
          ) : activeNav === "createRFQ" ? (
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
            <CompanyProfile mode="network-admin" entityLabel="Buyer" fetchProfile={getBuyerProfile} />
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

export default OutletManagerDash;
