"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/finance";
import { resolveUnspecifiedImeisAction } from "@/server/actions/catalog";
import { normalizeImei } from "@/lib/imei-stock";

type Row = {
  id: string;
  brand: string;
  model: string;
  imei: string; // display value (may be "unspecified imei")
  imeiActual: string; // stored DB value
  isPlaceholder: boolean;
  status: "SOLD" | "IN_STOCK" | "IN_TRANSIT";
  location: string;
  sellPrice: string;
  costPrice: string;
  addedAt: string;
  updatedAt: string;
  srName: string | null;
  shopName: string | null;
};

type Props = {
  rows: Row[];
  brands: string[];
};

export function OwnerImeiLedgerClient({ rows, brands }: Props) {
  const router = useRouter();
  const [brand, setBrand] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | Row["status"]>("ALL");
  const [model, setModel] = useState("ALL");
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveInput, setResolveInput] = useState("");
  const [resolveImeiList, setResolveImeiList] = useState<string[]>([]);
  const [resolveMode, setResolveMode] = useState<"scanner" | "camera" | "manual">("scanner");
  const [cameraStatus, setCameraStatus] = useState<string>("Ready");
  const [resolveErr, setResolveErr] = useState<string | null>(null);
  const [resolvePending, startResolve] = useTransition();

  const [cameraTypedInput, setCameraTypedInput] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const scannerBufferRef = useRef("");
  const scannerTimerRef = useRef<number | null>(null);
  const lastScanRef = useRef<Map<string, number>>(new Map());

  // Lock background scroll while resolve modal is open.
  useEffect(() => {
    if (!resolveOpen) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [resolveOpen]);

  const models = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      if (brand !== "ALL" && row.brand !== brand) continue;
      set.add(row.model);
    }
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [brand, rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (brand !== "ALL" && row.brand !== brand) return false;
      if (status !== "ALL" && row.status !== status) return false;
      if (model !== "ALL" && row.model !== model) return false;
      if (!q) return true;
      const blob = [
        row.brand,
        row.model,
        row.imeiActual,
        row.imei,
        row.location,
        row.srName ?? "",
        row.shopName ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [brand, model, query, rows, status]);

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const data = filtered.map((row) => ({
      Brand: row.brand,
      Model: row.model,
      IMEI: row.imei,
      Status: row.status,
      Location: row.location,
      SellPrice: row.sellPrice,
      CostPrice: row.costPrice,
      SalesRep: row.srName ?? "",
      Shop: row.shopName ?? "",
      AddedAt: new Date(row.addedAt).toLocaleString(),
      UpdatedAt: new Date(row.updatedAt).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "IMEI Ledger");
    XLSX.writeFile(wb, "imei-ledger.xlsx");
  }

  async function exportPdf() {
    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const autoTable = autoTableModule.default;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("IMEI Ledger", 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [["Brand", "Model", "IMEI", "Status", "Location", "Sell", "Cost", "Rep", "Shop"]],
      body: filtered.map((row) => [
        row.brand,
        row.model,
        row.imei,
        row.status,
        row.location,
        row.sellPrice,
        row.costPrice,
        row.srName ?? "",
        row.shopName ?? "",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [20, 184, 166] },
    });
    doc.save("imei-ledger.pdf");
  }

  const statusPill = (value: Row["status"]) =>
    value === "SOLD"
      ? "bg-emerald-500/15 text-emerald-300"
      : value === "IN_TRANSIT"
        ? "bg-amber-500/15 text-amber-300"
        : "bg-sky-500/15 text-sky-300";

  const visiblePlaceholders = useMemo(() => filtered.filter((r) => r.isPlaceholder), [filtered]);
  const visiblePlaceholderIds = useMemo(() => visiblePlaceholders.map((r) => r.id), [visiblePlaceholders]);

  // Now that visiblePlaceholders exists, re-wrap addResolveImei with correct dependency.
  const addResolveImeiWithCap = useCallback(
    (raw: string) => {
      const imei = normalizeImei(raw);
      if (!imei) return;
      if (imei.length < 8) {
        setResolveErr("Invalid IMEI.");
        return;
      }
      setResolveErr(null);
      setResolveImeiList((prev) => {
        if (prev.includes(imei)) return prev;
        if (prev.length >= visiblePlaceholders.length) return prev;
        return [...prev, imei];
      });
    },
    [visiblePlaceholders.length],
  );

  // Barcode scanner mode: collects typed scan strings (e.g. via hardware keyboard scanner).
  useEffect(() => {
    if (!resolveOpen || resolveMode !== "scanner") return;

    function flushScannerBuffer() {
      const raw = scannerBufferRef.current.trim();
      if (raw) addResolveImeiWithCap(raw);
      scannerBufferRef.current = "";

      if (scannerTimerRef.current !== null) {
        window.clearTimeout(scannerTimerRef.current);
        scannerTimerRef.current = null;
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter") {
        e.preventDefault();
        flushScannerBuffer();
        return;
      }
      if (e.key === "Tab" || e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") {
        return;
      }
      if (e.key.length !== 1) return;

      scannerBufferRef.current += e.key;

      if (scannerTimerRef.current !== null) {
        window.clearTimeout(scannerTimerRef.current);
      }
      scannerTimerRef.current = window.setTimeout(() => {
        flushScannerBuffer();
      }, 250) as unknown as number;
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      scannerBufferRef.current = "";
      if (scannerTimerRef.current !== null) {
        window.clearTimeout(scannerTimerRef.current);
        scannerTimerRef.current = null;
      }
    };
  }, [resolveOpen, resolveMode, addResolveImeiWithCap]);

  // Camera mode: ZXing barcode decode and adds scanned IMEIs.
  useEffect(() => {
    if (!resolveOpen || resolveMode !== "camera") return;

    let cancelled = false;
    setCameraStatus("Starting camera…");

    async function startCamera() {
      if (!window.isSecureContext) {
        setResolveErr("Phone camera needs HTTPS or localhost.");
        setCameraStatus("HTTPS required");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setResolveErr("This browser cannot access the camera here.");
        setCameraStatus("Camera unavailable");
        return;
      }

      try {
        setResolveErr(null);
        setCameraStatus("Point the camera at the barcode");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        if (cancelled) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();

        const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
          const raw = result?.getText?.();
          if (!raw) return;
          const normalized = normalizeImei(raw);
          if (!normalized) return;

          const now = Date.now();
          const last = lastScanRef.current.get(normalized) ?? 0;
          if (now - last < 1200) return;
          lastScanRef.current.set(normalized, now);

          addResolveImeiWithCap(normalized);
        });

        zxingControlsRef.current = controls;
      } catch (e) {
        const msg = e instanceof Error ? e.message.toLowerCase() : "";
        if (msg.includes("permission") || msg.includes("denied") || msg.includes("notallowed")) {
          setResolveErr("Camera permission was denied.");
          setCameraStatus("Permission denied");
          return;
        }
        if (msg.includes("secure") || msg.includes("https")) {
          setResolveErr("Phone camera needs HTTPS or localhost.");
          setCameraStatus("HTTPS required");
          return;
        }
        if (msg.includes("notfound") || msg.includes("devices not found")) {
          setResolveErr("No camera was found on this device.");
          setCameraStatus("No camera found");
          return;
        }
        setResolveErr("Could not open phone camera.");
        setCameraStatus("Camera blocked");
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      if (zxingControlsRef.current) {
        zxingControlsRef.current.stop();
        zxingControlsRef.current = null;
      }
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
      }
    };
  }, [resolveOpen, resolveMode, addResolveImeiWithCap]);

  return (
    <div className="space-y-6">
      {resolveOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-[96px] sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/70" aria-label="Close" onClick={() => setResolveOpen(false)} />
          <div className="relative flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-zinc-700 bg-zinc-900 shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Resolve unspecified IMEIs</h2>
                <p className="text-xs text-zinc-500">
                  {visiblePlaceholders.length} placeholder{visiblePlaceholders.length === 1 ? "" : "s"} in the current view.
                </p>
              </div>
              <button type="button" onClick={() => setResolveOpen(false)} className="text-sm text-zinc-400 hover:text-white">
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {resolveErr ? <p className="mb-3 text-sm text-red-400">{resolveErr}</p> : null}
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setResolveMode("scanner");
                    setResolveErr(null);
                  }}
                  className={`rounded-full px-4 py-2 text-sm ${
                    resolveMode === "scanner" ? "bg-teal-600 text-white" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  Barcode scanner
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResolveMode("camera");
                    setResolveErr(null);
                  }}
                  className={`rounded-full px-4 py-2 text-sm ${
                    resolveMode === "camera" ? "bg-teal-600 text-white" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  Phone camera
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResolveMode("manual");
                    setResolveErr(null);
                  }}
                  className={`rounded-full px-4 py-2 text-sm ${
                    resolveMode === "manual" ? "bg-teal-600 text-white" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  Manual entry
                </button>
              </div>

              {resolveMode === "camera" ? (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                    <video ref={videoRef} className="aspect-[3/4] w-full object-cover" playsInline muted />
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-300">
                    {cameraStatus}
                  </div>
                  <label className="block text-xs text-zinc-500">
                    Manual add while camera is open
                    <input
                      value={cameraTypedInput}
                      onChange={(e) => setCameraTypedInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addResolveImeiWithCap(cameraTypedInput);
                          setCameraTypedInput("");
                        }
                      }}
                      inputMode="numeric"
                      className="app-input mt-1"
                      placeholder="Type IMEI and press Enter"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      addResolveImeiWithCap(cameraTypedInput);
                      setCameraTypedInput("");
                    }}
                    className="app-btn-secondary py-2 text-sm"
                  >
                    Add typed IMEI
                  </button>
                </div>
              ) : resolveMode === "manual" ? (
                <div className="space-y-3">
                  <label className="block text-xs text-zinc-500">
                    IMEIs
                    <textarea
                      value={resolveInput}
                      onChange={(e) => setResolveInput(e.target.value)}
                      className="app-input mt-1 min-h-40"
                      placeholder="One IMEI per line"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const parts = resolveInput.split(/[\r\n,;\s]+/);
                      for (const part of parts) addResolveImeiWithCap(part);
                      setResolveInput("");
                    }}
                    className="app-btn-secondary py-2 text-sm"
                  >
                    Add entered IMEIs
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-4 text-xs text-zinc-500">
                    Scan an IMEI barcode using your device scanner (or a keyboard wedge). Press Enter if needed.
                  </div>
                </div>
              )}

              <p className="mt-3 text-xs text-zinc-500">
                Placeholders in this view: {visiblePlaceholders.length}. IMEIs added: {resolveImeiList.length}.
              </p>

              <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto">
                {resolveImeiList.map((imei) => (
                  <li
                    key={imei}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-300"
                  >
                    <span className="font-mono">{imei}</span>
                    <button
                      type="button"
                      onClick={() => setResolveImeiList((prev) => prev.filter((x) => x !== imei))}
                      className="text-xs text-red-400"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-zinc-800 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setResolveErr(null);
                  if (!resolveImeiList.length) {
                    setResolveErr("Enter at least one IMEI.");
                    return;
                  }
                  startResolve(async () => {
                    const fd = new FormData();
                    fd.set("placeholderIds", JSON.stringify(visiblePlaceholderIds));
                    fd.set("imeis", resolveImeiList.join("\n"));
                    const r = await resolveUnspecifiedImeisAction(fd);
                    if (r && "error" in r && r.error) setResolveErr(r.error);
                    else {
                      setResolveOpen(false);
                      setResolveInput("");
                      setResolveImeiList([]);
                      setCameraTypedInput("");
                      router.refresh();
                    }
                  });
                }}
                disabled={resolvePending}
                className="app-btn w-full disabled:opacity-50"
              >
                {resolvePending ? "Saving…" : "Save IMEIs"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setBrand("ALL")}
          className={`rounded-full px-4 py-2 text-sm ${brand === "ALL" ? "bg-teal-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
        >
          All
        </button>
        {brands.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBrand(b)}
            className={`rounded-full px-4 py-2 text-sm ${brand === b ? "bg-teal-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
          >
            {b}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_auto_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="app-input"
          placeholder="Search IMEI, model, rep, shop..."
        />
        <select value={model} onChange={(e) => setModel(e.target.value)} className="app-input">
          {models.map((m) => (
            <option key={m} value={m}>
              {m === "ALL" ? "All models" : m}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="app-input">
          <option value="ALL">All status</option>
          <option value="IN_STOCK">In stock</option>
          <option value="IN_TRANSIT">In transit</option>
          <option value="SOLD">Sold</option>
        </select>
        <button type="button" onClick={exportExcel} className="app-btn-secondary py-3 text-sm">
          Export Excel
        </button>
        <button type="button" onClick={exportPdf} className="app-btn py-3 text-sm">
          Export PDF
        </button>
      </div>

      {visiblePlaceholders.length ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setResolveOpen(true);
              setResolveInput("");
              setResolveImeiList([]);
              setResolveMode("scanner");
              setCameraTypedInput("");
              setCameraStatus("Ready");
              setResolveErr(null);
            }}
            className="app-btn-secondary py-3 text-sm"
          >
            Resolve unspecified IMEIs ({visiblePlaceholders.length})
          </button>
        </div>
      ) : null}

      <div className="scrollbar-hide overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/60">
        <table className="w-full min-w-[1080px] border-collapse text-sm">
          <thead className="bg-zinc-900/95">
            <tr className="border-b border-zinc-800">
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Model</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">IMEI</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Status</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Location</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Rep</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Shop</th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">Sell</th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">Cost</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Added</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-b border-zinc-800/80">
                <td className="px-3 py-3 text-zinc-200">{row.model}</td>
                <td className="px-3 py-3 font-mono text-zinc-300">{row.imei}</td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusPill(row.status)}`}>
                    {row.status === "IN_STOCK" ? "In stock" : row.status === "IN_TRANSIT" ? "In transit" : "Sold"}
                  </span>
                </td>
                <td className="px-3 py-3 text-zinc-400">{row.location}</td>
                <td className="px-3 py-3 text-zinc-400">{row.srName ?? "—"}</td>
                <td className="px-3 py-3 text-zinc-400">{row.shopName ?? "—"}</td>
                <td className="px-3 py-3 text-right text-teal-300">{formatMoney(row.sellPrice)}</td>
                <td className="px-3 py-3 text-right text-zinc-300">{formatMoney(row.costPrice)}</td>
                <td className="px-3 py-3 text-zinc-500">{new Date(row.addedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? <div className="px-4 py-10 text-center text-sm text-zinc-500">No phones found.</div> : null}
      </div>
    </div>
  );
}
