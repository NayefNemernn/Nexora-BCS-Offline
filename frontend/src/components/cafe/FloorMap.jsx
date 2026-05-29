import { useRef, useState, useEffect } from "react";

const STATUS = {
  available: { bg: "#16a34a", shadow: "rgba(22,163,74,0.35)",  label: "Free"     },
  occupied:  { bg: "#b45309", shadow: "rgba(180,83,9,0.35)",   label: "Occupied" },
  reserved:  { bg: "#1d4ed8", shadow: "rgba(29,78,216,0.35)",  label: "Reserved" },
  cleaning:  { bg: "#a16207", shadow: "rgba(161,98,7,0.35)",   label: "Cleaning" },
};

function TableShape({ table, onClick, onDragStart, editMode }) {
  const s      = STATUS[table.status] || STATUS.available;
  const isRound = table.shape === "round";
  const isRect  = table.shape === "rectangle";
  const w = isRect ? 104 : 76;
  const h = 76;
  const r = isRound ? "50%" : "14px";
  const chairs = Math.min(table.seats, 8);

  return (
    <div
      onMouseDown={editMode ? onDragStart : undefined}
      onClick={!editMode ? onClick : undefined}
      style={{
        position:    "absolute",
        left:        table.x,
        top:         table.y,
        width:       w,
        height:      h,
        cursor:      editMode ? "grab" : "pointer",
        userSelect:  "none",
        touchAction: "none",
        zIndex:      1,
      }}
    >
      {/* Chair dots */}
      {isRound && Array.from({ length: chairs }).map((_, i) => {
        const angle = (i / chairs) * 2 * Math.PI - Math.PI / 2;
        const cx = w / 2 + (w / 2 + 9) * Math.cos(angle) - 5;
        const cy = h / 2 + (h / 2 + 9) * Math.sin(angle) - 5;
        return (
          <div key={i} style={{ position: "absolute", left: cx, top: cy, width: 10, height: 10, borderRadius: "50%", background: s.bg, opacity: 0.4 }}/>
        );
      })}

      {/* Table top */}
      <div
        style={{
          position:     "absolute",
          inset:        0,
          borderRadius: r,
          background:   `linear-gradient(145deg, ${s.bg}ee, ${s.bg}cc)`,
          boxShadow:    `0 4px 16px ${s.shadow}, 0 1px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)`,
          display:      "flex",
          flexDirection:"column",
          alignItems:   "center",
          justifyContent:"center",
          transition:   "transform 0.15s, box-shadow 0.15s",
        }}
        className="hover:scale-105 active:scale-95"
      >
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, lineHeight: 1 }}>{table.number}</span>
        <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 10, marginTop: 2 }}>{table.seats}p</span>
        {table.status !== "available" && (
          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 9, marginTop: 1 }}>{s.label}</span>
        )}
      </div>
    </div>
  );
}

export default function FloorMap({ tables, editMode = false, onTableClick, onTableMove, mapWidth = 900, mapHeight = 580 }) {
  const containerRef = useRef(null);
  const [positions, setPositions] = useState({});
  const dragging = useRef(null);

  useEffect(() => {
    const pos = {};
    tables.forEach(t => { pos[t._id] = { x: t.x, y: t.y }; });
    setPositions(pos);
  }, [tables]);

  const handleDragStart = (table) => (e) => {
    if (!editMode) return;
    const rect = containerRef.current.getBoundingClientRect();
    dragging.current = {
      id:      table._id,
      offsetX: e.clientX - rect.left - (positions[table._id]?.x ?? table.x),
      offsetY: e.clientY - rect.top  - (positions[table._id]?.y ?? table.y),
    };
    e.preventDefault();
  };

  useEffect(() => {
    if (!editMode) return;
    const onMove = (e) => {
      if (!dragging.current) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.max(0, Math.min(mapWidth  - 110, e.clientX - rect.left  - dragging.current.offsetX));
      const y = Math.max(0, Math.min(mapHeight - 90,  e.clientY - rect.top   - dragging.current.offsetY));
      setPositions(prev => ({ ...prev, [dragging.current.id]: { x, y } }));
    };
    const onUp = () => {
      if (!dragging.current) return;
      const id  = dragging.current.id;
      const pos = positions[id];
      if (pos && onTableMove) onTableMove(id, pos.x, pos.y);
      dragging.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [editMode, positions, onTableMove, mapWidth, mapHeight]);

  return (
    <div
      ref={containerRef}
      style={{
        position:   "relative",
        width:      mapWidth,
        height:     mapHeight,
        maxWidth:   "100%",
        background: "linear-gradient(135deg, #fdf8f0 0%, #f5ece0 100%)",
        borderRadius: 20,
        border:     "1.5px solid #e8d5b5",
        overflow:   "hidden",
        boxShadow:  "inset 0 2px 12px rgba(120,80,30,0.06)",
      }}
    >
      {/* Subtle wood-grain grid */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.12 }}>
        <defs>
          <pattern id="cafegrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#7c4a1e" strokeWidth="0.8"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cafegrid)"/>
      </svg>

      {/* Corner coffee stain decorations */}
      <div style={{ position: "absolute", bottom: 20, right: 20, width: 60, height: 60, borderRadius: "50%", border: "2px solid rgba(120,70,20,0.08)", opacity: 0.6 }}/>
      <div style={{ position: "absolute", bottom: 28, right: 28, width: 36, height: 36, borderRadius: "50%", border: "1.5px solid rgba(120,70,20,0.1)", opacity: 0.5 }}/>

      {tables.map(table => {
        const pos = positions[table._id] ?? { x: table.x, y: table.y };
        return (
          <TableShape
            key={table._id}
            table={{ ...table, x: pos.x, y: pos.y }}
            editMode={editMode}
            onClick={() => onTableClick?.(table)}
            onDragStart={handleDragStart(table)}
          />
        );
      })}

      {tables.length === 0 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 40 }}>☕</span>
          <p style={{ color: "#a16207", fontWeight: 600, fontSize: 14 }}>No tables yet</p>
          <p style={{ color: "#b45309", fontSize: 12, opacity: 0.7 }}>Add tables in Layout Settings</p>
        </div>
      )}
    </div>
  );
}
