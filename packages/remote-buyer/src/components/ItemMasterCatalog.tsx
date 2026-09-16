import React, { useEffect, useState } from "react";
import {
    getAllItemMasters,
    getItemMasterById,
    type ItemMasterDto,
    type ItemMasterDetailDto,
} from "../api/Buyerapi";
import { isErrorResponse, toastService } from "@vosox/shared-ui";
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

const ItemMasterCatalog: React.FC<ItemMasterCatalogProps> = ({ buyerId, onClose }) => {
    const [itemMasters, setItemMasters] = useState<ItemMasterDto[]>([]);
    const [selectedItemDetail, setSelectedItemDetail] = useState<ItemMasterDetailDto | null>(null);
    const [showItemMasterModal, setShowItemMasterModal] = useState(false);
    const [showDetailView, setShowDetailView] = useState(false);
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

    const handleCardClick = async (id: string) => {
        setShowDetailView(true);
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
        setShowDetailView(false);
        setSelectedItemDetail(null);
        setDetailError(null);
    };

    return (
        <div className="imc-container">
            <div className="imc-header">
                <div>
                    <h1 className="imc-title">Material Master</h1>
                    <p className="imc-subtitle">Browse and manage item masters for your organization.</p>
                </div>

                <div className="imc-header-actions">
                    <button
                        type="button"
                        className="imc-btn-primary"
                        onClick={() => setShowItemMasterModal(true)}
                    >
                        + Add Item Master
                    </button>

                    {onClose && (
                        <button type="button" className="imc-btn-secondary" onClick={onClose}>
                            Close
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="imc-error-banner">
                    <span>{error}</span>
                    <button type="button" className="imc-btn-retry" onClick={fetchItemMasters}>
                        Retry
                    </button>
                </div>
            )}

            {showDetailView ? (
                <div className="imc-detail-panel">
                    <button type="button" className="imc-btn-back" onClick={handleBackToList}>
                        ← Back to list
                    </button>

                    {detailLoading ? (
                        <div className="imc-loading-state">
                            <div className="imc-spinner" />
                            <span>Loading details...</span>
                        </div>
                    ) : detailError ? (
                        <div className="imc-error-banner">
                            <span>{detailError}</span>
                        </div>
                    ) : selectedItemDetail ? (
                        <div className="imc-detail-card">
                            <h2 className="imc-detail-heading">Item Master Details</h2>

                            <div className="imc-detail-grid">
                                {DETAIL_FIELDS.map(({ key, label }) => {
                                    const value = selectedItemDetail[key];
                                    return (
                                        <div className="imc-detail-field" key={String(key)}>
                                            <div className="imc-detail-label">{label}</div>
                                            <div className={`imc-detail-value${value ? "" : " imc-detail-value-empty"}`}>
                                                {value ? String(value) : "—"}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : loading ? (
                <div className="imc-loading-state">
                    <div className="imc-spinner" />
                    <span>Loading item masters...</span>
                </div>
            ) : itemMasters.length === 0 ? (
                <div className="imc-empty-state">
                    <p>No item masters found.</p>
                    <button
                        type="button"
                        className="imc-btn-primary"
                        onClick={() => setShowItemMasterModal(true)}
                    >
                        + Add Item Master
                    </button>
                </div>
            ) : (
                <div className="imc-card-grid">
                    {itemMasters.map((item) => (
                        <div
                            key={item.id}
                            className="imc-card"
                            onClick={() => handleCardClick(item.id)}
                        >
                            <div className="imc-card-row">
                                <span className="imc-card-label">Material:</span>
                                <span className="imc-card-value">{item.materialCode}</span>
                            </div>
                            <div className="imc-card-row">
                                <span className="imc-card-label">Description:</span>
                                <span className="imc-card-value">{item.description}</span>
                            </div>
                            <div className="imc-card-row">
                                <span className="imc-card-label">Group:</span>
                                <span className="imc-card-value">{item.materialGroup}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ItemMasterModal
                isOpen={showItemMasterModal}
                onClose={() => setShowItemMasterModal(false)}
                buyerId={buyerId}
                onSuccess={() => {
                    fetchItemMasters();
                }}
            />
        </div>
    );
};

export default ItemMasterCatalog;
