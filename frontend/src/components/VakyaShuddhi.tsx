import { useState } from "react";
import { TextEditor } from "./TextEditor";
import { CorrectionDisplay } from "./CorrectionDisplay";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { mockGrammarCheck, type Correction } from "../utils/grammarChecker";

export function VakyaShuddhi() {
  const [inputText, setInputText] = useState("");
  const [correctedText, setCorrectedText] = useState("");
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [hasChecked, setHasChecked] = useState(false);

  const handleCheckGrammar = () => {
    if (!inputText.trim()) return;

    const result = mockGrammarCheck(inputText);
    setCorrectedText(result.correctedText);
    setCorrections(result.corrections);
    setHasChecked(true);
  };

  const handleReset = () => {
    setInputText("");
    setCorrectedText("");
    setCorrections([]);
    setHasChecked(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            VākyaShuddhi
          </h1>
          <p className="text-muted-foreground">
            Your intelligent grammar checking assistant
          </p>
        </header>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">
              Enter Your Text
            </h2>
            <TextEditor
              value={inputText}
              onChange={setInputText}
              placeholder="Type or paste your text here…"
            />
            <div className="flex gap-3 mt-4">
              <Button
                onClick={handleCheckGrammar}
                disabled={!inputText.trim()}
                className="flex-1"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Check Grammar
              </Button>
              {hasChecked && (
                <Button onClick={handleReset} variant="outline">
                  Reset
                </Button>
              )}
            </div>
          </Card>

          {hasChecked && (
            <CorrectionDisplay
              originalText={inputText}
              correctedText={correctedText}
              corrections={corrections}
            />
          )}
        </div>

        <footer className="text-center mt-12 text-sm text-muted-foreground">
          <p>Made with ❤️ for better writing</p>
        </footer>
      </div>
    </div>
  );
}