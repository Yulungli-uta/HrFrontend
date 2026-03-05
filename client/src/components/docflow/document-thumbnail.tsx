import { FileText, Image, FileSpreadsheet, File, FileCode, Presentation } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type FileCategory = "pdf" | "image" | "spreadsheet" | "presentation" | "code" | "other";

function getFileCategory(ext: string | null | undefined): FileCategory {
  if (!ext) return "other";
  const e = ext.toLowerCase().replace(/^\./, "");
  if (e === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp", "tiff"].includes(e)) return "image";
  if (["xls", "xlsx", "csv", "ods"].includes(e)) return "spreadsheet";
  if (["ppt", "pptx", "odp"].includes(e)) return "presentation";
  if (["json", "xml", "html", "htm", "js", "ts", "css"].includes(e)) return "code";
  return "other";
}

function getCategoryConfig(cat: FileCategory) {
  switch (cat) {
    case "pdf":
      return {
        Icon: FileText,
        bg: "bg-red-50 dark:bg-red-950/40",
        border: "border-red-200 dark:border-red-800/50",
        iconColor: "text-red-500 dark:text-red-400",
        label: "PDF",
        lineColor: "bg-red-200/60 dark:bg-red-800/40",
      };
    case "image":
      return {
        Icon: Image,
        bg: "bg-blue-50 dark:bg-blue-950/40",
        border: "border-blue-200 dark:border-blue-800/50",
        iconColor: "text-blue-500 dark:text-blue-400",
        label: "IMG",
        lineColor: "bg-blue-200/60 dark:bg-blue-800/40",
      };
    case "spreadsheet":
      return {
        Icon: FileSpreadsheet,
        bg: "bg-green-50 dark:bg-green-950/40",
        border: "border-green-200 dark:border-green-800/50",
        iconColor: "text-green-600 dark:text-green-400",
        label: "XLS",
        lineColor: "bg-green-200/60 dark:bg-green-800/40",
      };
    case "presentation":
      return {
        Icon: Presentation,
        bg: "bg-orange-50 dark:bg-orange-950/40",
        border: "border-orange-200 dark:border-orange-800/50",
        iconColor: "text-orange-500 dark:text-orange-400",
        label: "PPT",
        lineColor: "bg-orange-200/60 dark:bg-orange-800/40",
      };
    case "code":
      return {
        Icon: FileCode,
        bg: "bg-purple-50 dark:bg-purple-950/40",
        border: "border-purple-200 dark:border-purple-800/50",
        iconColor: "text-purple-500 dark:text-purple-400",
        label: "COD",
        lineColor: "bg-purple-200/60 dark:bg-purple-800/40",
      };
    default:
      return {
        Icon: File,
        bg: "bg-gray-50 dark:bg-gray-900/40",
        border: "border-gray-200 dark:border-gray-700/50",
        iconColor: "text-gray-500 dark:text-gray-400",
        label: "DOC",
        lineColor: "bg-gray-200/60 dark:bg-gray-700/40",
      };
  }
}

interface DocumentThumbnailProps {
  documentId: string | number;
  fileExtension?: string | null;
  title: string;
  onClick?: () => void;
  className?: string;
}

export function DocumentThumbnail({ documentId, fileExtension, title, onClick, className = "" }: DocumentThumbnailProps) {
  const cat = getFileCategory(fileExtension);
  const config = getCategoryConfig(cat);
  const { Icon, bg, border, iconColor, label, lineColor } = config;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); }}
          className={`
            relative flex flex-col items-center justify-between
            w-14 aspect-[3/4] shrink-0 rounded-[4px] border overflow-hidden
            cursor-pointer select-none
            ${bg} ${border} ${className}
          `}
          data-testid={`button-doc-thumbnail-${documentId}`}
        >
          <div className="flex flex-col items-start w-full px-1.5 pt-1.5 gap-[3px]">
            <div className={`h-[2px] w-full rounded-full ${lineColor}`} />
            <div className={`h-[2px] w-[85%] rounded-full ${lineColor}`} />
            <div className={`h-[2px] w-[70%] rounded-full ${lineColor}`} />
            <div className={`h-[2px] w-full rounded-full ${lineColor}`} />
            <div className={`h-[2px] w-[60%] rounded-full ${lineColor}`} />
          </div>

          <div className="flex flex-col items-center pb-1">
            <Icon className={`h-4 w-4 ${iconColor}`} />
            <span className={`text-[8px] font-bold uppercase leading-none mt-0.5 ${iconColor}`}>
              {label}
            </span>
          </div>

          <div className="absolute top-0 right-0 w-3 h-3">
            <div className="absolute top-0 right-0 w-0 h-0 border-t-[12px] border-r-[12px] border-t-white dark:border-t-gray-900 border-r-transparent" />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <p className="text-xs">Vista previa: {title}</p>
      </TooltipContent>
    </Tooltip>
  );
}
