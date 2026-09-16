import React, { useEffect, useState } from "react";
import {
    createItemMaster,
    getMasterApprovalFlows,
    type MasterApprovalFlowDto,
} from "../../api/itemmasterapi";
import { toastService } from "@vosox/shared-ui";
import "./ItemMasterModal.css";

interface ItemMasterModalProps {
    isOpen: boolean;
    onClose: () => void;
    buyerId: string;
    onSuccess?: () => void;
}

const clearFieldError = (
    setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    field: string
) => {
    setErrors((prev) => {
        if (!(field in prev)) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
    });
};

const ItemMasterModal: React.FC<ItemMasterModalProps> = ({
    isOpen,
    onClose,
    buyerId,
    onSuccess,
}) => {
    const [description, setDescription] = useState("");
    const [materialCode, setMaterialCode] = useState("");
    const [materialGroup, setMaterialGroup] = useState("");
    const [productType, setProductType] = useState("");
    const [baseUnitOfMeasure, setBaseUnitOfMeasure] = useState("");
    const [orderUnitOfMeasure, setOrderUnitOfMeasure] = useState("");
    const [alternateUnitOfMeasure, setAlternateUnitOfMeasure] = useState("");
    const [valuationClass, setValuationClass] = useState("");
    const [unitOfMeasureMapping, setUnitOfMeasureMapping] = useState("");
    const [subUnit, setSubUnit] = useState("");
    const [microUnit, setMicroUnit] = useState("");
    const [approvalFlowId, setApprovalFlowId] = useState("");
    const [comment, setComment] = useState("");

    const [approvalFlows, setApprovalFlows] = useState<MasterApprovalFlowDto[]>([]);
    const [approvalFlowLoading, setApprovalFlowLoading] = useState(false);
    const [approvalFlowError, setApprovalFlowError] = useState("");

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen || !buyerId) return;

        let cancelled = false;

        const loadApprovalFlows = async () => {
            setApprovalFlowLoading(true);
            setApprovalFlowError("");

            try {
                const flows = await getMasterApprovalFlows(buyerId, 0, 100);
                if (!cancelled) {
                    setApprovalFlows(flows);
                }
            } catch (error: any) {
                if (!cancelled) {
                    setApprovalFlows([]);
                    setApprovalFlowError(
                        error?.message || "Failed to load approval flows."
                    );
                }
            } finally {
                if (!cancelled) {
                    setApprovalFlowLoading(false);
                }
            }
        };

        loadApprovalFlows();

        return () => {
            cancelled = true;
        };
    }, [isOpen, buyerId]);

    if (!isOpen) {
        return null;
    }

    const resetForm = () => {
        setDescription("");
        setMaterialCode("");
        setMaterialGroup("");
        setProductType("");
        setBaseUnitOfMeasure("");
        setOrderUnitOfMeasure("");
        setAlternateUnitOfMeasure("");
        setValuationClass("");
        setUnitOfMeasureMapping("");
        setSubUnit("");
        setMicroUnit("");
        setApprovalFlowId("");
        setComment("");
        setErrors({});
    };

    const handleClose = () => {
        if (isSubmitting) return;

        resetForm();
        onClose();
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!materialCode.trim()) newErrors.materialCode = "Please enter material code";
        if (!materialGroup.trim()) newErrors.materialGroup = "Please enter material group";
        if (!productType.trim()) newErrors.productType = "Please enter product type";
        if (!description.trim()) newErrors.description = "Please enter description";
        if (!baseUnitOfMeasure.trim()) newErrors.baseUnitOfMeasure = "Please enter base unit of measure";
        if (!orderUnitOfMeasure.trim()) newErrors.orderUnitOfMeasure = "Please enter order unit of measure";
        if (!alternateUnitOfMeasure.trim()) newErrors.alternateUnitOfMeasure = "Please enter alternate unit of measure";
        if (!valuationClass.trim()) newErrors.valuationClass = "Please enter valuation class";
        if (!unitOfMeasureMapping.trim()) newErrors.unitOfMeasureMapping = "Please enter unit of measure mapping";
        if (!approvalFlowId) newErrors.approvalFlowId = "Please select an approval flow";
        if (!comment.trim()) newErrors.comment = "Please add a comment";

        // Sub Unit and Micro Unit are optional - no validation needed

        return newErrors;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors = validateForm();

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        if (!buyerId) {
            toastService.error("Buyer profile could not be loaded.");
            return;
        }

        setIsSubmitting(true);

        try {
            await createItemMaster({
                buyerId,
                description: description.trim(),
                materialCode: materialCode.trim(),
                materialGroup: materialGroup.trim(),
                productType: productType.trim(),
                baseUnitOfMeasure: baseUnitOfMeasure.trim(),
                orderUnitOfMeasure: orderUnitOfMeasure.trim(),
                alternateUnitOfMeasure: alternateUnitOfMeasure.trim(),
                valuationClass: valuationClass.trim(),
                unitOfMeasureMapping: unitOfMeasureMapping.trim(),
                subUnit: subUnit.trim() || undefined,
                microUnit: microUnit.trim() || undefined,
                approvalFlowId,
                comment: comment.trim(),
            });

            toastService.success("Item Master created successfully.");

            resetForm();
            onSuccess?.();
            onClose();
        } catch (error: any) {
            toastService.error(
                error?.message || "Failed to create Item Master."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="item-master-modal-overlay"
            onClick={handleClose}
        >
            <div
                className="item-master-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="item-master-modal-header">
                    <div>
                        <h2 className="item-master-modal-title">
                            Add Item Master
                        </h2>

                        <p className="item-master-modal-subtitle">
                            Create a new item master for your organization.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="item-master-modal-close"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <form
                    className="item-master-modal-form"
                    onSubmit={handleSubmit}
                >
                    {/* Material Code */}
                    <div className="item-master-field">
                        <label htmlFor="item-master-material-code">
                            MATERIAL CODE <span>*</span>
                        </label>

                        <input
                            id="item-master-material-code"
                            type="text"
                            placeholder="Enter material code"
                            value={materialCode}
                            className={
                                errors.materialCode
                                    ? "item-master-input-error"
                                    : ""
                            }
                            onChange={(e) => {
                                setMaterialCode(e.target.value);
                                clearFieldError(setErrors, "materialCode");
                            }}
                        />

                        {errors.materialCode && (
                            <div className="item-master-error">
                                {errors.materialCode}
                            </div>
                        )}
                    </div>

                    {/* Material Group, Product Type */}
                    <div className="item-master-fields-row">
                        <div className="item-master-field">
                            <label htmlFor="item-master-material-group">
                                MATERIAL GROUP <span>*</span>
                            </label>

                            <input
                                id="item-master-material-group"
                                type="text"
                                placeholder="Enter material group"
                                value={materialGroup}
                                className={
                                    errors.materialGroup
                                        ? "item-master-input-error"
                                        : ""
                                }
                                onChange={(e) => {
                                    setMaterialGroup(e.target.value);
                                    clearFieldError(setErrors, "materialGroup");
                                }}
                            />

                            {errors.materialGroup && (
                                <div className="item-master-error">
                                    {errors.materialGroup}
                                </div>
                            )}
                        </div>

                        <div className="item-master-field">
                            <label htmlFor="item-master-product-type">
                                PRODUCT TYPE <span>*</span>
                            </label>

                            <input
                                id="item-master-product-type"
                                type="text"
                                placeholder="Enter product type"
                                value={productType}
                                className={
                                    errors.productType
                                        ? "item-master-input-error"
                                        : ""
                                }
                                onChange={(e) => {
                                    setProductType(e.target.value);
                                    clearFieldError(setErrors, "productType");
                                }}
                            />

                            {errors.productType && (
                                <div className="item-master-error">
                                    {errors.productType}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="item-master-field">
                        <label htmlFor="item-master-description">
                            DESCRIPTION <span>*</span>
                        </label>

                        <input
                            id="item-master-description"
                            type="text"
                            placeholder="Enter description"
                            value={description}
                            className={
                                errors.description
                                    ? "item-master-input-error"
                                    : ""
                            }
                            onChange={(e) => {
                                setDescription(e.target.value);
                                clearFieldError(setErrors, "description");
                            }}
                        />

                        {errors.description && (
                            <div className="item-master-error">
                                {errors.description}
                            </div>
                        )}
                    </div>

                    <hr className="item-master-section-divider" />

                    {/* Base UOM, Order UOM */}
                    <div className="item-master-fields-row">
                        <div className="item-master-field">
                            <label htmlFor="item-master-base-uom">
                                BASE UNIT OF MEASURE <span>*</span>
                            </label>

                            <input
                                id="item-master-base-uom"
                                type="text"
                                placeholder="e.g., KG, L, M"
                                value={baseUnitOfMeasure}
                                className={
                                    errors.baseUnitOfMeasure
                                        ? "item-master-input-error"
                                        : ""
                                }
                                onChange={(e) => {
                                    setBaseUnitOfMeasure(e.target.value);
                                    clearFieldError(setErrors, "baseUnitOfMeasure");
                                }}
                            />

                            {errors.baseUnitOfMeasure && (
                                <div className="item-master-error">
                                    {errors.baseUnitOfMeasure}
                                </div>
                            )}
                        </div>

                        <div className="item-master-field">
                            <label htmlFor="item-master-order-uom">
                                ORDER UNIT OF MEASURE <span>*</span>
                            </label>

                            <input
                                id="item-master-order-uom"
                                type="text"
                                placeholder="e.g., BOX, CASE, PACK"
                                value={orderUnitOfMeasure}
                                className={
                                    errors.orderUnitOfMeasure
                                        ? "item-master-input-error"
                                        : ""
                                }
                                onChange={(e) => {
                                    setOrderUnitOfMeasure(e.target.value);
                                    clearFieldError(setErrors, "orderUnitOfMeasure");
                                }}
                            />

                            {errors.orderUnitOfMeasure && (
                                <div className="item-master-error">
                                    {errors.orderUnitOfMeasure}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Alternate UOM, Valuation Class */}
                    <div className="item-master-fields-row">
                        <div className="item-master-field">
                            <label htmlFor="item-master-alternate-uom">
                                ALTERNATE UNIT OF MEASURE <span>*</span>
                            </label>

                            <input
                                id="item-master-alternate-uom"
                                type="text"
                                placeholder="e.g., PCS"
                                value={alternateUnitOfMeasure}
                                className={
                                    errors.alternateUnitOfMeasure
                                        ? "item-master-input-error"
                                        : ""
                                }
                                onChange={(e) => {
                                    setAlternateUnitOfMeasure(e.target.value);
                                    clearFieldError(setErrors, "alternateUnitOfMeasure");
                                }}
                            />

                            {errors.alternateUnitOfMeasure && (
                                <div className="item-master-error">
                                    {errors.alternateUnitOfMeasure}
                                </div>
                            )}
                        </div>

                        <div className="item-master-field">
                            <label htmlFor="item-master-valuation-class">
                                VALUATION CLASS <span>*</span>
                            </label>

                            <input
                                id="item-master-valuation-class"
                                type="text"
                                placeholder="Enter valuation class"
                                value={valuationClass}
                                className={
                                    errors.valuationClass
                                        ? "item-master-input-error"
                                        : ""
                                }
                                onChange={(e) => {
                                    setValuationClass(e.target.value);
                                    clearFieldError(setErrors, "valuationClass");
                                }}
                            />

                            {errors.valuationClass && (
                                <div className="item-master-error">
                                    {errors.valuationClass}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Unit of Measure Mapping */}
                    <div className="item-master-field">
                        <label htmlFor="item-master-uom-mapping">
                            UNIT OF MEASURE MAPPING <span>*</span>
                        </label>

                        <input
                            id="item-master-uom-mapping"
                            type="text"
                            placeholder="e.g., 1 BOX = 400PCS"
                            value={unitOfMeasureMapping}
                            className={
                                errors.unitOfMeasureMapping
                                    ? "item-master-input-error"
                                    : ""
                            }
                            onChange={(e) => {
                                setUnitOfMeasureMapping(e.target.value);
                                clearFieldError(setErrors, "unitOfMeasureMapping");
                            }}
                        />

                        {errors.unitOfMeasureMapping && (
                            <div className="item-master-error">
                                {errors.unitOfMeasureMapping}
                            </div>
                        )}
                    </div>

                    {/* Sub Unit, Micro Unit (optional) */}
                    <div className="item-master-fields-row">
                        <div className="item-master-field">
                            <label htmlFor="item-master-sub-unit">
                                SUB UNIT
                            </label>

                            <input
                                id="item-master-sub-unit"
                                type="text"
                                placeholder="Enter sub unit (optional)"
                                value={subUnit}
                                onChange={(e) => setSubUnit(e.target.value)}
                            />
                        </div>

                        <div className="item-master-field">
                            <label htmlFor="item-master-micro-unit">
                                MICRO UNIT
                            </label>

                            <input
                                id="item-master-micro-unit"
                                type="text"
                                placeholder="Enter micro unit (optional)"
                                value={microUnit}
                                onChange={(e) => setMicroUnit(e.target.value)}
                            />
                        </div>
                    </div>

                    <hr className="item-master-section-divider" />

                    {/* Approval Flow */}
                    <div className="item-master-field">
                        <label htmlFor="item-master-approval-flow">
                            APPROVAL FLOW <span>*</span>
                        </label>

                        <select
                            id="item-master-approval-flow"
                            value={approvalFlowId}
                            disabled={approvalFlowLoading}
                            className={
                                errors.approvalFlowId
                                    ? "item-master-input-error"
                                    : ""
                            }
                            onChange={(e) => {
                                setApprovalFlowId(e.target.value);
                                clearFieldError(setErrors, "approvalFlowId");
                            }}
                        >
                            <option value="">
                                {approvalFlowLoading
                                    ? "Loading approval flows..."
                                    : "Select an approval flow"}
                            </option>

                            {approvalFlows.map((flow) => (
                                <option key={flow.id} value={flow.id}>
                                    {`${flow.approvalCode} - ${flow.approvalName}`}
                                </option>
                            ))}
                        </select>

                        {errors.approvalFlowId && (
                            <div className="item-master-error">
                                {errors.approvalFlowId}
                            </div>
                        )}

                        {approvalFlowError && (
                            <div className="item-master-field-hint item-master-field-hint-error">
                                {approvalFlowError}
                            </div>
                        )}
                    </div>

                    {/* Comment */}
                    <div className="item-master-field">
                        <label htmlFor="item-master-comment">
                            COMMENT <span>*</span>
                        </label>

                        <textarea
                            id="item-master-comment"
                            rows={3}
                            placeholder="Add comments or notes"
                            value={comment}
                            className={
                                errors.comment
                                    ? "item-master-input-error"
                                    : ""
                            }
                            onChange={(e) => {
                                setComment(e.target.value);
                                clearFieldError(setErrors, "comment");
                            }}
                        />

                        {errors.comment && (
                            <div className="item-master-error">
                                {errors.comment}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="item-master-modal-footer">
                        <button
                            type="button"
                            className="item-master-cancel-btn"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="item-master-create-btn"
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? "Creating..."
                                : "Create Item Master"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ItemMasterModal;
