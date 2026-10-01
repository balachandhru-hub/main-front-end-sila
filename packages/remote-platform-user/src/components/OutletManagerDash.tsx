import React, { useEffect, useState } from "react";
import Header from "./Header";
import ApprovalManagement from "./ApprovalManagement/ApprovalManagement";
import { getTokenClaims, logoutPlatformUser } from "../api/platformApi";
import { getBuyerProfile } from "../../../remote-buyer/src/api/Buyerapi";
import BuyerErpConfiguration from "../../../remote-buyer/src/components/erp/BuyerErpConfiguration";
import WishlistSection from "../../../remote-buyer/src/components/wishlist/WishlistSection";
import { useNetworkAdminAuthStore } from "../store/useAuthStore";
import { useRouteNav, type RouteNavPaths } from "@vosox/shared-ui";

const NAV_PATHS: RouteNavPaths = {
  wishlist: "wishlist",
  wishlistApprovals: "wishlist-approvals",
  approvalManagement: "approval-management",
  purchaseOrderApi: "purchase-order-api",
};

const IconList = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);

const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const IconFlow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <path d="M10 6.5h4a4 4 0 0 1 4 4V14" />
  </svg>
);

const IconApi = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
  </svg>
);

const navItems = [
  { key: "wishlist", icon: <IconList />, label: "Wishlist" },
  { key: "wishlistApprovals", icon: <IconCheck />, label: "Wishlist Approvals" },
  { key: "approvalManagement", icon: <IconFlow />, label: "Approval Flows" },
  { key: "purchaseOrderApi", icon: <IconApi />, label: "Purchase Order API" },
];

const OutletManagerDash: React.FC = () => {
  const [activeNav, setActiveNav] = useRouteNav(NAV_PATHS, "wishlist");
  const currentUser = useNetworkAdminAuthStore((state) => state.currentUser);
  const [buyerId, setBuyerId] = useState<string | null>(currentUser?.buyerId || null);
  const currentUserId = currentUser?.userId || currentUser?.id || null;

  useEffect(() => {
    if (buyerId) return;
    let active = true;
    const loadBuyer = async () => {
      try {
        const claims = await getTokenClaims();
        if (!active) return;
        if (claims?.buyerId) {
          setBuyerId(claims.buyerId);
          return;
        }
        const profile = await getBuyerProfile();
        if (active && profile && "id" in profile && profile.id) setBuyerId(profile.id);
      } catch {
        // The wishlist screens explain a missing buyer profile.
      }
    };
    loadBuyer();
    return () => {
      active = false;
    };
  }, [buyerId]);

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

  return (
    <Header navItems={navItems} activeNav={activeNav} onNavClick={setActiveNav} onLogout={handleLogout}>
      <div className="pud-main">
        <div className="pud-content">
          {activeNav === "wishlistApprovals" ? (
            <WishlistSection buyerId={buyerId || ""} currentUserId={currentUserId} mode="approve" />
          ) : activeNav === "approvalManagement" ? (
            <ApprovalManagement />
          ) : activeNav === "purchaseOrderApi" ? (
            <BuyerErpConfiguration />
          ) : (
            <WishlistSection buyerId={buyerId || ""} currentUserId={currentUserId} mode="manage" />
          )}
        </div>
      </div>
    </Header>
  );
};

export default OutletManagerDash;
