import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
} from "lucide-react";
import { useMemo, useState } from "react";

function TreeItem({ node, depth = 0, onSelect, selectedPath }) {
  const [open, setOpen] = useState(depth < 1);
  const folder = node.type === "folder";
  return (
    <li>
      <button
        className={`tree-row ${selectedPath === node.path ? "selected" : ""}`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => (folder ? setOpen(!open) : onSelect(node))}
      >
        {folder ? (
          <>
            {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            {open ? (
              <FolderOpen size={15} className="text-warning" />
            ) : (
              <Folder size={15} className="text-warning" />
            )}
          </>
        ) : (
          <>
            <span className="tree-spacer" />
            <File size={15} className="text-secondary" />
          </>
        )}
        <span>{node.name}</span>
      </button>
      {folder && open && (
        <ul>
          {node.children.map((child) => (
            <TreeItem
              key={`${node.name}-${child.name}`}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
export default function FileExplorer({ tree, files, onSelect, selectedPath }) {
  const filesByPath = useMemo(
    () => new Map(files.map((file) => [file.path, file])),
    [files],
  );
  const selectFile = (treeFile) => {
    const file = filesByPath.get(treeFile.path);
    if (file) onSelect(file);
  };
  const withPaths = (node, prefix = "") => {
    if (node.type === "file") return { ...node, path: `${prefix}${node.name}` };
    return {
      ...node,
      path: prefix,
      children: node.children.map((child) =>
        withPaths(
          child,
          node.name === "Repository" ? "" : `${prefix}${node.name}/`,
        ),
      ),
    };
  };
  return (
    <div className="file-explorer">
      <ul>
        <TreeItem
          node={withPaths(tree)}
          onSelect={selectFile}
          selectedPath={selectedPath}
        />
      </ul>
    </div>
  );
}
