import type { FolderType } from "@/app/lib/types";

interface FolderIconProps {
  folderType: FolderType;
  className?: string;
}

export function FolderIcon({ folderType, className = "h-12 w-12" }: FolderIconProps) {
  const isRun = folderType === "run";

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 48 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Folder tab */}
        <path
          d="M0 8C0 5.79 1.79 4 4 4H18L22 8H44C46.21 8 48 9.79 48 12V36C48 38.21 46.21 40 44 40H4C1.79 40 0 38.21 0 36V8Z"
          fill={isRun ? "#f97316" : "#3b82f6"}
          opacity="0.15"
        />
        <path
          d="M0 12C0 9.79 1.79 8 4 8H44C46.21 8 48 9.79 48 12V36C48 38.21 46.21 40 44 40H4C1.79 40 0 38.21 0 36V12Z"
          fill={isRun ? "#f97316" : "#3b82f6"}
          opacity="0.9"
        />
        {/* Shine */}
        <path
          d="M4 8H44C46.21 8 48 9.79 48 12V16H0V12C0 9.79 1.79 8 4 8Z"
          fill="white"
          opacity="0.12"
        />
        {/* Tab */}
        <path
          d="M0 8C0 5.79 1.79 4 4 4H18L22 8H0V8Z"
          fill={isRun ? "#ea580c" : "#2563eb"}
          opacity="0.6"
        />
      </svg>

      {/* Run badge */}
      {isRun && (
        <div className="absolute bottom-0.5 right-0.5 h-4 w-4 flex items-center justify-center">
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
            <circle cx="8" cy="8" r="7" fill="#ea580c" opacity="0.9" />
            {/* Running figure */}
            <circle cx="10" cy="5" r="1.2" fill="white" />
            <path d="M9 7L7.5 9L9.5 10.5M9 7L11 8.5M7.5 9L6.5 11" stroke="white" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  );
}
