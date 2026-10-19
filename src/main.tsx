import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  ControlButton,
  getViewportForBounds,
  MiniMap,
  Handle,
  Position,
  useReactFlow,
  useUpdateNodeInternals,
  applyNodeChanges,
  MarkerType,
  type Node,
  type NodeProps,
  type Connection,
} from "@xyflow/react";
import {
  Plus,
  Download,
  Upload,
  Undo2,
  Redo2,
  Settings2,
  X,
  GripVertical,
  Check,
  Layers,
  MousePointer2,
  Hand,
  Search,
  Trash2,
  FileJson,
  HelpCircle,
  ChevronDown,
  PanelLeftClose,
  Maximize2,
  Moon,
  Sun,
  LayoutGrid,
  GitBranch,
} from "lucide-react";
import YAML from "yaml";
import {
  type Board,
  type Model,
  type Field,
  type FieldType,
  fieldTypes,
  labels,
  modelKinds,
  glyphs,
  uniqueId,
  example,
  issues,
  parseBoard,
  isList,
  cardinality,
} from "./model";
import { FieldRules, ValueEditor, TokenInput } from "./config-controls";
import { changeFieldType, updateReferenceConstraint } from "./field-config";
import { ecommerce } from "./ecommerce";
import {
  autoLayout,
  openPosition,
  modelSize,
  targets,
  topology,
  type LayoutMode,
} from "./layout";
import { RoutedEdge } from "./routed-edge";
import { KindIcon } from "./kind-icons";
import studioLogoLight from "./assets/brand/studio-header-horizontal-gradient-light.svg";
import studioLogoDark from "./assets/brand/studio-header-horizontal-gradient-dark.svg";
import studioLogoCompactLight from "./assets/brand/studio-header-compact-gradient-light.svg";
import studioLogoCompactDark from "./assets/brand/studio-header-compact-gradient-dark.svg";
import "./assets/brand/tokens/brand.css";
import "@xyflow/react/dist/style.css";
import "./style.css";
import "./brand.css";
type Panel = {
  key: string;
  model: string;
  field?: string;
  x: number;
  y: number;
};
type Actions = {
  patchModel: (id: string, patch: Partial<Model>) => void;
  patchField: (model: string, id: string, patch: Partial<Field>) => void;
  addField: (model: string, type: FieldType) => void;
  open: (model: string, field?: string) => void;
  hoverField: (model?: string, field?: string) => void;
  moveField: (from: string, field: string, to: string, before?: string) => void;
};
const Context = createContext<Actions>(null!);
function ContentNode({
  id,
  data,
  selected,
}: NodeProps<Node<{ model: Model }>>) {
  const a = useContext(Context);
  const m = data.model;
  const update = useUpdateNodeInternals();
  useEffect(() => update(id), [id, m.fields, update]);
  function drop(e: React.DragEvent, before?: string) {
    e.preventDefault();
    e.stopPropagation();
    const payload = e.dataTransfer.getData("application/cmmf");
    if (!payload) return;
    const item = JSON.parse(payload);
    if (item.field) a.moveField(item.model, item.field, id, before);
    else if (item.type) a.addField(id, item.type);
  }
  return (
    <article
      className={`model-node ${selected ? "selected" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => drop(e)}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="model"
        className="model-target"
      />
      <header className="model-drag">
        <div className="model-symbol">
          <KindIcon kind={m.kind} />
        </div>
        <div className="node-heading">
          <input
            aria-label={`Name of ${m.name}`}
            className="nodrag"
            value={m.name}
            onChange={(e) => a.patchModel(id, { name: e.target.value })}
          />
          <span>
            {m.kind} <i>·</i> {m.fields.length} fields
          </span>
        </div>
        <button
          className="icon-button nodrag"
          title={`Edit ${m.name} details`}
          onClick={() => a.open(id)}
        >
          <Settings2 size={17} />
        </button>
      </header>
      <div className="fields">
        {m.fields.map((f) => (
          <div
            key={f.id}
            className={`field-row nodrag type-${f.type}`}
            onPointerEnter={() => {
              if (targets(f).length) a.hoverField(id, f.id);
            }}
            onPointerLeave={() => a.hoverField()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => drop(e, f.id)}
          >
            <span
              className="field-grip"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  "application/cmmf",
                  JSON.stringify({ model: id, field: f.id }),
                );
                e.dataTransfer.effectAllowed = "move";
              }}
              title="Drag to reorder or move field"
            >
              <GripVertical size={13} />
            </span>
            <span className="type-icon">{glyphs[f.type]}</span>
            <div className="field-name">
              <div className="field-name-editor">
                <span className="field-name-measure" aria-hidden="true">
                  {f.name || "Field name"}
                </span>
                <input
                  size={1}
                  aria-label={`${m.name} ${f.id} name`}
                  value={f.name || ""}
                  placeholder="Field name"
                  onChange={(e) =>
                    a.patchField(id, f.id, { name: e.target.value })
                  }
                />
              </div>
              {f.required && (
                <span
                  className="required"
                  title="Required"
                  aria-label="Required"
                >
                  *
                </span>
              )}
            </div>
            <span className="field-type">
              {isList(f) ? "List · " : ""}
              {labels[f.type]}
            </span>
            <button
              className="field-edit"
              title={`Edit ${f.name || f.id}`}
              onClick={() => a.open(id, f.id)}
            >
              <Settings2 size={13} />
            </button>
            {(f.type === "reference" || f.type === "object") && (
              <Handle
                type="source"
                position={Position.Right}
                id={f.id}
                title="Drag to a content type to connect"
              />
            )}
          </div>
        ))}
      </div>
      <button
        className="add-field nodrag"
        onClick={() => a.addField(id, "string")}
      >
        <Plus size={14} /> Add field <span>or drop one here</span>
      </button>
    </article>
  );
}
const nodeTypes = { content: ContentNode };
const edgeTypes = { routed: RoutedEdge };
function FloatingPanel({
  panel,
  children,
  title,
  onClose,
  onMove,
  onFocus,
}: {
  panel: Panel;
  children: React.ReactNode;
  title: string;
  onClose: () => void;
  onMove: (x: number, y: number) => void;
  onFocus: () => void;
}) {
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  return (
    <section
      role="dialog"
      aria-label={title}
      className="floating-panel"
      style={{
        left: panel.x,
        top: panel.y,
        maxHeight: `calc(100dvh - ${panel.y + 16}px)`,
      }}
      onPointerDown={onFocus}
    >
      <header
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            px: panel.x,
            py: panel.y,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current)
            onMove(
              Math.max(
                0,
                Math.min(
                  window.innerWidth - 340,
                  drag.current.px + e.clientX - drag.current.x,
                ),
              ),
              Math.max(
                70,
                Math.min(
                  window.innerHeight - 100,
                  drag.current.py + e.clientY - drag.current.y,
                ),
              ),
            );
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        <GripVertical size={16} />
        <strong>{title}</strong>
        <button
          className="icon-button"
          aria-label="Close details"
          onClick={onClose}
        >
          <X size={17} />
        </button>
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}
function Details({
  m,
  f,
  remove,
}: {
  m: Model;
  f?: Field;
  remove: () => void;
}) {
  const a = useContext(Context);
  const patch = (v: Partial<Field>) => f && a.patchField(m.id, f.id, v);
  const [tab, setTab] = useState("Intent");
  const board = useContext(BoardContext);
  return (
    <>
      <div className="panel-eyebrow">
        {f ? "Field" : "Content type"} <span>{f?.type || m.kind}</span>
      </div>
      <h2>{f?.name || m.name}</h2>
      <div className="panel-tabs">
        {["Intent", "Rules", "Editorial", "Metadata"].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Intent" && (
        <>
          <label>
            Display name
            <input
              value={f ? f.name || "" : m.name}
              onChange={(e) =>
                f
                  ? patch({ name: e.target.value })
                  : a.patchModel(m.id, { name: e.target.value })
              }
            />
          </label>
          <label>
            Stable ID
            <input value={f?.id || m.id} readOnly />
            <small>Kept stable as names change.</small>
          </label>
          {!f && (
            <label>
              Model kind
              <select
                value={m.kind}
                onChange={(e) =>
                  a.patchModel(m.id, { kind: e.target.value as Model["kind"] })
                }
              >
                {modelKinds.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          )}
          {f && (
            <label>
              Field type
              <select
                value={f.type}
                onChange={(e) => {
                  const type = e.target.value as FieldType;
                  const next = changeFieldType(f, type);
                  a.patchField(m.id, f.id, next);
                }}
              >
                {fieldTypes.map((t) => (
                  <option value={t} key={t}>
                    {labels[t]} ({t})
                  </option>
                ))}
              </select>
              <small>
                Changing type clears its default and incompatible rules.
              </small>
            </label>
          )}
          <label>
            Purpose & meaning
            <textarea
              rows={4}
              placeholder="What does this represent? Why do we need it?"
              value={(f?.description ?? (!f ? m.description : "")) || ""}
              onChange={(e) =>
                f
                  ? patch({ description: e.target.value })
                  : a.patchModel(m.id, { description: e.target.value })
              }
            />
          </label>
        </>
      )}
      {tab === "Rules" && (
        <>
          {f ? (
            <>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={!!f.required}
                  onChange={(e) => patch({ required: e.target.checked })}
                />
                Required field
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={isList(f)}
                  onChange={(e) =>
                    patch({
                      list: e.target.checked,
                      relation: f.relation
                        ? { ...f.relation, cardinality: undefined }
                        : undefined,
                    })
                  }
                />
                Allow multiple values
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={!!f.localisation}
                  onChange={(e) => patch({ localisation: e.target.checked })}
                />
                Localised values
              </label>
              {f.type === "enum" && (
                <label>
                  Options (one per line)
                  <textarea
                    rows={4}
                    value={f.values?.join("\n") || ""}
                    onChange={(e) =>
                      patch({ values: e.target.value.split("\n") })
                    }
                  />
                </label>
              )}
              {(f.type === "reference" || f.type === "object") && (
                <Relationship m={m} f={f} patch={patch} />
              )}
              <FieldRules f={f} models={board.models} patch={patch} />
            </>
          ) : (
            <>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={!!m.singleton}
                  onChange={(e) =>
                    a.patchModel(m.id, { singleton: e.target.checked })
                  }
                />
                Singleton model
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={!!m.localisation}
                  onChange={(e) =>
                    a.patchModel(m.id, { localisation: e.target.checked })
                  }
                />
                Localised model
              </label>
              <ValueEditor
                label="Governance"
                objectOnly
                value={m.governance || {}}
                onChange={(v) =>
                  a.patchModel(m.id, {
                    governance: v as Record<string, unknown>,
                  })
                }
              />
              <p className="hint">
                Document ownership, review expectations and lifecycle decisions
                here.
              </p>
            </>
          )}
        </>
      )}
      {tab === "Editorial" && (
        <>
          <label>
            Guidance for authors
            <textarea
              rows={5}
              placeholder="Help authors make the right decisions…"
              value={(f ? f.editorial?.helpText : m.editorial?.helpText) || ""}
              onChange={(e) =>
                f
                  ? patch({
                      editorial: { ...f.editorial, helpText: e.target.value },
                    })
                  : a.patchModel(m.id, {
                      editorial: { ...m.editorial, helpText: e.target.value },
                    })
              }
            />
          </label>
          {
            <label>
              Label field
              <select
                value={(f ? f.editorial : m.editorial)?.labelField || ""}
                onChange={(e) =>
                  f
                    ? patch({
                        editorial: {
                          ...f.editorial,
                          labelField: e.target.value || undefined,
                        },
                      })
                    : a.patchModel(m.id, {
                        editorial: {
                          ...m.editorial,
                          labelField: e.target.value || undefined,
                        },
                      })
                }
              >
                <option value="">Choose a field</option>
                {m.fields.map((f) => (
                  <option value={f.id} key={f.id}>
                    {f.name || f.id}
                  </option>
                ))}
              </select>
            </label>
          }
          <fieldset>
            <legend>Preview fields</legend>
            {(["title", "description", "image"] as const).map((key) => (
              <label key={key}>
                Preview {key}
                <select
                  value={(f ? f.editorial : m.editorial)?.preview?.[key] || ""}
                  onChange={(e) => {
                    const editorial = {
                      ...(f ? f.editorial : m.editorial),
                      preview: {
                        ...(f ? f.editorial : m.editorial)?.preview,
                        [key]: e.target.value || undefined,
                      },
                    };
                    f
                      ? patch({ editorial })
                      : a.patchModel(m.id, { editorial });
                  }}
                >
                  <option value="">Not set</option>
                  {m.fields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name || field.id}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </fieldset>
          <p className="hint">
            The model captures intent. These notes travel with your CMMF export.
          </p>
        </>
      )}
      {tab === "Metadata" && (
        <>
          <p className="hint">
            Translation hints travel with CMMF without changing the core model.
          </p>
          <ValueEditor
            label="Translation hints"
            objectOnly
            value={(f ? f.translationHints : m.translationHints) || {}}
            onChange={(v) =>
              f
                ? patch({ translationHints: v as Record<string, unknown> })
                : a.patchModel(m.id, {
                    translationHints: v as Record<string, unknown>,
                  })
            }
          />
          {!f && (
            <TokenInput
              label="Tags"
              value={m.tags}
              onChange={(tags) => a.patchModel(m.id, { tags })}
            />
          )}
        </>
      )}
      <div className="panel-footer">
        <span>
          <Check size={13} /> Changes apply as you edit
        </span>
        <button className="danger-link" onClick={remove}>
          <Trash2 size={13} /> Delete {f ? "field" : "type"}
        </button>
      </div>
    </>
  );
}
const BoardContext = createContext<Board>(example);
function Relationship({
  m,
  f,
  patch,
}: {
  m: Model;
  f: Field;
  patch: (v: Partial<Field>) => void;
}) {
  const board = useContext(BoardContext);
  return (
    <>
      <label>
        {f.type === "object" ? "Object model" : "Target content types"}
        <select
          value=""
          onChange={(e) => {
            if (e.target.value)
              patch(
                f.type === "object"
                  ? { objectType: e.target.value }
                  : {
                      targets: [
                        ...new Set([...(f.targets || []), e.target.value]),
                      ],
                    },
              );
          }}
        >
          <option value="">Choose a model…</option>
          {board.models.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.id === m.id ? " (self)" : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="target-chips">
        {(f.type === "object" ? [f.objectType] : f.targets || [])
          .filter(Boolean)
          .map((id) => (
            <button
              key={id}
              onClick={() =>
                f.type === "reference" &&
                patch({ targets: f.targets?.filter((t) => t !== id) })
              }
            >
              {board.models.find((t) => t.id === id)?.name || id}
              {f.type === "reference" && <X size={12} />}
            </button>
          ))}
      </div>
      {f.type === "reference" && (
        <>
          <label>
            Ownership
            <select
              value={f.relation?.ownership || ""}
              onChange={(e) =>
                patch({
                  relation: {
                    ...f.relation,
                    ownership: e.target.value
                      ? (e.target.value as "linked" | "contained")
                      : undefined,
                  },
                })
              }
            >
              <option value="">Unspecified</option>
              <option value="linked">Linked · independently managed</option>
              <option value="contained">Contained · owned by this entry</option>
            </select>
          </label>
          {isList(f) && (
            <>
              <div className="two-cols">
                {(["minItems", "maxItems"] as const).map((key) => (
                  <label key={key}>
                    {key === "minItems" ? "Minimum" : "Maximum"}
                    <input
                      type="number"
                      min="0"
                      value={
                        (f.relation?.[key] ?? f.validations?.[key] ?? "") as
                          number | string
                      }
                      onChange={(e) =>
                        patch(
                          updateReferenceConstraint(
                            f,
                            key,
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                          ),
                        )
                      }
                    />
                  </label>
                ))}
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={!!f.relation?.ordered}
                  onChange={(e) =>
                    patch({
                      relation: { ...f.relation, ordered: e.target.checked },
                    })
                  }
                />
                Preserve order
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={
                    !!(f.relation?.uniqueItems ?? f.validations?.uniqueItems)
                  }
                  onChange={(e) =>
                    patch(
                      updateReferenceConstraint(
                        f,
                        "uniqueItems",
                        e.target.checked,
                      ),
                    )
                  }
                />
                Unique references
              </label>
            </>
          )}
        </>
      )}
    </>
  );
}
function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const el = document.createElement("a");
  el.href = url;
  el.download = name;
  el.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Studio() {
  // Mount the full interface before reading or parsing the saved workspace.
  const [board, setBoard] = useState<Board>(() => ({
    version: 1,
    name: "Opening workspace…",
    models: [],
    positions: {},
  }));
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const boardRef = useRef(board);
  boardRef.current = board;
  const past = useRef<Board[]>([]),
    future = useRef<Board[]>([]);
  const [historyTick, setHistoryTick] = useState(0);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [selected, setSelected] = useState<string>();
  const [measurements, setMeasurements] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState(false);
  const [help, setHelp] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [pan, setPan] = useState(false);
  const [library, setLibrary] = useState(true);
  const [hovered, setHovered] = useState<{ model: string; field: string }>();
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(
    board.layout || "connections",
  );
  const [loading, setLoading] = useState("Loading workspace…");
  const loadingLock = useRef(true);
  const [layoutBusy, setLayoutBusy] = useState(false);
  const layoutLock = useRef(false);
  useEffect(() => {
    if (board.layout) setLayoutMode(board.layout);
  }, [board.layout]);
  const [importMenu, setImportMenu] = useState(false);
  const [importMode, setImportMode] = useState<LayoutMode | "saved">(
    "connections",
  );
  const [addMenu, setAddMenu] = useState<{ x: number; y: number }>();
  const addMenuRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#192329" : "#F6F7F3");
    try {
      localStorage.setItem("cmmf-theme", theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    if (!selected || !board.models.some((m) => m.id === selected))
      setSelected(undefined);
    setHovered(undefined);
  }, [board.models]);
  useEffect(() => {
    if (!addMenu) return;
    const dismiss = (e: PointerEvent) => {
      if (!addMenuRef.current?.contains(e.target as globalThis.Node))
        setAddMenu(undefined);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [addMenu]);
  const fileRef = useRef<HTMLInputElement>(null);
  const flow = useReactFlow();
  const commit = useCallback((fn: (b: Board) => Board) => {
    const before = boardRef.current;
    const result = fn(before);
    const next =
      topology(result.models) !== topology(before.models) &&
      result.routes === before.routes
        ? { ...result, routes: undefined }
        : result;
    if (JSON.stringify(next) === JSON.stringify(before)) return;
    past.current.push(structuredClone(before));
    if (past.current.length > 100) past.current.shift();
    future.current = [];
    boardRef.current = next;
    setBoard(next);
    setHistoryTick((t) => t + 1);
  }, []);
  function undo() {
    if (!past.current.length) return;
    future.current.push(structuredClone(boardRef.current));
    const b = past.current.pop()!;
    boardRef.current = b;
    setBoard(b);
    setHistoryTick((t) => t + 1);
  }
  function redo() {
    if (!future.current.length) return;
    past.current.push(structuredClone(boardRef.current));
    const b = future.current.pop()!;
    boardRef.current = b;
    setBoard(b);
    setHistoryTick((t) => t + 1);
  }
  useEffect(() => {
    // Never replace the saved model with the empty startup canvas.
    if (!workspaceReady) return;
    try {
      localStorage.setItem("cmmf-studio", JSON.stringify(board));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [board, workspaceReady]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 5500);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (loadingLock.current) {
        if ((e.metaKey || e.ctrlKey) && e.key === "z") e.preventDefault();
        return;
      }
      if (e.key === "Escape") {
        setPanels([]);
        setAddMenu(undefined);
        setImportMenu(false);
        setHelp(false);
        setMenu(false);
        return;
      }
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if (e.key === "v") setPan(false);
      if (e.key === "h") setPan(true);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const patchModel = (id: string, patch: Partial<Model>) =>
    commit((b) => ({
      ...b,
      models: b.models.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  const patchField = (model: string, id: string, patch: Partial<Field>) =>
    commit((b) => ({
      ...b,
      models: b.models.map((m) =>
        m.id === model
          ? {
              ...m,
              fields: m.fields.map((f) =>
                f.id === id ? { ...f, ...patch } : f,
              ),
            }
          : m,
      ),
    }));
  function addField(model: string, type: FieldType) {
    commit((b) => ({
      ...b,
      models: b.models.map((m) =>
        m.id === model
          ? {
              ...m,
              fields: [
                ...m.fields,
                {
                  id: uniqueId(
                    type,
                    m.fields.map((f) => f.id),
                  ),
                  name: labels[type],
                  type,
                  ...(type === "reference" ? { targets: [], list: false } : {}),
                  ...(type === "object" ? { objectType: "" } : {}),
                  ...(type === "enum" ? { values: ["Option 1"] } : {}),
                },
              ],
            }
          : m,
      ),
    }));
    setSelected(model);
  }
  function moveField(from: string, field: string, to: string, before?: string) {
    commit((b) => {
      const f = b.models
        .find((m) => m.id === from)
        ?.fields.find((f) => f.id === field);
      if (!f || (from === to && before === field)) return b;
      const destination = b.models.find((m) => m.id === to);
      if (!destination) return b;
      const moved = {
        ...f,
        id:
          from === to
            ? f.id
            : uniqueId(
                f.id,
                destination.fields.map((f) => f.id),
              ),
      };
      return {
        ...b,
        models: b.models.map((m) => {
          let fields = m.fields;
          if (m.id === from) fields = fields.filter((f) => f.id !== field);
          if (m.id === to) {
            fields = [...fields];
            const index = before
              ? fields.findIndex((f) => f.id === before)
              : -1;
            fields.splice(index < 0 ? fields.length : index, 0, moved);
          }
          return { ...m, fields };
        }),
      };
    });
  }
  function open(model: string, field?: string) {
    const key = `${model}/${field || ""}`;
    setPanels((p) => {
      const existing = p.find((w) => w.key === key);
      return [
        ...p.filter((w) => w.key !== key),
        existing || {
          key,
          model,
          field,
          x: Math.max(16, window.innerWidth - 410 - (p.length % 3) * 50),
          y: 105 + (p.length % 3) * 35,
        },
      ];
    });
  }
  function showAddMenu(button: HTMLElement) {
    const rect = button.getBoundingClientRect();
    setAddMenu({
      x: Math.max(10, Math.min(window.innerWidth - 310, rect.left)),
      y:
        rect.bottom + 330 < window.innerHeight
          ? rect.bottom + 8
          : Math.max(80, rect.top - 325),
    });
  }
  function focusModel(id: string, zoom = true) {
    setSelected(id || undefined);
    setHovered(undefined);
    if (id && zoom)
      void flow.fitView({
        nodes: [{ id }],
        padding: 0.35,
        maxZoom: 1,
        duration: 250,
      });
  }
  function fitBoard(duration = 250) {
    const current = boardRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !current.models.length) return;
    const points = current.models.flatMap((m) => {
      const p = current.positions[m.id] || { x: 0, y: 0 };
      const measured = flow.getNode(m.id)?.measured;
      const size =
        measured?.width && measured.height
          ? { width: measured.width, height: measured.height }
          : modelSize(m, measurements);
      return [p, { x: p.x + size.width, y: p.y + size.height }];
    });
    for (const route of Object.values(current.routes || {})) {
      points.push(...route.points);
      if (route.label)
        points.push(
          { x: route.label.x - 120, y: route.label.y - 15 },
          { x: route.label.x + 120, y: route.label.y + 15 },
        );
    }
    const x = Math.min(...points.map((p) => p.x)),
      y = Math.min(...points.map((p) => p.y));
    const bounds = {
      x,
      y,
      width: Math.max(...points.map((p) => p.x)) - x,
      height: Math.max(...points.map((p) => p.y)) - y,
    };
    void flow.setViewport(
      getViewportForBounds(bounds, rect.width, rect.height, 0.025, 1, 0.14),
      { duration },
    );
  }
  // Two frames let the browser paint the status before synchronous model work.
  const paint = () =>
    new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  async function settleCanvas(next: Board, cancelled = () => false) {
    await paint();
    // Wait for React Flow to mount and measure the replacement board.
    while (!cancelled() && next.models.length) {
      const rendered = flow.getNodes();
      if (
        rendered.length === next.models.length &&
        next.models.every((model) =>
          rendered.some(
            (node) =>
              node.id === model.id &&
              node.measured?.width &&
              node.measured?.height,
          ),
        )
      )
        break;
      await paint();
    }
    if (cancelled()) return;
    fitBoard(0);
    await paint();
  }
  useEffect(() => {
    let cancelled = false;
    async function restoreWorkspace() {
      // Let the sidebar, controls, empty canvas, and loading status paint first.
      await paint();
      if (cancelled) return;
      let next: Board;
      try {
        const saved = localStorage.getItem("cmmf-studio");
        next = saved ? parseBoard(JSON.parse(saved)) : structuredClone(example);
      } catch {
        next = structuredClone(example);
      }
      boardRef.current = next;
      setBoard(next);
      await settleCanvas(next, () => cancelled);
      if (cancelled) return;
      loadingLock.current = false;
      setLoading("");
      setWorkspaceReady(true);
    }
    void restoreWorkspace();
    // Strict Mode replays mount effects; only the active restore may read/save.
    return () => {
      cancelled = true;
    };
  }, []);
  async function loadBoard(
    label: string,
    prepare: () => Promise<Board> | Board,
    resetPanels = true,
  ) {
    if (loadingLock.current) return;
    loadingLock.current = true;
    const focused = document.activeElement as HTMLElement | null;
    setLoading(label);
    try {
      await paint();
      const next = await prepare();
      commit(() => next);
      if (resetPanels) setPanels([]);
      setSelected(undefined);
      setHovered(undefined);
      setHelp(false);
      setImportMenu(false);
      await settleCanvas(next);
    } finally {
      loadingLock.current = false;
      setLoading("");
      // Restore keyboard focus after removing inert from the workspace.
      requestAnimationFrame(() => {
        if (focused?.isConnected) focused.focus();
        else canvasRef.current?.focus({ preventScroll: true });
      });
    }
  }
  async function loadSample(sample: Board) {
    try {
      await loadBoard(`Loading ${sample.name}…`, () => structuredClone(sample));
    } catch (e) {
      setNotice(`Loading failed: ${(e as Error).message}`);
    }
  }
  async function arrange(mode: LayoutMode) {
    if (layoutLock.current || loadingLock.current) return;
    layoutLock.current = true;
    setLayoutBusy(true);
    setLayoutMode(mode);
    try {
      await loadBoard(
        "Arranging content types…",
        () => autoLayout(boardRef.current, mode, measurements),
        false,
      );
    } catch (e) {
      setNotice(`Layout failed: ${(e as Error).message}`);
    } finally {
      layoutLock.current = false;
      setLayoutBusy(false);
    }
  }
  function addModel(
    position?: { x: number; y: number },
    kind: Model["kind"] = "entry",
  ) {
    const current = boardRef.current;
    const id = uniqueId(
      kind,
      current.models.map((m) => m.id),
    );
    const bounds = canvasRef.current?.getBoundingClientRect();
    const anchor = current.models.find((m) => m.id === selected);
    const anchorPosition = anchor && current.positions[anchor.id];
    const preferred =
      position ||
      (anchor && anchorPosition
        ? {
            x: anchorPosition.x + modelSize(anchor, measurements).width + 110,
            y: anchorPosition.y,
          }
        : flow.screenToFlowPosition({
            x: bounds ? bounds.x + bounds.width / 2 : window.innerWidth / 2,
            y: bounds ? bounds.y + bounds.height / 2 : window.innerHeight / 2,
          }));
    const place = openPosition(current, preferred, undefined, measurements);
    commit((b) => ({
      ...b,
      models: [...b.models, { id, name: "Untitled type", kind, fields: [] }],
      positions: { ...b.positions, [id]: place },
    }));
    setAddMenu(undefined);
    setSelected(id);
    setHovered(undefined);
    setTimeout(
      () =>
        flow.fitView({
          nodes: [{ id }],
          padding: 0.7,
          maxZoom: 1,
          duration: 250,
        }),
      100,
    );
  }
  function remove(model: string, field?: string) {
    commit((b) => {
      if (field)
        return {
          ...b,
          models: b.models.map((m) =>
            m.id === model
              ? { ...m, fields: m.fields.filter((f) => f.id !== field) }
              : m,
          ),
        };
      const positions = { ...b.positions };
      delete positions[model];
      return {
        ...b,
        positions,
        models: b.models
          .filter((m) => m.id !== model)
          .map((m) => ({
            ...m,
            fields: m.fields.map((f) => ({
              ...f,
              ...(f.targets
                ? { targets: f.targets.filter((t) => t !== model) }
                : {}),
              ...(f.objectType === model ? { objectType: "" } : {}),
            })),
          })),
      };
    });
    setPanels((p) =>
      p.filter((w) => !(w.model === model && (!field || w.field === field))),
    );
  }
  const errors = issues(board.models);
  const hoverSource = board.models.find((m) => m.id === hovered?.model);
  const hoverTargets = hoverSource?.fields.find((f) => f.id === hovered?.field);
  const hoverIds = new Set(
    hovered
      ? [hovered.model, ...(hoverTargets ? targets(hoverTargets) : [])]
      : [],
  );
  const neighbours = new Set<string>();
  if (selected)
    for (const m of board.models)
      for (const f of m.fields)
        for (const target of targets(f)) {
          if (m.id === selected) neighbours.add(target);
          if (target === selected) neighbours.add(m.id);
        }
  const nodes: Node<{ model: Model }>[] = board.models.map((m) => ({
    id: m.id,
    type: "content",
    data: { model: m },
    position: board.positions[m.id] || { x: 0, y: 0 },
    selected: selected === m.id,
    dragHandle: ".model-drag",
    measured: measurements[m.id],
    className: hovered
      ? hoverIds.has(m.id)
        ? "node-highlight"
        : "node-muted"
      : selected
        ? m.id === selected
          ? "node-focused"
          : neighbours.has(m.id)
            ? "node-neighbour"
            : "node-muted"
        : "",
    style: {
      opacity: hovered
        ? hoverIds.has(m.id)
          ? 1
          : 0.22
        : selected
          ? m.id === selected
            ? 1
            : neighbours.has(m.id)
              ? 0.75
              : 0.22
          : 1,
    },
  }));
  const edges = board.models.flatMap((m) =>
    m.fields.flatMap((f) =>
      (f.type === "reference"
        ? f.targets || []
        : f.type === "object" && f.objectType
          ? [f.objectType]
          : []
      )
        .filter((t) => board.models.some((m) => m.id === t))
        .map((t) => {
          const emphasis = hovered
            ? hovered.model === m.id && hovered.field === f.id
            : m.id === selected;
          const incoming = !hovered && t === selected;
          const muted = !!(hovered || selected) && !emphasis && !incoming;
          const route = board.routes?.[`${m.id}/${f.id}/${t}`];
          const color = emphasis
            ? "var(--edge-highlight)"
            : incoming
              ? "var(--edge-incoming)"
              : "var(--edge-color)";
          return {
            id: `${m.id}/${f.id}/${t}`,
            source: m.id,
            sourceHandle: f.id,
            target: t,
            targetHandle: "model",
            type: route ? "routed" : "smoothstep",
            className: muted ? "edge-muted" : emphasis ? "edge-highlight" : "",
            zIndex: emphasis ? 10 : incoming ? 5 : 0,
            data: route
              ? { route, muted, emphasis, open: () => open(m.id, f.id) }
              : undefined,
            label: `${f.name || f.id} · ${cardinality(f)}`,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color,
              width: 16,
              height: 16,
            },
            style: {
              stroke: color,
              strokeWidth: emphasis ? 3 : incoming ? 2.2 : 1.7,
              opacity: muted ? 0.12 : 1,
            },
            labelStyle: {
              fill: emphasis ? "var(--edge-highlight)" : "var(--edge-label)",
              fontSize: 11,
              fontWeight: emphasis ? 650 : 500,
              opacity: muted ? 0.12 : 1,
            },
            labelBgStyle: {
              fill: "var(--canvas-bg)",
              opacity: muted ? 0.12 : 1,
            },
            labelBgPadding: [7, 5] as [number, number],
            labelBgBorderRadius: 5,
          };
        }),
    ),
  );
  function connect(c: Connection) {
    const field = board.models
      .find((m) => m.id === c.source)
      ?.fields.find((f) => f.id === c.sourceHandle);
    if (!field || !c.target) return;
    if (field.type === "object")
      patchField(c.source!, field.id, { objectType: c.target });
    else
      patchField(c.source!, field.id, {
        targets: [...new Set([...(field.targets || []), c.target])],
      });
  }
  async function exportCmmf() {
    if (errors.length) {
      setShowIssues(true);
      setMenu(false);
      setNotice("Resolve model issues before exporting CMMF.");
      return;
    }
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    board.models.forEach((m) =>
      zip.file(`models/${m.id}.yaml`, YAML.stringify(m)),
    );
    zip.file(
      "README.txt",
      "CMMF 1.2.0 models exported from Model Studio. Each file is an individual model. Layout is saved separately using Save workspace.\n",
    );
    download("cmmf-models.zip", await zip.generateAsync({ type: "blob" }));
    setMenu(false);
    setNotice("CMMF models exported.");
  }
  async function importFile(file: File) {
    try {
      await loadBoard(`Importing ${file.name}…`, async () => {
        const content = await file.text();
        const input = file.name.endsWith(".json")
          ? JSON.parse(content)
          : YAML.parse(content);
        let next = parseBoard(input);
        const hasSavedPositions = next.models.every(
          (m) =>
            input.positions?.[m.id] &&
            Number.isFinite(input.positions[m.id].x) &&
            Number.isFinite(input.positions[m.id].y),
        );
        if (importMode !== "saved" || !hasSavedPositions) {
          next = await autoLayout(
            next,
            importMode === "saved" ? layoutMode : importMode,
          );
          setLayoutMode(next.layout!);
        }
        return next;
      });
      setNotice("Workspace imported. Undo restores your previous board.");
    } catch (e) {
      setNotice(`Import failed: ${(e as Error).message}`);
    }
  }
  const actions = {
    hoverField: (model?: string, field?: string) =>
      setHovered(model && field ? { model, field } : undefined),
    patchModel,
    patchField,
    addField,
    open,
    moveField,
  };
  void historyTick;
  return (
    <BoardContext.Provider value={board}>
      <Context.Provider value={actions}>
        <div className="studio" inert={!!loading} aria-busy={!!loading}>
          <header className="topbar">
            <a className="brand" href="#" aria-label="CMMF Studio home">
              <picture>
                <source
                  media="(max-width: 750px)"
                  srcSet={
                    theme === "dark"
                      ? studioLogoCompactDark
                      : studioLogoCompactLight
                  }
                />
                <img
                  className="studio-logo"
                  src={theme === "dark" ? studioLogoDark : studioLogoLight}
                  alt="CMMF Studio"
                />
              </picture>
            </a>
            <div className="project">
              <span className="divider" />
              <input
                aria-label="Workspace name"
                value={board.name}
                onChange={(e) =>
                  commit((b) => ({ ...b, name: e.target.value }))
                }
              />
              <span className={`saved ${saveError ? "error" : ""}`}>
                <span />{" "}
                {!workspaceReady
                  ? "Loading workspace…"
                  : saveError
                    ? "Storage full · export a backup"
                    : "Saved on this device"}
              </span>
            </div>
            <div className="top-actions">
              <button
                className="icon-button theme-toggle"
                aria-label={
                  theme === "light"
                    ? "Switch to dark mode"
                    : "Switch to light mode"
                }
                title={
                  theme === "light"
                    ? "Switch to dark mode"
                    : "Switch to light mode"
                }
                onClick={() =>
                  setTheme((t) => (t === "light" ? "dark" : "light"))
                }
              >
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <button
                className="icon-button"
                title="Undo (⌘Z)"
                disabled={!past.current.length}
                onClick={undo}
              >
                <Undo2 size={18} />
              </button>
              <button
                className="icon-button"
                title="Redo (⌘⇧Z)"
                disabled={!future.current.length}
                onClick={redo}
              >
                <Redo2 size={18} />
              </button>
              <span className="divider" />
              <div className="export-wrap import-wrap">
                <button
                  className="plain-button"
                  onClick={() => setImportMenu(!importMenu)}
                >
                  <Upload size={15} /> Import
                </button>
                {importMenu && (
                  <div className="dropdown import-options">
                    <label>
                      Import layout
                      <select
                        aria-label="Import layout"
                        value={importMode}
                        onChange={(e) =>
                          setImportMode(e.target.value as LayoutMode | "saved")
                        }
                      >
                        <option value="connections">Connections</option>
                        <option value="grid">Grid</option>
                        <option value="saved">Keep saved positions</option>
                      </select>
                    </label>
                    <p>
                      Models without saved positions are arranged by their
                      relationships.
                    </p>
                    <button
                      onClick={() => {
                        setImportMenu(false);
                        fileRef.current?.click();
                      }}
                    >
                      <Upload size={15} />
                      Choose file
                    </button>
                  </div>
                )}
              </div>
              <div className="export-wrap">
                <button className="dark-button" onClick={() => setMenu(!menu)}>
                  <Download size={15} /> Export <ChevronDown size={13} />
                </button>
                {menu && (
                  <div className="dropdown">
                    <button onClick={exportCmmf}>
                      <Download size={16} />
                      <div>
                        CMMF models <small>YAML files · ZIP archive</small>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        download(
                          "workspace.cmmf.json",
                          new Blob([JSON.stringify(board, null, 2)], {
                            type: "application/json",
                          }),
                        );
                        setMenu(false);
                      }}
                    >
                      <FileJson size={16} />
                      <div>
                        Save workspace{" "}
                        <small>Includes canvas layout · JSON</small>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".json,.yaml,.yml"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importFile(file);
                e.target.value = "";
              }}
            />
          </header>
          <main>
            <aside className={`sidebar ${!library ? "collapsed" : ""}`}>
              <div className="sidebar-title">
                <span>Build your model</span>
                <button
                  className="icon-button"
                  title="Toggle library"
                  onClick={() => setLibrary(!library)}
                >
                  <PanelLeftClose size={16} />
                </button>
              </div>
              {library && (
                <>
                  <button
                    className="new-type"
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData(
                        "application/cmmf",
                        JSON.stringify({ container: true, kind: "entry" }),
                      )
                    }
                    onClick={(e) => showAddMenu(e.currentTarget)}
                  >
                    <span>
                      <Layers size={18} />
                    </span>
                    <div>
                      Content type<small>Drag onto the canvas</small>
                    </div>
                    <Plus size={16} />
                  </button>
                  <label className="model-finder">
                    Focus a content type
                    <select
                      aria-label="Focus a content type"
                      value={
                        selected && board.models.some((m) => m.id === selected)
                          ? selected
                          : ""
                      }
                      onChange={(e) => focusModel(e.target.value)}
                    >
                      <option value="">All {board.models.length} types</option>
                      {board.models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <section className="layout-controls">
                    <span>Auto-layout</span>
                    <div>
                      <button
                        aria-label="Auto-layout as grid"
                        aria-pressed={board.layout === "grid"}
                        disabled={layoutBusy}
                        onClick={() => arrange("grid")}
                      >
                        <LayoutGrid size={14} />
                        Grid
                      </button>
                      <button
                        aria-label="Auto-layout for connections"
                        aria-pressed={board.layout === "connections"}
                        disabled={layoutBusy}
                        onClick={() => arrange("connections")}
                      >
                        <GitBranch size={14} />
                        Connections
                      </button>
                    </div>
                    {layoutBusy && (
                      <small role="status">Arranging related types…</small>
                    )}
                  </section>
                  <div className="section-label">
                    Fields <span>Drag into a content type</span>
                  </div>
                  <div className="search">
                    <Search size={14} />
                    <input
                      aria-label="Search field types"
                      placeholder="Find a field type…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="palette">
                    {fieldTypes
                      .filter((t) =>
                        `${labels[t]} ${t}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      )
                      .map((t) => (
                        <button
                          key={t}
                          className={`palette-field type-${t}`}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData(
                              "application/cmmf",
                              JSON.stringify({ type: t }),
                            );
                            e.dataTransfer.effectAllowed = "copy";
                          }}
                          onClick={() =>
                            selected
                              ? addField(selected, t)
                              : setNotice(
                                  "Select a content type first, or drag this field into one.",
                                )
                          }
                        >
                          <span className="type-icon">{glyphs[t]}</span>
                          <span>{labels[t]}</span>
                          <GripVertical size={13} />
                        </button>
                      ))}
                  </div>
                  <button
                    className="help-button"
                    onClick={() => setHelp(!help)}
                  >
                    <HelpCircle size={16} /> Canvas guide <span>?</span>
                  </button>
                </>
              )}
            </aside>
            <div
              className="canvas"
              tabIndex={-1}
              ref={canvasRef}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const raw = e.dataTransfer.getData("application/cmmf");
                if (!raw) return;
                const item = JSON.parse(raw);
                if (item.container)
                  addModel(
                    flow.screenToFlowPosition({ x: e.clientX, y: e.clientY }),
                    item.kind,
                  );
                else if (item.type)
                  setNotice("Drop fields inside a content type.");
              }}
            >
              <div className="canvas-heading">
                <span className="board-count">
                  {board.models.length} content types <span>·</span>{" "}
                  {board.models.reduce((n, m) => n + m.fields.length, 0)} fields
                </span>
              </div>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                colorMode={theme}
                onNodesChange={(changes) => {
                  const updated = applyNodeChanges(changes, nodes);
                  const dimensions = changes.filter(
                    (c) => c.type === "dimensions",
                  );
                  if (dimensions.length)
                    setMeasurements((old) => {
                      const next = { ...old };
                      let changed = false;
                      for (const c of dimensions)
                        if (
                          c.type === "dimensions" &&
                          c.dimensions &&
                          (old[c.id]?.width !== c.dimensions.width ||
                            old[c.id]?.height !== c.dimensions.height)
                        ) {
                          next[c.id] = c.dimensions;
                          changed = true;
                        }
                      return changed ? next : old;
                    });
                  const selecting = changes.find(
                    (c) => c.type === "select" && c.selected,
                  );
                  if (selecting && selecting.type === "select")
                    setSelected(selecting.id);
                  if (changes.some((c) => c.type === "position"))
                    setBoard((b) => ({
                      ...b,
                      routes: undefined,
                      positions: Object.fromEntries(
                        updated.map((n) => [n.id, n.position]),
                      ),
                    }));
                }}
                onNodeDragStart={() => {
                  past.current.push(structuredClone(boardRef.current));
                  future.current = [];
                  setHistoryTick((t) => t + 1);
                }}
                onNodeDoubleClick={(_, n) => {
                  flow.fitView({
                    nodes: [{ id: n.id }],
                    padding: 0.35,
                    maxZoom: 1,
                    duration: 250,
                  });
                  focusModel(n.id, false);
                  open(n.id);
                }}
                onNodeClick={(_, n) => focusModel(n.id, false)}
                onPaneClick={() => {
                  setSelected(undefined);
                  setHovered(undefined);
                  setAddMenu(undefined);
                }}
                onConnect={connect}
                onEdgeClick={(_, e) => {
                  const [model, field] = e.id.split("/");
                  open(model, field);
                }}
                onEdgesDelete={(deleted) =>
                  deleted.forEach((e) => {
                    const [m, f, t] = e.id.split("/");
                    const field = board.models
                      .find((model) => model.id === m)
                      ?.fields.find((field) => field.id === f);
                    if (field)
                      patchField(
                        m,
                        f,
                        field.type === "object"
                          ? { objectType: "" }
                          : {
                              targets: field.targets?.filter(
                                (target) => target !== t,
                              ),
                            },
                      );
                  })
                }
                onNodesDelete={(deleted) =>
                  deleted.forEach((n) => remove(n.id))
                }
                fitView
                fitViewOptions={{ padding: 0.22, maxZoom: 1 }}
                minZoom={0.025}
                maxZoom={1.6}
                nodesDraggable={!pan}
                panOnDrag={pan ? true : [1, 2]}
                selectionOnDrag={!pan}
                deleteKeyCode={["Backspace", "Delete"]}
              >
                <Background
                  gap={22}
                  size={1}
                  color="var(--canvas-dots)"
                  bgColor="var(--canvas-bg)"
                />
                <Controls showInteractive={false} showFitView={false}>
                  <ControlButton
                    title="Fit whole model"
                    onClick={() => {
                      setSelected(undefined);
                      setHovered(undefined);
                      fitBoard();
                    }}
                  >
                    <Maximize2 size={13} />
                  </ControlButton>
                </Controls>
                <MiniMap
                  pannable
                  zoomable
                  nodeColor={(node) =>
                    hovered
                      ? hoverIds.has(node.id)
                        ? "var(--edge-highlight)"
                        : "var(--mini-node-muted)"
                      : selected
                        ? node.id === selected
                          ? "var(--edge-highlight)"
                          : neighbours.has(node.id)
                            ? "var(--mini-node)"
                            : "var(--mini-node-muted)"
                        : "var(--mini-node)"
                  }
                  maskColor="var(--mini-mask)"
                />
              </ReactFlow>
              <div className="canvas-tools">
                <button
                  title="Select (V)"
                  className={!pan ? "active" : ""}
                  onClick={() => setPan(false)}
                >
                  <MousePointer2 size={19} />
                </button>
                <button
                  title="Pan (H)"
                  className={pan ? "active" : ""}
                  onClick={() => setPan(true)}
                >
                  <Hand size={19} />
                </button>
                <span />
                <button
                  title="Add content type"
                  onClick={(e) => showAddMenu(e.currentTarget)}
                >
                  <Plus size={20} />
                </button>
              </div>
              <button
                className={`validation-badge ${errors.length ? "has-issues" : ""}`}
                onClick={() => setShowIssues(!showIssues)}
              >
                {workspaceReady &&
                  (errors.length ? (
                    <span className="issue-dot" />
                  ) : (
                    <Check size={14} />
                  ))}{" "}
                {!workspaceReady
                  ? "Loading model…"
                  : errors.length
                    ? `${errors.length} model issues`
                    : "Model checks passed"}{" "}
                <ChevronDown size={13} />
              </button>
              <div className="canvas-caption">
                Drag to arrange <span>·</span> Connect purple handles{" "}
                <span>·</span> Open details to go deeper
              </div>
            </div>
          </main>
          {addMenu && (
            <section
              ref={addMenuRef}
              role="dialog"
              aria-label="Add content type"
              className="add-type-popout"
              style={{ left: addMenu.x, top: addMenu.y }}
            >
              <header>
                <strong>Add a content type</strong>
                <button
                  className="icon-button"
                  aria-label="Close add menu"
                  onClick={() => setAddMenu(undefined)}
                >
                  <X size={16} />
                </button>
              </header>
              {modelKinds.map((kind) => (
                <button
                  key={kind}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData(
                      "application/cmmf",
                      JSON.stringify({ container: true, kind }),
                    )
                  }
                  onClick={() => addModel(undefined, kind)}
                >
                  <KindIcon kind={kind} />
                  <span>
                    {kind.charAt(0).toUpperCase() + kind.slice(1)}
                    <small>
                      {
                        {
                          entry: "Standalone content",
                          component: "Reusable composable block",
                          object: "Embedded structure",
                          taxonomy: "Classification model",
                          settings: "Global configuration",
                        }[kind]
                      }
                    </small>
                  </span>
                  <Plus size={14} />
                </button>
              ))}
            </section>
          )}
          {panels.map((p) => {
            const m = board.models.find((m) => m.id === p.model),
              f = m?.fields.find((f) => f.id === p.field);
            if (!m || (p.field && !f)) return null;
            return (
              <FloatingPanel
                key={p.key}
                panel={p}
                title={p.field ? "Field details" : "Content type details"}
                onClose={() =>
                  setPanels((all) => all.filter((w) => w.key !== p.key))
                }
                onMove={(x, y) =>
                  setPanels((all) =>
                    all.map((w) => (w.key === p.key ? { ...w, x, y } : w)),
                  )
                }
                onFocus={() =>
                  setPanels((all) =>
                    all[all.length - 1]?.key === p.key
                      ? all
                      : [
                          ...all.filter((w) => w.key !== p.key),
                          all.find((w) => w.key === p.key)!,
                        ],
                  )
                }
              >
                <Details m={m} f={f} remove={() => remove(m.id, f?.id)} />
              </FloatingPanel>
            );
          })}
          {showIssues && (
            <section className="issues-panel">
              <header>
                <strong>Model checks</strong>
                <button
                  className="icon-button"
                  onClick={() => setShowIssues(false)}
                >
                  <X size={16} />
                </button>
              </header>
              {errors.length ? (
                <ul>
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : (
                <p>
                  All models pass the CMMF 1.2.0 schema and target checks. Ready
                  to export.
                </p>
              )}
            </section>
          )}
          {help && (
            <section className="guide">
              <header>
                <strong>A canvas for your thinking</strong>
                <button className="icon-button" onClick={() => setHelp(false)}>
                  <X size={17} />
                </button>
              </header>
              <p>
                <b>1. Sketch.</b> Drag a content type onto the board. Drop
                coloured fields inside it and name them.
              </p>
              <p>
                <b>2. Connect.</b> Drag a reference’s purple dot to another
                type’s left dot. Click a line to edit cardinality and ownership.
              </p>
              <p>
                <b>3. Add meaning.</b> Open the sliders on a type or field. Keep
                several panels open and move them by their title bars.
              </p>
              <p>
                Drag field grips to reorder or move fields. Select an item and
                press Delete to remove it. Undo with ⌘/Ctrl Z. Use H to pan, V
                to select. Trackpad pinch or scroll zooms.
              </p>
              <p>
                Saved in this browser. Export a workspace to back up your
                layout; export CMMF for individual YAML models.
              </p>
              <button
                className="plain-button"
                onClick={() => void loadSample(ecommerce)}
              >
                Load large ecommerce model (can undo)
              </button>
              <button
                className="plain-button"
                onClick={() => void loadSample(example)}
              >
                Load example board (can undo)
              </button>
              <button
                className="plain-button"
                onClick={() => {
                  commit(() => ({
                    version: 1,
                    name: "Untitled model",
                    models: [],
                    positions: {},
                  }));
                  setPanels([]);
                  setHelp(false);
                }}
              >
                Start an empty board (can undo)
              </button>
            </section>
          )}
          {notice && (
            <div className="toast" role="status">
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={14} />
              </button>
            </div>
          )}
          {loading &&
            createPortal(
              <div className="loading-overlay">
                <div
                  className="loading-card"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span className="loading-spinner" aria-hidden="true" />
                  <strong>{loading}</strong>
                  <span>Preparing your canvas</span>
                </div>
              </div>,
              document.body,
            )}
        </div>
      </Context.Provider>
    </BoardContext.Provider>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ReactFlowProvider>
      <Studio />
    </ReactFlowProvider>
  </React.StrictMode>,
);
