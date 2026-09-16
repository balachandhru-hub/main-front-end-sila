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

const IconChevronLeft = () => (
    <svg className="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <div className="imc-error-banner">
                    <span>{error}</span>
                    <button type="button" className="imc-btn-retry" onClick={fetchItemMasters}>
                        Retry
                    </button>
                </div>
            )}

            {!showListView ? (
                <div className="imc-page">
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
                            <h2 className="imc-title">{selectedItemDetail?.materialCode || "Material Details"}</h2>
                        </div>

                        <button type="button" className="imc-btn-primary" onClick={handleAddItemMasterClick}>
                            + Add Item Master
                        </button>
                    </div>

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
                        <div className="detail-card">
                            {DETAIL_FIELDS.map(({ key, label }) => {
                                const value = selectedItemDetail[key];
                                return (
                                    <div className="detail-field" key={String(key)}>
                                        <span className="label">{label}</span>
                                        <span className={`value${value ? "" : " value-empty"}`}>
                                            {value ? String(value) : "—"}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : null}
                </div>
            ) : (
                <div className="imc-page">
                    <div className="imc-header">
                        <div>
                            <h1 className="imc-title">Material Master</h1>
                            <p className="imc-subtitle">Browse and manage item masters for your organization.</p>
                        </div>

                        <div className="imc-header-actions">
                            <button type="button" className="imc-btn-primary" onClick={handleAddItemMasterClick}>
                                + Add Item Master
                            </button>

                            {onClose && (
                                <button type="button" className="imc-btn-secondary" onClick={onClose}>
                                    Close
                                </button>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="imc-loading-state">
                            <div className="imc-spinner" />
                            <span>Loading item masters...</span>
                        </div>
                    ) : itemMasters.length === 0 ? (
                        <div className="imc-empty-state">
                            <p>No item masters found.</p>
                            <button type="button" className="imc-btn-primary" onClick={handleAddItemMasterClick}>
                                + Add Item Master
                            </button>
                        </div>
                    ) : (
                        <div className="item-master-table-container">
                            <table className="item-master-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: "64px" }}>S.NO</th>
                                        <th>MATERIAL</th>
                                        <th>DESCRIPTION</th>
                                        <th>GROUP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itemMasters.map((item, index) => (
                                        <tr key={item.id} onClick={() => handleRowClick(item.id)}>
                                            <td>{index + 1}</td>
                                            <td>{item.materialCode}</td>
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
