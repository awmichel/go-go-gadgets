import { BarChart3, Minus, Plus } from "lucide-react";
import { useTaxBrackets } from "./TaxBracketContext";
import { type FilingStatus, formatCurrency } from "./taxUtils";

export function EditTaxBrackets({
  filingStatus,
  totalIncome,
}: {
  filingStatus: FilingStatus;
  totalIncome: number;
}) {
  // Federal tax brackets 2024 (updated for 2025 would be similar)
  const {
    federalBrackets,
    setFederalBrackets,
    oregonBrackets,
    setOregonBrackets,
  } = useTaxBrackets();

  const updateBracket = (
    type: "federal" | "oregon",
    index: number,
    field: string,
    value: string
  ) => {
    if (type === "federal") {
      setFederalBrackets((prev) => ({
        ...prev,
        [filingStatus]: prev[filingStatus].map((bracket, i) =>
          i === index
            ? {
                ...bracket,
                [field]:
                  field === "rate"
                    ? Number.parseFloat(value) || 0
                    : Number.parseInt(value) || 0,
              }
            : bracket
        ),
      }));
    } else {
      setOregonBrackets((prev) =>
        prev.map((bracket, i) =>
          i === index
            ? {
                ...bracket,
                [field]:
                  field === "rate"
                    ? Number.parseFloat(value) || 0
                    : Number.parseInt(value) || 0,
              }
            : bracket
        )
      );
    }
  };

  const addBracket = (type: "federal" | "oregon") => {
    if (type === "federal") {
      setFederalBrackets((prev) => {
        const currentBrackets = [...prev[filingStatus]];
        const lastBracket = currentBrackets[currentBrackets.length - 1];
        const newBracket = {
          min:
            lastBracket.max === Number.POSITIVE_INFINITY
              ? lastBracket.min + 50000
              : lastBracket.max,
          max:
            lastBracket.max === Number.POSITIVE_INFINITY
              ? Number.POSITIVE_INFINITY
              : lastBracket.max + 50000,
          rate: 0.35,
        };
        // Update last bracket's max if it was infinity
        if (lastBracket.max === Number.POSITIVE_INFINITY) {
          currentBrackets[currentBrackets.length - 1] = {
            ...lastBracket,
            max: newBracket.min,
          };
        }
        return {
          ...prev,
          [filingStatus]: [...currentBrackets, newBracket],
        };
      });
    } else {
      setOregonBrackets((prev) => {
        const lastBracket = prev[prev.length - 1];
        const newBracket = {
          min:
            lastBracket.max === Number.POSITIVE_INFINITY
              ? lastBracket.min + 25000
              : lastBracket.max,
          max:
            lastBracket.max === Number.POSITIVE_INFINITY
              ? Number.POSITIVE_INFINITY
              : lastBracket.max + 25000,
          rate: 0.099,
        };
        // Update last bracket's max if it was infinity
        const updatedBrackets = [...prev];
        if (lastBracket.max === Number.POSITIVE_INFINITY) {
          updatedBrackets[updatedBrackets.length - 1] = {
            ...lastBracket,
            max: newBracket.min,
          };
        }
        return [...updatedBrackets, newBracket];
      });
    }
  };

  const removeBracket = (type: "federal" | "oregon", index: number) => {
    if (type === "federal") {
      setFederalBrackets((prev) => {
        const currentBrackets = prev[filingStatus];
        if (currentBrackets.length <= 1) return prev;
        const newBrackets = currentBrackets.filter((_, i) => i !== index);
        // If we removed the last bracket, make the new last bracket go to infinity
        if (index === currentBrackets.length - 1 && newBrackets.length > 0) {
          newBrackets[newBrackets.length - 1].max = Number.POSITIVE_INFINITY;
        }
        return {
          ...prev,
          [filingStatus]: newBrackets,
        };
      });
    } else {
      setOregonBrackets((prev) => {
        if (prev.length <= 1) return prev;
        const newBrackets = prev.filter((_, i) => i !== index);
        // If we removed the last bracket, make the new last bracket go to infinity
        if (index === prev.length - 1 && newBrackets.length > 0) {
          newBrackets[newBrackets.length - 1].max = Number.POSITIVE_INFINITY;
        }
        return newBrackets;
      });
    }
  };

  const getBracketForIncome = (
    income: number,
    brackets: { min: number; max: number }[]
  ) => {
    for (let i = 0; i < brackets.length; i++) {
      if (income >= brackets[i].min && income < brackets[i].max) {
        return i;
      }
    }
    return brackets.length - 1;
  };

  const renderTaxBrackets = (
    brackets: { min: number; max: number; rate: number }[],
    type: "federal" | "oregon",
    income: number
  ) => {
    const activeBracket = getBracketForIncome(income, brackets);

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h4 className="font-medium text-gray-900">
            {type === "federal" ? "Federal" : "Oregon"} Tax Brackets
            {type === "federal" && ` (${filingStatus})`}
          </h4>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-600">
              Income: {formatCurrency(income)}
            </div>
            <button
              type="button"
              onClick={() => addBracket(type)}
              className="p-1 text-green-600 hover:bg-green-100 rounded"
              title="Add bracket"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          {brackets.map((bracket, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={index} className="flex justify-between">
              <div
                className={`p-3 rounded border ${
                  index === activeBracket
                    ? "bg-blue-100 border-blue-300"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={bracket.min}
                    onChange={(e) =>
                      updateBracket(type, index, "min", e.target.value)
                    }
                    className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-600">to</span>
                  {bracket.max === Number.POSITIVE_INFINITY ? (
                    <span className="w-20 px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded text-center">
                      ∞
                    </span>
                  ) : (
                    <input
                      type="number"
                      value={bracket.max}
                      onChange={(e) =>
                        updateBracket(type, index, "max", e.target.value)
                      }
                      className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  )}
                  <span className="text-xs text-gray-600">Rate:</span>
                  <input
                    type="number"
                    step="0.001"
                    value={bracket.rate}
                    onChange={(e) =>
                      updateBracket(type, index, "rate", e.target.value)
                    }
                    className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-600">
                    ({(bracket.rate * 100).toFixed(1)}%)
                  </span>
                  {brackets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBracket(type, index)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                      title="Remove bracket"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">
          Tax Bracket Controls
        </h2>
        <span className="text-sm text-gray-600">
          Adjust for 2025 tax brackets
        </span>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          {renderTaxBrackets(
            federalBrackets[filingStatus] || federalBrackets.single,
            "federal",
            totalIncome
          )}
        </div>
        <div>{renderTaxBrackets(oregonBrackets, "oregon", totalIncome)}</div>
      </div>
    </div>
  );
}
