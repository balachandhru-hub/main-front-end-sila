import React, { useEffect, useState } from "react";
import {
    getAllItemMasters,
    getItemMasterById,
    type ItemMasterDto,
    type ItemMasterDetailDto,
} from "../api/Buyerapi";
import { EmptyState, Loader, isErrorResponse, toastService } from "@vosox/shared-ui";
import { FaPlus } from "react-icons/fa";
import ItemMasterModal from "./ItemMasterModal";
import "./ItemMasterCatalog.css";

interface ItemMasterCatalogProps {
    buyerId: string;
    onClose?: () => void;
}

const DETAIL_FIELDS: { key: keyof ItemMasterDetailDto; label: string }[] = [
    { key: "productType", label: "Product Type" },
    { key: "baseUnitOfMeasure", label: "Base Unit of Measure" },
    { key: "orderUnitOfMeasure", label: "Order Unit of Measure" },
    { key: "alternateUnitOfMeasure", label: "Alternate Unit of Measure" },
    { key: "valuationClass", label: "Valuation Class" },
    { key: "unitOfMeasureMapping", label: "Unit of Measure Mapping" },
    { key: "subUnit", label: "Sub Unit" },
    { key: "microUnit", label: "Micro Unit" },
];

const IconChevronLeft = () => (
    <svg className="back-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const ItemMasterCatalog: React.FC<ItemMasterCatalogProps> = ({ buyerId, onClose }) => {
    const [itemMasters, setItemMasters] = useState<ItemMasterDto[]>([]);
    const [showListView, setShowListView] = useState(true);
    const [selectedItemDetail, setSelectedItemDetail] = useState<ItemMasterDetailDto | null>(null);
    const [showItemMasterModal, setShowItemMasterModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [detailError, setDetailError] = useState<string | null>(null);

    const fetchItemMasters = async () => {
        if (!buyerId) return;

        setLoading(true);
        setError(null);

        try {
            const result = await getAllItemMasters(buyerId, 0, 100);
            const resolved = result?.data?.data || result?.data || result || [];
            setItemMasters(Array.isArray(resolved) ? resolved : []);
        } catch (err: any) {
            const message = err?.message || "Failed to load item masters.";
            setError(message);
            toastService.error(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItemMasters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [buyerId]);

    const handleRowClick = async (id: string) => {
        setShowListView(false);
        setDetailLoading(true);
        setDetailError(null);

        const result = await getItemMasterById(id);

        if (isErrorResponse(result)) {
            const message = result.message || "Failed to load item master details.";
            setDetailError(message);
            toastService.error(message);
            setSelectedItemDetail(null);
            setDetailLoading(false);
            return;
        }

        setSelectedItemDetail(result as ItemMasterDetailDto);
        setDetailLoading(false);
    };

    const handleBackToList = () => {
        setShowListView(true);
        setSelectedItemDetail(null);
        setDetailError(null);
    };

    const handleAddItemMasterClick = () => {
        setShowItemMasterModal(true);
    };

    return (
        <div className="imc-container">
            {error && (
                <div className="imc-error-banner" role="alert">
                    <span>{error}</span>
                    <button type="button" className="imc-btn-retry sila-btn sila-btn--secondary sila-btn--sm" onClick={fetchItemMasters}>
                        Retry
                    </button>
                </div>
            )}

            {!showListView ? (
                    <>
                    <div className="detail-header">
                        <button
                            type="button"
                            className="back-button"
                            onClick={handleBackToList}
                            title="Go back to list"
                            aria-label="Go back"
                        >
                            <IconChevronLeft />
                        </button>

                        <div className="detail-header-title">
                            <h2 className="imc-title">Material Details</h2>
                        </div>

                    </div>

                    <div className="imc-page">

                    {detailLoading ? (
                        <div className="imc-loading-state">
                            <Loader size={28} message="Loading details..." />
                        </div>
                    ) : detailError ? (
                        <div className="imc-error-banner" role="alert">
                            <span>{detailError}</span>
                        </div>
                    ) : selectedItemDetail ? (
                        <div className="detail-card">
                            {DETAIL_FIELDS.map(({ key, label }) => {
                                const value = selectedItemDetail[key];
                                return (
                                    <div className="detail-field" key={String(key)}>
                                        <span className="label">{label}</span>
                                        <span className={`value${value ? "" : " value-empty"}`}>
                                            {value ? String(value) : "-"}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : null}
                    </div>
                    </>
            ) : (
                <div className="imc-page">
                    <div className="imc-header">
                        <div>
                            <h1 className="imc-title">Material Master</h1>
                            <p className="imc-subtitle">Browse and manage item masters for your organization.</p>
                        </div>

                        <div className="imc-header-actions">
                            {onClose && (
                                <button type="button" className="imc-btn-secondary sila-btn sila-btn--secondary" onClick={onClose}>
                                    Close
                                </button>
                            )}

                            <button type="button" className="imc-btn-primary sila-btn sila-btn--primary" onClick={handleAddItemMasterClick}>
                                <FaPlus aria-hidden="true" />
                                Add Item Master
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="imc-loading-state">
                            <Loader size={28} message="Loading item masters..." />
                        </div>
                    ) : itemMasters.length === 0 ? (
                        <EmptyState
                            className="imc-empty-state"
                            title="No item masters found."
                            action={
                                <button type="button" className="imc-btn-primary sila-btn sila-btn--primary" onClick={handleAddItemMasterClick}>
                                    <FaPlus aria-hidden="true" />
                                    Add Item Master
                                </button>
                            }
                        />
                    ) : (
                        <div className="item-master-table-container">
                            <table className="item-master-table">
                                <thead>
                                    <tr>
                                        <th scope="col" className="imc-col-index">S.No</th>
                                        <th scope="col">Material</th>
                                        <th scope="col">Description</th>
                                        <th scope="col">Group</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itemMasters.map((item, index) => (
                                        <tr
                                            key={item.id}
                                            tabIndex={0}
                                            onClick={() => handleRowClick(item.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") handleRowClick(item.id);
                                            }}
                                        >
                                            <td className="imc-col-index">{index + 1}</td>
                                            <td><span className="sila-ref">{item.materialCode}</span></td>
                                            <td>{item.description}</td>
                                            <td>{item.materialGroup}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            <ItemMasterModal
                isOpen={showItemMasterModal}
                onClose={() => setShowItemMasterModal(false)}
                buyerId={buyerId}
                onSuccess={() => {
                    fetchItemMasters();
                    handleBackToList();
                }}
            />
        </div>
    );
};

export default ItemMasterCatalog;
