import React, { useState, useMemo, useRef } from "react";

function fmtINR(val: number) {
  if (!val && val !== 0) return "—";
  return "₹" + Math.round(val).toLocaleString("en-IN");
}

function nowLabel() {
  const now = new Date();
  return (
    now.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) +
    ", " +
    now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  );
}

export interface ContractCreationViewProps {
  rfq: any;
  lineItems: any[];
  effectiveQuotations: any[];
  displaySuppliers: any[];
  selections: Record<string, string>;
  distinctSelected: string[];
  getQuoteItemForRfqItem: (quotation: any, rfqItem: any) => any | null;
  onBack: () => void;
}

export interface SignDetails {
  signerName: string;
  signerDesignation: string;
  signedAt: string;
  method: "e-sign" | "upload";
  fileName?: string;
  drawnSignatureUrl?: string;
}

interface ContractState {
  supplierId: string;
  contractNumber: string;
  itemIds: string[];
  startDate: string;
  endDate: string;
  dateError: boolean;
  step: "details" | "terms" | "sign" | "completed";
  sent: boolean;
  tcContent: string;
  tcEdited: boolean;
  tcLastUpdatedAt: string | null;
  tcEditorOpen: boolean;
  tcDraft: string;
  buyerFinalAccepted: boolean;
  supplierFinalAccepted: boolean;
  buyerSigned: boolean;
  supplierSigned: boolean;
  buyerSignDetails?: SignDetails | null;
  supplierSignDetails?: SignDetails | null;
  messages: Array<{ sender: string; text: string; time: string }>;
  draftMessage: string;
}

const SignaturePad: React.FC<{ onDraw: (dataUrl: string | null) => void }> = ({ onDraw }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ("clientX" in e) {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = "#1D4ED8";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    if (isEmpty) {
      setIsEmpty(false);
    }
    onDraw(canvas.toDataURL("image/png"));
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onDraw(null);
  };

  return (
    <div>
      <div style={{ position: "relative", border: "1px dashed #60A5FA", borderRadius: "8px", background: "#EFF6FF", overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          width={460}
          height={130}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ width: "100%", height: "130px", display: "block", cursor: "crosshair", touchAction: "none" }}
        />
        {isEmpty && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", color: "#93C5FD", fontSize: "12.5px", fontWeight: 500 }}>
            ✍️ Draw your signature here with cursor / touchpad...
          </div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
        <span style={{ fontSize: "10.5px", color: "#64748B" }}>
          {isEmpty ? "Canvas empty" : "Signature captured"}
        </span>
        <button
          type="button"
          onClick={clearCanvas}
          style={{ background: "none", border: "none", fontSize: "11.5px", color: "#EF4444", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
        >
          Clear Signature
        </button>
      </div>
    </div>
  );
};

export const ContractCreationView: React.FC<ContractCreationViewProps> = ({
  rfq,
  lineItems,
  effectiveQuotations,
  displaySuppliers,
  selections,
  distinctSelected,
  getQuoteItemForRfqItem,
  onBack,
}) => {
  // Determine awarded suppliers
  const awardedSupplierIds = useMemo(() => {
    if (distinctSelected.length > 0) return distinctSelected;
    if (displaySuppliers.length > 0) return [displaySuppliers[0].id];
    return [];
  }, [distinctSelected, displaySuppliers]);

  // Map of line items for each awarded supplier
  const supplierItemsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    awardedSupplierIds.forEach((sid) => {
      map[sid] = [];
    });
    lineItems.forEach((item: any) => {
      const itemId = item.id || item.itemId || item._id;
      const suppId = selections[itemId] || awardedSupplierIds[0];
      if (suppId) {
        if (!map[suppId]) map[suppId] = [];
        map[suppId].push(itemId);
      }
    });
    // Ensure every awarded supplier has at least line items if empty
    awardedSupplierIds.forEach((sid) => {
      if (!map[sid] || map[sid].length === 0) {
        map[sid] = lineItems.map((it: any) => it.id || it.itemId || it._id);
      }
    });
    return map;
  }, [awardedSupplierIds, lineItems, selections]);

  // Initialize contracts state per supplier
  const [contracts, setContracts] = useState<Record<string, ContractState>>(() => {
    const initial: Record<string, ContractState> = {};
    awardedSupplierIds.forEach((sid) => {
      initial[sid] = {
        supplierId: sid,
        contractNumber: "CTR-2026-" + (10000 + Math.floor(Math.random() * 89999)).toString().slice(0, 5),
        itemIds: supplierItemsMap[sid] || [],
        startDate: "2026-09-15",
        endDate: "2027-09-14",
        dateError: false,
        step: "details",
        sent: false,
        tcContent:
          "1. Payment Terms: 45 days from invoice date.\n2. Delivery: Within 30 days of purchase order issuance.\n3. Warranty: 12 months standard warranty on all items from date of delivery.\n4. Penalty: 1% of order value per week of delay, capped at maximum 10%.",
        tcEdited: false,
        tcLastUpdatedAt: null,
        tcEditorOpen: false,
        tcDraft: "",
        buyerFinalAccepted: false,
        supplierFinalAccepted: false,
        buyerSigned: false,
        supplierSigned: false,
        messages: [],
        draftMessage: "",
      };
    });
    return initial;
  });

  const [activeContractId, setActiveContractId] = useState<string>(
    awardedSupplierIds[0] || ""
  );

  const [selectAllSuppliers, setSelectAllSuppliers] = useState(true);
  const [sendSelection, setSendSelection] = useState<Record<string, boolean>>({});

  // Chat Drawer State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatViewSupplierId, setChatViewSupplierId] = useState<string | null>(null);

  // E-Sign Modal State
  const [eSignModalContractId, setESignModalContractId] = useState<string | null>(null);
  const [signerNameInput] = useState("ABCDEFGH");
  const [signerDesignationInput] = useState("Procurement Manager");
  const [declarationChecked, setDeclarationChecked] = useState(true);
  const [drawnSignatureData, setDrawnSignatureData] = useState<string | null>(null);

  const activeContract = contracts[activeContractId];

  const updateContract = (id: string, patch: Partial<ContractState>) => {
    setContracts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  // Helper calculation for contract value per supplier
  const getContractValue = (id: string) => {
    const c = contracts[id];
    if (!c) return 0;
    const suppQuotation =
      effectiveQuotations.find(
        (q: any) => (q.quotationId || q.supplierId || q._id) === id
      ) || effectiveQuotations[0];

    return c.itemIds.reduce((sum, itemId) => {
      const item = lineItems.find(
        (x: any) => (x.id || x.itemId || x._id) === itemId
      );
      if (!item) return sum;
      const qi = suppQuotation ? getQuoteItemForRfqItem(suppQuotation, item) : null;
      const qty = item.quantity || item.qty || 1;
      const unitPrice = qi?.quotedAmount ?? qi?.quotedPrice ?? 0;
      const discount = qi?.discount ?? (qi as any)?.discountPercentage ?? 0;
      const tax = qi?.tax ?? (qi as any)?.taxPercentage ?? (qi as any)?.gst ?? 0;
      const delivery = qi?.deliveryCharge ?? (qi as any)?.deliveryAmount ?? 0;
      const discAmt = discount > 0 ? Math.round((unitPrice * qty) * (discount / 100)) : 0;
      const taxAmt = tax > 0 ? Math.round((unitPrice * qty - discAmt) * (tax / 100)) : 0;
      return sum + (qi?.subTotal ?? (unitPrice * qty - discAmt + taxAmt + delivery));
    }, 0);
  };

  // Helper for active contract supplier name
  const getSupplierName = (sid: string) => {
    const q = effectiveQuotations.find(
      (x: any) => (x.quotationId || x.supplierId || x._id) === sid
    );
    const obj = displaySuppliers.find((s: any) => s.id === sid);
    return q?.supplierName || q?.organizationName || obj?.name || "ABC Technologies";
  };

  // Date handlers
  const handleStartDateChange = (id: string, val: string) => {
    const c = contracts[id];
    const patch: Partial<ContractState> = { startDate: val };
    const dateErr = new Date(c.endDate) < new Date(val);
    patch.dateError = dateErr;

    if (c.sent && !dateErr) {
      patch.messages = [
        ...c.messages,
        { sender: "Buyer", text: "Updated the contract start date.", time: nowLabel() },
      ];
    }
    updateContract(id, patch);
  };

  const handleEndDateChange = (id: string, val: string) => {
    const c = contracts[id];
    const patch: Partial<ContractState> = { endDate: val };
    const dateErr = new Date(val) < new Date(c.startDate);
    patch.dateError = dateErr;

    if (c.sent && !dateErr) {
      patch.messages = [
        ...c.messages,
        { sender: "Buyer", text: "Updated the contract end date.", time: nowLabel() },
      ];
    }
    updateContract(id, patch);
  };

  // T&C Editor Modal handlers
  const openTcEditor = (id: string) => {
    updateContract(id, {
      tcEditorOpen: true,
      tcDraft: contracts[id].tcContent,
    });
  };

  const closeTcEditor = (id: string) => {
    updateContract(id, { tcEditorOpen: false });
  };

  const saveTcEditor = (id: string) => {
    const c = contracts[id];
    const timeStr = nowLabel();
    const patch: Partial<ContractState> = {
      tcContent: c.tcDraft,
      tcEdited: true,
      tcLastUpdatedAt: timeStr,
      tcEditorOpen: false,
    };
    if (c.sent) {
      patch.messages = [
        ...c.messages,
        { sender: "Buyer", text: "Updated the Terms & Conditions document.", time: timeStr },
      ];
    }
    updateContract(id, patch);
  };

  // Send single contract
  const sendContractToSupplier = (id: string) => {
    updateContract(id, {
      sent: true,
      step: "terms",
      messages: [
        {
          sender: "Supplier",
          text: "We have received the contract details and are reviewing the terms.",
          time: nowLabel(),
        },
      ],
    });
  };

  // Bulk send contracts
  const pendingContractIds = awardedSupplierIds.filter(
    (id) => contracts[id] && contracts[id].step === "details" && !contracts[id].dateError
  );

  const selectedPendingCount = selectAllSuppliers
    ? pendingContractIds.length
    : pendingContractIds.filter((id) => sendSelection[id]).length;

  const handleBulkSend = () => {
    const updated = { ...contracts };
    awardedSupplierIds.forEach((id) => {
      const c = updated[id];
      if (c && c.step === "details" && !c.dateError) {
        if (selectAllSuppliers || sendSelection[id]) {
          updated[id] = {
            ...c,
            sent: true,
            step: "terms",
            messages: [
              {
                sender: "Supplier",
                text: "We have received the contract details and are reviewing the terms.",
                time: nowLabel(),
              },
            ],
          };
        }
      }
    });
    setContracts(updated);
    setSendSelection({});
  };

  // Negotiation Actions
  const handleBuyerAcceptFinal = (id: string) => {
    updateContract(id, { buyerFinalAccepted: true });
  };

  const handleSupplierAcceptFinal = (id: string) => {
    updateContract(id, { supplierFinalAccepted: true });
  };

  const handleProceedToSigning = (id: string) => {
    updateContract(id, { step: "sign" });
  };

  // Signing Actions
  const openESignModal = (id: string) => {
    setESignModalContractId(id);
    setDrawnSignatureData(null);
  };

  const confirmApplyESign = (id: string) => {
    const c = contracts[id];
    if (!c) return;
    const isSupplierSigned = c.supplierSigned;
    const timeStr = nowLabel();
    const signDetails: SignDetails = {
      signerName: signerNameInput.trim() || "ABCDEFGH",
      signerDesignation: signerDesignationInput.trim() || "Procurement Manager",
      signedAt: timeStr,
      method: "e-sign",
      drawnSignatureUrl: drawnSignatureData || undefined,
    };
    const msg = {
      sender: "Buyer",
      text: `Applied E-Signature by ${signDetails.signerName} (${signDetails.signerDesignation}).`,
      time: timeStr,
    };
    updateContract(id, {
      buyerSigned: true,
      buyerSignDetails: signDetails,
      messages: [...c.messages, msg],
      step: isSupplierSigned ? "completed" : "sign",
    });
    setESignModalContractId(null);
  };

  const handleUploadSignedContract = (id: string, fileName?: string) => {
    const c = contracts[id];
    if (!c) return;
    const isSupplierSigned = c.supplierSigned;
    const timeStr = nowLabel();
    const signDetails: SignDetails = {
      signerName: signerNameInput.trim() || "ABCDEFGH",
      signerDesignation: signerDesignationInput.trim() || "Procurement Manager",
      signedAt: timeStr,
      method: "upload",
      fileName: fileName || "Signed_Contract_Buyer.pdf",
    };
    const msg = {
      sender: "Buyer",
      text: `Uploaded signed contract (${signDetails.fileName}).`,
      time: timeStr,
    };
    updateContract(id, {
      buyerSigned: true,
      buyerSignDetails: signDetails,
      messages: [...c.messages, msg],
      step: isSupplierSigned ? "completed" : "sign",
    });
  };

  const handleSupplierSign = (id: string) => {
    const c = contracts[id];
    if (!c) return;
    const isBuyerSigned = c.buyerSigned;
    const timeStr = nowLabel();
    const supplierName = getSupplierName(c.supplierId);
    const signDetails: SignDetails = {
      signerName: supplierName,
      signerDesignation: "Authorized Representative",
      signedAt: timeStr,
      method: "e-sign",
    };
    const msg = {
      sender: "Supplier",
      text: `Supplier E-Signature applied by ${signDetails.signerName}.`,
      time: timeStr,
    };
    updateContract(id, {
      supplierSigned: true,
      supplierSignDetails: signDetails,
      messages: [...c.messages, msg],
      step: isBuyerSigned ? "completed" : "sign",
    });
  };

  // Chat messaging
  const handleSendChatMessage = (id: string) => {
    const c = contracts[id];
    if (!c || !c.draftMessage.trim()) return;
    const msg = { sender: "Buyer", text: c.draftMessage.trim(), time: nowLabel() };
    updateContract(id, {
      messages: [...c.messages, msg],
      draftMessage: "",
    });
  };

  const sentContractIds = awardedSupplierIds.filter((id) => contracts[id]?.sent);
  const activeChatSupplierId = chatViewSupplierId || sentContractIds[0] || activeContractId;
  const activeChatContract = contracts[activeChatSupplierId];

  const stepOrderLabels = ["Details", "Terms", "Sign", "Completed"];
  const activeStepIdx = activeContract
    ? ["details", "terms", "sign", "completed"].indexOf(activeContract.step)
    : 0;

  // Active contract line items table rows calculation
  const activeLineItemRows = useMemo(() => {
    if (!activeContract) return [];
    const suppQuotation =
      effectiveQuotations.find(
        (q: any) => (q.quotationId || q.supplierId || q._id) === activeContract.supplierId
      ) || effectiveQuotations[0];

    return activeContract.itemIds.map((itemId, idx) => {
      const item = lineItems.find(
        (x: any) => (x.id || x.itemId || x._id) === itemId
      ) || { description: "—", costCenter: "—", qty: 1, uom: "PCS" };

      const qi = suppQuotation ? getQuoteItemForRfqItem(suppQuotation, item) : null;
      const qty = item.quantity || item.qty || 1;
      const unitPrice = qi?.quotedAmount ?? qi?.quotedPrice ?? 0;
      const discount = qi?.discount ?? (qi as any)?.discountPercentage ?? 0;
      const tax = qi?.tax ?? (qi as any)?.taxPercentage ?? (qi as any)?.gst ?? 0;
      const delivery = qi?.deliveryCharge ?? (qi as any)?.deliveryAmount ?? 0;

      const discAmt = discount > 0 ? Math.round((unitPrice * qty) * (discount / 100)) : 0;
      const taxAmt = tax > 0 ? Math.round((unitPrice * qty - discAmt) * (tax / 100)) : 0;
      const subtotal = qi?.subTotal ?? (unitPrice * qty - discAmt + taxAmt + delivery);

      const parts = [];
      if (tax > 0) parts.push(fmtINR(taxAmt));
      if (discount > 0) parts.push(`-${fmtINR(discAmt)}`);
      if (delivery > 0) parts.push(fmtINR(delivery));
      const breakdownStr = parts.length > 0 ? parts.join(" / ") : "—";

      const cc = item.costCenter || item.costCenterCode || "—";
      const code = item.materialCode || item.code || "—";
      const ccCode = cc !== "—" && code !== "—" ? `${cc} / ${code}` : cc !== "—" ? cc : code;

      return {
        idx: idx + 1,
        material: item.description || item.name || "—",
        costCenterCode: ccCode,
        qty,
        uom: item.uom || item.unit || "PCS",
        unitPrice,
        breakdownStr,
        subtotal,
      };
    });
  }, [activeContract, lineItems, effectiveQuotations, getQuoteItemForRfqItem]);

  return (
    <div className="bca-contract-workspace" style={{ width: "100%", maxWidth: "100%", margin: "0", padding: "0 0 20px" }}>
      {/* Top Back Navigation */}
      <button
        type="button"
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: "#2563EB",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: "8px",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: 0,
        }}
      >
        ← Back to Bid Comparison &amp; Award
      </button>

      {/* Header and Step Chips */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "12px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#0F172A", margin: "0 0 6px 0" }}>
            Contract Creation
          </h1>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {stepOrderLabels.map((label, i) => {
              const isActive = i === activeStepIdx;
              const isPast = i < activeStepIdx;
              return (
                <span
                  key={label}
                  style={{
                    padding: "4px 14px",
                    borderRadius: "9999px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: isActive ? "#2563EB" : isPast ? "#ECFDF5" : "#F1F5F9",
                    color: isActive ? "#FFFFFF" : isPast ? "#059669" : "#64748B",
                  }}
                >
                  {label} {isPast && "✓"}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bulk Send Bar for Multi-Supplier Contracts */}
      {awardedSupplierIds.length > 1 && pendingContractIds.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            background: "#EFF6FF",
            border: "1px solid #BFDBFE",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "10px",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: "#1E3A8A", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={selectAllSuppliers}
              onChange={() => {
                setSelectAllSuppliers(!selectAllSuppliers);
                setSendSelection({});
              }}
              style={{ width: "16px", height: "16px", accentColor: "#2563EB", cursor: "pointer" }}
            />
            Select All Suppliers
          </label>

          <button
            type="button"
            onClick={handleBulkSend}
            disabled={selectedPendingCount === 0}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              cursor: selectedPendingCount === 0 ? "not-allowed" : "pointer",
              background: selectedPendingCount === 0 ? "#CBD5E1" : "#2563EB",
              color: "#FFFFFF",
            }}
          >
            {selectAllSuppliers
              ? `Send to All Suppliers (${pendingContractIds.length})`
              : `Send Selected Suppliers (${selectedPendingCount})`}
          </button>
        </div>
      )}

      {/* Supplier Tabs */}
      {awardedSupplierIds.length > 1 && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
          {awardedSupplierIds.map((sid) => {
            const c = contracts[sid];
            const name = getSupplierName(sid);
            const val = getContractValue(sid);
            const isSelected = sid === activeContractId;
            let statusText = "Details";
            if (c?.step === "completed") statusText = "Completed ✓";
            else if (c?.step === "sign") statusText = "Awaiting Signature";
            else if (c?.step === "terms" && c.sent) statusText = "Awaiting Supplier Review";

            const showCheck = !selectAllSuppliers && c?.step === "details" && !c?.dateError;

            return (
              <div key={sid} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {showCheck && (
                  <input
                    type="checkbox"
                    checked={!!sendSelection[sid]}
                    onChange={() =>
                      setSendSelection((prev) => ({ ...prev, [sid]: !prev[sid] }))
                    }
                    style={{ width: "15px", height: "15px", accentColor: "#2563EB", cursor: "pointer" }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setActiveContractId(sid)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    border: `1px solid ${isSelected ? "#2563EB" : "#CBD5E1"}`,
                    background: isSelected ? "#2563EB" : "#FFFFFF",
                    color: isSelected ? "#FFFFFF" : "#334155",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {name} — {fmtINR(val)}
                  <br />
                  <span style={{ fontSize: "11px", fontWeight: 500, opacity: 0.85 }}>
                    {statusText}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Contract Details Workspace Card */}
      {activeContract && (
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            marginBottom: "24px",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#1E3A8A", marginBottom: "16px" }}>
            Contract {awardedSupplierIds.length > 1 && `— ${getSupplierName(activeContract.supplierId)}`}
          </div>

          {/* Details Row Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.5fr 1fr 1fr 1fr", gap: "20px", marginBottom: "24px" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", letterSpacing: "0.04em", marginBottom: "4px" }}>
                RFQ TITLE
              </div>
              <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#0F172A" }}>
                {rfq?.title || rfq?.rfqNo || rfq?.name || "Office IT Equipment Procurement"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", letterSpacing: "0.04em", marginBottom: "4px" }}>
                RFQ DESCRIPTION
              </div>
              <div style={{ fontSize: "12.5px", color: "#334155", lineHeight: "1.4" }}>
                {rfq?.description || "Procurement of laptops and accessories for the new office."}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", letterSpacing: "0.04em", marginBottom: "4px" }}>
                SUPPLIER
              </div>
              <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#0F172A" }}>
                {getSupplierName(activeContract.supplierId)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", letterSpacing: "0.04em", marginBottom: "4px" }}>
                CONTRACT START DATE
              </div>
              <input
                type="date"
                value={activeContract.startDate}
                onChange={(e) => handleStartDateChange(activeContract.supplierId, e.target.value)}
                disabled={activeContract.buyerSigned && activeContract.supplierSigned}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  fontSize: "12.5px",
                  color: "#0F172A",
                  background: "#FFFFFF",
                }}
              />
            </div>

            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", letterSpacing: "0.04em", marginBottom: "4px" }}>
                CONTRACT END DATE
              </div>
              <input
                type="date"
                value={activeContract.endDate}
                onChange={(e) => handleEndDateChange(activeContract.supplierId, e.target.value)}
                disabled={activeContract.buyerSigned && activeContract.supplierSigned}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  fontSize: "12.5px",
                  color: "#0F172A",
                  background: "#FFFFFF",
                }}
              />
              {activeContract.dateError && (
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#DC2626", marginTop: "4px" }}>
                  End date cannot be earlier than start date.
                </div>
              )}
            </div>
          </div>

          {/* Selected Line Items Section */}
          <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#1E293B", margin: "0 0 12px 0" }}>
            Selected Line Items
          </h4>

          <div style={{ overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: "8px", marginBottom: "16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", color: "#475569" }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, width: "36px" }}>#</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>Material</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700 }}>Cost Center / Code</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, width: "60px" }}>Qty</th>
                  <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, width: "60px" }}>UOM</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>Unit Price</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>Tax / Disc. / Del.</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {activeLineItemRows.map((row) => (
                  <tr key={row.idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "10px 12px", color: "#64748B" }}>{row.idx}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0F172A" }}>{row.material}</td>
                    <td style={{ padding: "10px 12px", color: "#475569" }}>{row.costCenterCode}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", color: "#334155" }}>{row.qty}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", color: "#334155" }}>{row.uom}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#0F172A" }}>
                      {fmtINR(row.unitPrice)}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: "#64748B", fontSize: "11.5px" }}>
                      {row.breakdownStr}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#0F172A" }}>
                      {fmtINR(row.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", padding: "6px 0", marginBottom: "20px" }}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#1E293B",
                background: "#F1F5F9",
                padding: "8px 16px",
                borderRadius: "8px",
              }}
            >
              Total Contract Value:{" "}
              <span style={{ color: "#2563EB", fontWeight: 800, fontSize: "15px" }}>
                {fmtINR(getContractValue(activeContractId))}
              </span>
            </div>
          </div>

          {/* Terms & Conditions Attachment Card */}
          <div style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 10px 0" }}>
            Terms &amp; Conditions
          </div>
          <div
            style={{
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
              marginBottom: "18px",
            }}
          >
            <div>
              <div style={{ fontSize: "12.5px", fontWeight: 600, marginBottom: "3px" }}>
                Buyer Terms &amp; Conditions
              </div>
              <div style={{ fontSize: "11.5px", color: "#475569" }}>
                Terms_and_Conditions.pdf
              </div>
              <div style={{ marginTop: "4px" }}>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: "0.03em",
                    color: activeContract.tcEdited ? "#D97706" : "#059669",
                  }}
                >
                  {activeContract.tcEdited
                    ? `Last Updated: ${activeContract.tcLastUpdatedAt}`
                    : "Fetched from RFQ"}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => alert(activeContract.tcContent)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "1px solid #E2E8F0",
                  background: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => openTcEditor(activeContractId)}
                disabled={
                  activeContract.supplierFinalAccepted ||
                  (activeContract.buyerSigned && activeContract.supplierSigned)
                }
                style={{
                  padding: "7px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "1px solid #E2E8F0",
                  background: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                Edit
              </button>
            </div>
          </div>

          {/* Edit Terms Modal Overlay */}
          {activeContract.tcEditorOpen && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.5)",
                backdropFilter: "blur(2px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 60,
              }}
            >
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: "12px",
                  boxShadow: "0 20px 40px -8px rgba(0,0,0,0.25)",
                  width: "560px",
                  maxWidth: "90vw",
                  padding: "24px 26px",
                }}
              >
                <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px" }}>
                  Edit Terms &amp; Conditions
                </div>
                <div style={{ fontSize: "12px", color: "#475569", marginBottom: "14px" }}>
                  Terms_and_Conditions.pdf
                </div>
                <textarea
                  rows={8}
                  value={activeContract.tcDraft}
                  onChange={(e) => updateContract(activeContractId, { tcDraft: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #E2E8F0",
                    fontSize: "12.5px",
                    lineHeight: "1.6",
                    color: "#334155",
                    fontFamily: "inherit",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                  <button
                    type="button"
                    onClick={() => closeTcEditor(activeContractId)}
                    style={{
                      padding: "9px 16px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 600,
                      border: "1px solid #E2E8F0",
                      background: "#FFFFFF",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => saveTcEditor(activeContractId)}
                    style={{
                      padding: "9px 16px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 600,
                      border: "none",
                      background: "#2563EB",
                      color: "#FFFFFF",
                      cursor: "pointer",
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action Step: Details -> Send Contract to Supplier */}
          {activeContract.step === "details" && (
            <div
              style={{
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                borderRadius: "8px",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", fontSize: "12.5px", fontWeight: 600, color: "#1E3A8A" }}>
                <span>Contract Value: {fmtINR(getContractValue(activeContractId))}</span>
                <span>Line Items: {activeContract.itemIds.length}</span>
                <span>Supplier: {getSupplierName(activeContract.supplierId)}</span>
              </div>
              <button
                type="button"
                onClick={() => sendContractToSupplier(activeContractId)}
                disabled={activeContract.dateError}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: activeContract.dateError ? "not-allowed" : "pointer",
                  background: activeContract.dateError ? "#CBD5E1" : "#2563EB",
                  color: "#FFFFFF",
                }}
              >
                Send to Supplier
              </button>
            </div>
          )}

          {/* Action Step: Terms Negotiation & Acceptance */}
          {(activeContract.step === "terms" ||
            activeContract.step === "completed" ||
            (activeContract.step === "sign" && !activeContract.supplierSigned)) && (
            <div style={{ border: "1px solid #E2E8F0", borderRadius: "8px", padding: "16px 18px", marginBottom: "14px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>
                Supplier Terms Received
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "10px", flexWrap: "wrap" }}>
                <div style={{ fontSize: "11.5px", color: "#475569" }}>
                  Supplier_Terms.pdf — Submitted for Buyer Review
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => alert("Previewing Supplier Terms...")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      border: "1px solid #E2E8F0",
                      background: "#FFFFFF",
                      cursor: "pointer",
                    }}
                  >
                    Preview
                  </button>
                </div>
              </div>

              <div style={{ fontSize: "11.5px", color: "#475569", marginBottom: "12px" }}>
                Use the chat button at bottom right to discuss terms with the supplier.
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
                <button
                  type="button"
                  onClick={() => handleBuyerAcceptFinal(activeContractId)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background: activeContract.buyerFinalAccepted ? "#ECFDF5" : "#2563EB",
                    color: activeContract.buyerFinalAccepted ? "#059669" : "#FFFFFF",
                  }}
                >
                  {activeContract.buyerFinalAccepted ? "✓ Buyer Accepted" : "Accept Terms"}
                </button>

                {!activeContract.supplierFinalAccepted && (
                  <button
                    type="button"
                    onClick={() => handleSupplierAcceptFinal(activeContractId)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      border: "1px solid #E2E8F0",
                      background: "#F1F5F9",
                      color: "#0F172A",
                      cursor: "pointer",
                    }}
                  >
                    Simulate: Supplier Accepts
                  </button>
                )}
              </div>

              {/* Final Terms Acceptance Gate */}
              <div style={{ display: "flex", gap: "16px", marginBottom: "12px", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: activeContract.buyerFinalAccepted ? "#059669" : "#64748B",
                  }}
                >
                  Buyer — {activeContract.buyerFinalAccepted ? "Accepted ✓" : "Awaiting Acceptance"}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: activeContract.supplierFinalAccepted ? "#059669" : "#64748B",
                  }}
                >
                  Supplier — {activeContract.supplierFinalAccepted ? "Accepted ✓" : "Awaiting Acceptance"}
                </span>
              </div>

              {activeContract.step === "terms" && (
                <button
                  type="button"
                  onClick={() => handleProceedToSigning(activeContractId)}
                  disabled={!(activeContract.buyerFinalAccepted && activeContract.supplierFinalAccepted)}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "none",
                    cursor:
                      activeContract.buyerFinalAccepted && activeContract.supplierFinalAccepted
                        ? "pointer"
                        : "not-allowed",
                    background:
                      activeContract.buyerFinalAccepted && activeContract.supplierFinalAccepted
                        ? "#2563EB"
                        : "#CBD5E1",
                    color: "#FFFFFF",
                  }}
                >
                  Proceed to Signing
                </button>
              )}
            </div>
          )}

          {/* Action Step: Signing */}
          {activeContract.step === "sign" && (
            <div style={{ border: "1px solid #E2E8F0", borderRadius: "8px", padding: "16px 18px", marginBottom: "14px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "10px" }}>
                Contract Signing
              </div>

              {/* Hidden File Input for Upload Signed Contract */}
              <input
                type="file"
                id="signed-contract-upload-input"
                style={{ display: "none" }}
                accept=".pdf,.png,.jpg,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleUploadSignedContract(activeContractId, file.name);
                  }
                }}
              />

              <div style={{ display: "flex", gap: "24px", marginBottom: "14px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: 'uppercase', letterSpacing: "0.04em", marginBottom: "4px" }}>
                    Buyer Signature
                  </div>
                  <div style={{ fontSize: "12.5px", fontWeight: 600, color: activeContract.buyerSigned ? "#059669" : "#64748B" }}>
                    {activeContract.buyerSigned ? "Signed ✓" : "Awaiting Signature"}
                  </div>
                  {activeContract.buyerSigned && activeContract.buyerSignDetails && (
                    <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                      By {activeContract.buyerSignDetails.signerName} ({activeContract.buyerSignDetails.signerDesignation})
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: 'uppercase', letterSpacing: "0.04em", marginBottom: "4px" }}>
                    Supplier Signature
                  </div>
                  <div style={{ fontSize: "12.5px", fontWeight: 600, color: activeContract.supplierSigned ? "#059669" : "#64748B" }}>
                    {activeContract.supplierSigned ? "Signed ✓" : "Awaiting Signature"}
                  </div>
                  {activeContract.supplierSigned && activeContract.supplierSignDetails && (
                    <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                      By {activeContract.supplierSignDetails.signerName} ({activeContract.supplierSignDetails.signerDesignation})
                    </div>
                  )}
                </div>
              </div>

              {/* Buyer Signed Badge & Signature Box */}
              {activeContract.buyerSigned && activeContract.buyerSignDetails && (
                <div style={{ background: "#EFF6FF", border: "1px dashed #60A5FA", borderRadius: "8px", padding: "12px 16px", marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#1E40AF", textTransform: "uppercase" }}>
                      Buyer E-Signature Verified ✓
                    </span>
                    <span style={{ fontSize: "10px", color: "#64748B" }}>
                      {activeContract.buyerSignDetails.signedAt}
                    </span>
                  </div>
                  {activeContract.buyerSignDetails.drawnSignatureUrl ? (
                    <div style={{ margin: "6px 0" }}>
                      <img
                        src={activeContract.buyerSignDetails.drawnSignatureUrl}
                        alt="Handwritten Signature"
                        style={{ maxHeight: "55px", objectFit: "contain" }}
                      />
                    </div>
                  ) : (
                    <div style={{ fontFamily: "cursive, 'Dancing Script', 'Brush Script MT', sans-serif", fontSize: "22px", fontWeight: 700, color: "#1D4ED8" }}>
                      /s/ {activeContract.buyerSignDetails.signerName}
                    </div>
                  )}
                  <div style={{ fontSize: "11px", color: "#334155", fontWeight: 500, marginTop: "2px" }}>
                    {activeContract.buyerSignDetails.signerName} ({activeContract.buyerSignDetails.signerDesignation}) • SILA Procurement
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => openESignModal(activeContractId)}
                  disabled={activeContract.buyerSigned}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    border: "none",
                    cursor: activeContract.buyerSigned ? "not-allowed" : "pointer",
                    background: activeContract.buyerSigned ? "#ECFDF5" : "#2563EB",
                    color: activeContract.buyerSigned ? "#059669" : "#FFFFFF",
                  }}
                >
                  {activeContract.buyerSigned ? "✓ Buyer Signed" : "E-Sign Contract"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById("signed-contract-upload-input");
                    if (input) input.click();
                  }}
                  disabled={activeContract.buyerSigned}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    border: "1px solid #E2E8F0",
                    background: "#FFFFFF",
                    color: "#0F172A",
                    cursor: activeContract.buyerSigned ? "not-allowed" : "pointer",
                    opacity: activeContract.buyerSigned ? 0.6 : 1,
                  }}
                >
                  Upload Signed Contract
                </button>

                {!activeContract.supplierSigned && (
                  <button
                    type="button"
                    onClick={() => handleSupplierSign(activeContractId)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      border: "1px solid #CBD5E1",
                      background: "#F8FAFC",
                      color: "#334155",
                      cursor: "pointer",
                    }}
                  >
                    Simulate: Supplier Signs
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action Step: Completed */}
          {activeContract.step === "completed" && (
            <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: "10px", padding: "20px 24px", textAlign: "center", marginBottom: "14px" }}>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#059669", marginBottom: "16px" }}>
                Contract Created Successfully
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "32px", flexWrap: "wrap", marginBottom: "18px", fontSize: "12.5px", fontWeight: 600, textAlign: "left" }}>
                <div>
                  <div style={{ color: "#475569", fontWeight: 500, fontSize: "11px", marginBottom: "2px" }}>Contract Number</div>
                  <div style={{ color: "#0F172A", fontWeight: 700 }}>{activeContract.contractNumber}</div>
                </div>
                <div>
                  <div style={{ color: "#475569", fontWeight: 500, fontSize: "11px", marginBottom: "2px" }}>Supplier</div>
                  <div style={{ color: "#0F172A", fontWeight: 700 }}>{getSupplierName(activeContract.supplierId)}</div>
                </div>
                <div>
                  <div style={{ color: "#475569", fontWeight: 500, fontSize: "11px", marginBottom: "2px" }}>Contract Value</div>
                  <div style={{ color: "#0F172A", fontWeight: 700 }}>{fmtINR(getContractValue(activeContractId))}</div>
                </div>
                <div>
                  <div style={{ color: "#475569", fontWeight: 500, fontSize: "11px", marginBottom: "2px" }}>Start Date</div>
                  <div style={{ color: "#0F172A", fontWeight: 700 }}>{activeContract.startDate}</div>
                </div>
                <div>
                  <div style={{ color: "#475569", fontWeight: 500, fontSize: "11px", marginBottom: "2px" }}>End Date</div>
                  <div style={{ color: "#0F172A", fontWeight: 700 }}>{activeContract.endDate}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => alert(`Contract ${activeContract.contractNumber} Details:\nSupplier: ${getSupplierName(activeContract.supplierId)}\nValue: ${fmtINR(getContractValue(activeContractId))}`)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "1px solid #10B981",
                    background: "#FFFFFF",
                    color: "#059669",
                    cursor: "pointer",
                  }}
                >
                  View Contract
                </button>
                <button
                  type="button"
                  onClick={() => alert(`Downloading final executed contract ${activeContract.contractNumber}.pdf...`)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "none",
                    background: "#059669",
                    color: "#FFFFFF",
                    cursor: "pointer",
                  }}
                >
                  Download Contract
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Chat Drawer Trigger Button */}
      {sentContractIds.length > 0 && !chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#2563EB",
            color: "#FFFFFF",
            borderRadius: "9999px",
            padding: "12px 18px",
            fontSize: "13px",
            fontWeight: 700,
            border: "none",
            boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.4)",
            cursor: "pointer",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>💬 Supplier Chats</span>
          {activeChatContract?.messages.length ? (
            <span style={{ background: "#EF4444", color: "#FFFFFF", borderRadius: "9999px", width: "18px", height: "18px", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {activeChatContract.messages.length}
            </span>
          ) : null}
        </button>
      )}

      {/* Supplier Chat Sidebar Drawer */}
      {chatOpen && (
        <>
          <div
            onClick={() => setChatOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.25)",
              zIndex: 55,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "640px",
              maxWidth: "92vw",
              background: "#FFFFFF",
              borderLeft: "1px solid #E2E8F0",
              boxShadow: "-8px 0 24px 0 rgba(0,0,0,0.12)",
              zIndex: 56,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
              <div style={{ fontSize: "14px", fontWeight: 700 }}>Supplier Chats</div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#475569", lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              {/* Supplier Thread List */}
              <div style={{ width: "220px", flexShrink: 0, borderRight: "1px solid #E2E8F0", overflowY: "auto" }}>
                {sentContractIds.map((sid) => {
                  const c = contracts[sid];
                  const suppName = getSupplierName(sid);
                  const isSel = sid === activeChatSupplierId;
                  return (
                    <div
                      key={sid}
                      onClick={() => setChatViewSupplierId(sid)}
                      style={{
                        padding: "12px 14px",
                        borderBottom: "1px solid #F1F5F9",
                        cursor: "pointer",
                        background: isSel ? "#EFF6FF" : "#FFFFFF",
                        borderLeft: isSel ? "3px solid #2563EB" : "3px solid transparent",
                      }}
                    >
                      <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#0F172A", marginBottom: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {suppName}
                      </div>
                      <div style={{ fontSize: "10.5px", color: "#64748B" }}>
                        {c?.contractNumber || sid}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Conversation Pane */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "10px 14px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                  Chatting with {getSupplierName(activeChatSupplierId)}
                </div>
                <div style={{ flex: 1, padding: "14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {activeChatContract?.messages.map((m: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        alignSelf: m.sender === "Buyer" ? "flex-end" : "flex-start",
                        maxWidth: "75%",
                        background: m.sender === "Buyer" ? "#EFF6FF" : "#F1F5F9",
                        borderRadius: "8px",
                        padding: "8px 12px",
                      }}
                    >
                      <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#94A3B8", textTransform: 'uppercase', marginBottom: "2px" }}>
                        {m.sender}
                      </div>
                      <div style={{ fontSize: "12.5px" }}>{m.text}</div>
                      <div style={{ fontSize: "10px", color: "#94A3B8", marginTop: "4px", textAlign: "right" }}>
                        {m.time}
                      </div>
                    </div>
                  ))}
                  {(!activeChatContract || activeChatContract.messages.length === 0) && (
                    <div style={{ fontSize: "12px", color: "#94A3B8", textAlign: "center", marginTop: "20px" }}>
                      No messages yet. Start the conversation.
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px", padding: "14px 18px", borderTop: "1px solid #E2E8F0", flexShrink: 0 }}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={activeChatContract?.draftMessage || ""}
                    onChange={(e) => updateContract(activeChatSupplierId, { draftMessage: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendChatMessage(activeChatSupplierId);
                    }}
                    style={{ flex: 1, padding: "9px 10px", border: "1px solid #E2E8F0", borderRadius: "6px", fontSize: "12.5px", fontFamily: "inherit" }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSendChatMessage(activeChatSupplierId)}
                    style={{ padding: "9px 16px", borderRadius: "6px", fontSize: "12.5px", fontWeight: 600, border: "none", cursor: "pointer", background: "#2563EB", color: "#ffffff" }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {/* E-Sign Modal Overlay */}
      {eSignModalContractId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 65,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "12px",
              boxShadow: "0 20px 40px -8px rgba(0,0,0,0.25)",
              width: "520px",
              maxWidth: "92vw",
              padding: "24px 26px",
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A", marginBottom: "4px" }}>
              E-Sign Contract
            </div>
            <div style={{ fontSize: "12.5px", color: "#64748B", marginBottom: "16px" }}>
              Please draw your signature below to sign this contract.
            </div>

            {/* Signature Drawing Pad Canvas */}
            <div style={{ marginBottom: "16px" }}>
              <SignaturePad onDraw={setDrawnSignatureData} />
            </div>

            {/* Declaration Checkbox */}
            <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "12px", color: "#334155", cursor: "pointer", marginBottom: "20px" }}>
              <input
                type="checkbox"
                checked={declarationChecked}
                onChange={(e) => setDeclarationChecked(e.target.checked)}
                style={{ marginTop: "2px", width: "15px", height: "15px", accentColor: "#2563EB" }}
              />
              <span>I declare that I am authorized to sign this contract and agree to all terms and conditions specified herein.</span>
            </label>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setESignModalContractId(null)}
                style={{ padding: "9px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, border: "1px solid #E2E8F0", background: "#FFFFFF", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmApplyESign(eSignModalContractId)}
                disabled={!declarationChecked || !drawnSignatureData}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: (!declarationChecked || !drawnSignatureData) ? "not-allowed" : "pointer",
                  background: (!declarationChecked || !drawnSignatureData) ? "#CBD5E1" : "#2563EB",
                  color: "#FFFFFF",
                }}
              >
                Confirm &amp; Apply E-Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractCreationView;
