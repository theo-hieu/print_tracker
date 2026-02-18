import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: number;
  text?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  size = 48,
  text,
  fullScreen = true,
}: LoadingSpinnerProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <Loader2
        size={size}
        className="animate-spin text-red-700"
        strokeWidth={1.5}
      />
      {text && (
        <p className="text-gray-500 font-medium animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center p-12 h-64 w-full">
        {content}
      </div>
    );
  }

  return content;
}
