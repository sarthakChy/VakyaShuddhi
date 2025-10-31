import type { Correction } from "../utils/grammarChecker";
import { Card } from "@/components/ui/card";

interface CorrectionDisplayProps {
  originalText: string;
  correctedText: string;
  corrections: Correction[];
}

export function CorrectionDisplay({
  originalText,
  correctedText,
  corrections,
}: CorrectionDisplayProps) {
  if (!corrections.length) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-success">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <p className="font-medium">No errors found! Your text looks great.</p>
        </div>
      </Card>
    );
  }

  const renderHighlightedText = () => {
    const parts: JSX.Element[] = [];
    let lastIndex = 0;

    corrections.forEach((correction, idx) => {
      if (correction.startIndex > lastIndex) {
        parts.push(
          <span key={`text-${idx}`}>
            {originalText.slice(lastIndex, correction.startIndex)}
          </span>
        );
      }

      parts.push(
        <span
          key={`error-${idx}`}
          className="bg-error/20 text-error font-medium line-through decoration-error decoration-2"
        >
          {correction.original}
        </span>
      );

      parts.push(
        <span key={`correction-${idx}`} className="bg-success/20 text-success font-medium ml-1">
          {correction.corrected}
        </span>
      );

      lastIndex = correction.endIndex;
    });

    if (lastIndex < originalText.length) {
      parts.push(
        <span key="text-end">{originalText.slice(lastIndex)}</span>
      );
    }

    return parts;
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          Corrected Text
        </h3>
        <div className="text-base leading-relaxed whitespace-pre-wrap">
          {renderHighlightedText()}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          Corrections Made ({corrections.length})
        </h3>
        <div className="space-y-2">
          {corrections.map((correction, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 bg-muted rounded-lg"
            >
              <span className="text-error font-medium line-through">
                {correction.original}
              </span>
              <svg
                className="w-4 h-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="text-success font-medium">
                {correction.corrected}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}