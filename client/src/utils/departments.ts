import type { Department } from "@/types/department";

export function buildTree(list: Department[]): (Department & { children: Department[] })[] {
  const map = new Map<number, Department & { children: Department[] }>();
  const roots: (Department & { children: Department[] })[] = [];
  
  list.forEach(d => map.set(d.departmentId, { ...d, children: [] }));
  
  list.forEach(d => {
    const node = map.get(d.departmentId)!;
    if (d.parentId && map.has(d.parentId)) {
      map.get(d.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  
  return roots;
}