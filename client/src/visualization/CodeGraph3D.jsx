import { Canvas } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const statusColor = {
  healthy: "#16a34a",
  warning: "#d97706",
  error: "#dc2626",
  unverified: "#6b7280",
};
function arrange(nodes) {
  const groups = [
    ...new Set(
      nodes.map((node) =>
        node.type === "api"
          ? "API endpoints"
          : node.path.split("/")[0] || "root",
      ),
    ),
  ];
  return nodes.map((node, index) => {
    const groupIndex = groups.indexOf(
      node.type === "api" ? "API endpoints" : node.path.split("/")[0] || "root",
    );
    const withinGroup = nodes
      .filter(
        (candidate) =>
          (candidate.type === "api"
            ? "API endpoints"
            : candidate.path.split("/")[0] || "root") === groups[groupIndex],
      )
      .indexOf(node);
    const ring = 3 + (withinGroup % 3) * 1.25;
    const angle = withinGroup * 1.77 + groupIndex * 0.7;
    return {
      ...node,
      position: [
        Math.cos(angle) * ring + (groupIndex - (groups.length - 1) / 2) * 2.4,
        Math.sin(angle) * ring,
        ((withinGroup % 4) - 1.5) * 0.8,
      ],
    };
  });
}
function Node({ node, selected, connected, impacted, dimmed, onSelect }) {
  const color = selected
    ? "#2563eb"
    : impacted
      ? "#ea580c"
      : statusColor[node.status] || statusColor.unverified;
  return (
    <group position={node.position}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelect(node);
        }}
      >
        <sphereGeometry args={[node.type === "api" ? 0.31 : 0.23, 18, 18]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected || connected || impacted ? 0.32 : 0.08}
          transparent={dimmed}
          opacity={dimmed ? 0.14 : 1}
          roughness={0.35}
        />
      </mesh>
      {(selected || connected) && !dimmed && (
        <Html distanceFactor={10} center>
          <div className={`graph-label ${node.type === "api" ? "api" : ""}`}>
            <strong>
              {node.type === "api"
                ? `${node.method} ${node.path}`
                : node.path || node.label}
            </strong>
            {node.type === "api" && node.summary && (
              <span>{node.summary}</span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
function Scene({
  nodes,
  links,
  selected,
  focusSignal,
  impactMode,
  impactedIds,
  impactedLinks,
  onSelect,
  resetSignal,
}) {
  const controls = useRef();
  const selectedRef = useRef(selected);
  const previousFocusSignal = useRef(focusSignal);
  selectedRef.current = selected;
  const points = useMemo(() => arrange(nodes), [nodes]);
  const lookup = useMemo(
    () => new Map(points.map((node) => [node.id, node])),
    [points],
  );
  const overview = useMemo(() => {
    if (!points.length) return { center: new THREE.Vector3(), distance: 13 };
    const bounds = new THREE.Box3().setFromPoints(
      points.map((node) => new THREE.Vector3(...node.position)),
    );
    const center = bounds.getCenter(new THREE.Vector3());
    const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius;
    return {
      center,
      distance: Math.max(13, radius / Math.sin((48 * Math.PI) / 360) + 2),
    };
  }, [points]);
  const hasCentered = useRef(false);
  const previousResetSignal = useRef(resetSignal);
  useEffect(() => {
    if (!controls.current || hasCentered.current) return;
    controls.current.target.copy(overview.center);
    controls.current.object.position.set(
      overview.center.x,
      overview.center.y,
      overview.center.z + overview.distance,
    );
    controls.current.update();
    hasCentered.current = true;
  }, [overview]);
  useEffect(() => {
    if (previousResetSignal.current === resetSignal) return;
    previousResetSignal.current = resetSignal;
    if (!controls.current) return;
    controls.current.target.copy(overview.center);
    controls.current.object.position.set(
      overview.center.x,
      overview.center.y,
      overview.center.z + overview.distance,
    );
    controls.current.update();
  }, [resetSignal, overview]);
  useEffect(() => {
    if (previousFocusSignal.current === focusSignal) return;
    previousFocusSignal.current = focusSignal;
    const currentSelection = selectedRef.current;
    const node = currentSelection && lookup.get(currentSelection.id);
    if (node && controls.current) {
      const target = new THREE.Vector3(...node.position);
      const offset = target.clone().sub(controls.current.target);
      controls.current.target.copy(target);
      controls.current.object.position.add(offset);
      controls.current.update();
    }
  }, [focusSignal, lookup]);
  const connected = new Set(
    selected
      ? links.flatMap((link) =>
          link.source === selected.id
            ? [link.target]
            : link.target === selected.id
              ? [link.source]
              : [],
        )
      : [],
  );
  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[5, 7, 8]} intensity={1.2} />
      <gridHelper
        args={[22, 22, "#dbeafe", "#edf2f7"]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[
          overview.center.x,
          overview.center.y,
          overview.center.z - 2,
        ]}
      />
      {links.map((link) => {
        const source = lookup.get(link.source);
        const target = lookup.get(link.target);
        if (!source || !target) return null;
        const highlighted =
          selected &&
          (link.source === selected.id || link.target === selected.id);
        const impactLink = impactedLinks.has(link);
        const apiLink = link.kind === "api-reference";
        const dimmed = impactMode && selected && !highlighted && !impactLink;
        return (
          <Line
            key={`${link.source}-${link.target}`}
            points={[source.position, target.position]}
            color={
              highlighted
                ? "#2563eb"
                : impactLink
                  ? "#ea580c"
                  : apiLink
                    ? "#7c3aed"
                    : "#b8c5d6"
            }
            lineWidth={
              highlighted || impactLink
                ? 2.5
                : Math.min(5, 1 + Math.log2(Math.max(1, link.strength || 1)))
            }
            transparent
            opacity={
              dimmed ? 0.08 : highlighted || impactLink ? 1 : apiLink ? 0.82 : 0.62
            }
          />
        );
      })}
      {points.map((node) => (
        <Node
          key={node.id}
          node={node}
          selected={selected?.id === node.id}
          connected={connected.has(node.id)}
          impacted={impactedIds.has(node.id)}
          dimmed={
            impactMode &&
            selected &&
            selected.id !== node.id &&
            !connected.has(node.id) &&
            !impactedIds.has(node.id)
          }
          onSelect={onSelect}
        />
      ))}
      <OrbitControls
        ref={controls}
        makeDefault
        enableRotate
        enablePan
        enableZoom
      />
    </>
  );
}
export default function CodeGraph3D({
  graph,
  nodeTypes,
  statusFilter,
  selected,
  focusSignal,
  impactMode = false,
  impactedIds = new Set(),
  impactedLinks = new Set(),
  onSelect,
  resetSignal,
}) {
  const nodes = graph.nodes.filter(
    (node) =>
      nodeTypes.has(node.type) &&
      (statusFilter === "all" || node.status === statusFilter),
  );
  const ids = new Set(nodes.map((node) => node.id));
  const links = graph.links.filter(
    (link) => ids.has(link.source) && ids.has(link.target),
  );
  return (
    <div className="graph-canvas">
      <Canvas
        camera={{ position: [0, 0, 13], fov: 48 }}
        onPointerMissed={() => onSelect(null)}
      >
        <color attach="background" args={["#f9fbff"]} />
        <Scene
          nodes={nodes}
          links={links}
          selected={selected}
          focusSignal={focusSignal}
          impactMode={impactMode}
          impactedIds={impactedIds}
          impactedLinks={impactedLinks}
          onSelect={onSelect}
          resetSignal={resetSignal}
        />
      </Canvas>
    </div>
  );
}
