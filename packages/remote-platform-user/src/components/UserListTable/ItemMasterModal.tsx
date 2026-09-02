import React, { useState } from "react";
import { createItemMaster } from "../../api/itemmasterapi";
import { toastService } from "@vosox/shared-ui";
import "./ItemMasterModal.css";

interface ItemMasterModalProps {
    isOpen: boolean;
    onClose: () => void;
    buyerId: string;
}

const ItemMasterModal: React.FC<ItemMasterModalProps> = ({
    isOpen,
    onClose,
    buyerId,
}) => {
    const [description, setDescription] = useState("");
    const [materialCode, setMaterialCode] = useState("");
    const [materialGroup, setMaterialGroup] = useState("");

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) {
        return null;
    }

    const resetForm = () => {
        setDescription("");
        setMaterialCode("");
        setMaterialGroup("");
        setErrors({});
    };

    const handleClose = () => {
        if (isSubmitting) return;

        resetForm();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors: Record<string, string> = {};

        if (!description.trim()) {
            newErrors.description = "Please enter description";
        }

        if (!materialCode.trim()) {
            newErrors.materialCode = "Please enter material code";
        }

        if (!materialGroup.trim()) {
            newErrors.materialGroup = "Please enter material group";
        }

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
            });

            toastService.success("Item Master created successfully.");

            resetForm();
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

                                setErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.description;
                                    return next;
                                });
                            }}
                        />

                        {errors.description && (
                            <div className="item-master-error">
                                {errors.description}
                            </div>
                        )}
                    </div>

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

                                setErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.materialCode;
                                    return next;
                                });
                            }}
                        />

                        {errors.materialCode && (
                            <div className="item-master-error">
                                {errors.materialCode}
                            </div>
                        )}
                    </div>

                    {/* Material Group */}
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

                                setErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.materialGroup;
                                    return next;
                                });
                            }}
                        />

                        {errors.materialGroup && (
                            <div className="item-master-error">
                                {errors.materialGroup}
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