// src/components/certification-finance/CertificationSearch.tsx
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function CertificationSearch(props: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Buscar certificación por código, número, presupuesto o estado..."
          className="pl-10"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
