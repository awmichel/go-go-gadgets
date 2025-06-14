import { Calculator, DollarSign, FileText, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useTaxBrackets } from "./TaxBracketContext";
import { type FilingStatus, calculateTax, formatCurrency } from "./taxUtils";

const standardDeductions: Record<
  FilingStatus,
  { federal: number; oregon: number }
> = {
  single: { federal: 14600, oregon: 2770 },
  marriedJoint: { federal: 29200, oregon: 5540 },
};

const LLCTaxCalculator = () => {
  const [income, setIncome] = useState("");
  const [filingStatus, setFilingStatus] = useState<FilingStatus>("single");
  const [standardDeduction, setStandardDeduction] = useState(true);
  const [itemizedAmount, setItemizedAmount] = useState("");

  const { federalBrackets, oregonBrackets } = useTaxBrackets();

  const calculations = useMemo(() => {
    const grossIncome = Number.parseFloat(income) || 0;
    if (grossIncome <= 0) return null;

    const deductions = standardDeduction
      ? standardDeductions[filingStatus]
      : {
          federal: Number.parseFloat(itemizedAmount) || 0,
          oregon: Number.parseFloat(itemizedAmount) || 0,
        };

    // Self-employment tax (15.3% on 92.35% of SE income)
    const seTaxableIncome = grossIncome * 0.9235;
    const seTax = seTaxableIncome * 0.153;
    const seDeduction = seTax / 2; // Half of SE tax is deductible

    // Adjusted federal taxable income after SE tax deduction
    const adjustedFederalTaxable = Math.max(
      0,
      grossIncome - seDeduction - deductions.federal
    );
    const adjustedFederalTax = calculateTax(
      adjustedFederalTaxable,
      federalBrackets[filingStatus]
    );

    // Oregon calculations
    const oregonTaxableIncome = Math.max(
      0,
      grossIncome - seDeduction - deductions.oregon
    );
    const oregonIncomeTax = calculateTax(
      oregonTaxableIncome,
      oregonBrackets // oregonBrackets is now an array from context
    );

    const totalFederalTax = adjustedFederalTax.total + seTax;
    const totalTax = totalFederalTax + oregonIncomeTax.total;
    const effectiveRate = (totalTax / grossIncome) * 100;
    const afterTaxIncome = grossIncome - totalTax;

    return {
      grossIncome,
      deductions,
      federalTaxableIncome: adjustedFederalTaxable,
      oregonTaxableIncome,
      federalIncomeTax: adjustedFederalTax.total,
      seTax,
      oregonIncomeTax: oregonIncomeTax.total,
      totalFederalTax,
      totalTax,
      effectiveRate,
      afterTaxIncome,
      federalBreakdown: adjustedFederalTax.breakdown,
      oregonBreakdown: oregonIncomeTax.breakdown,
    };
  }, [
    income,
    filingStatus,
    standardDeduction,
    itemizedAmount,
    federalBrackets,
    oregonBrackets,
  ]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Calculator className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            LLC Passthrough Tax Calculator
          </h1>
        </div>
        <p className="text-gray-600">
          Calculate your federal and Oregon tax liability on LLC passthrough
          income (2024 tax year)
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Income & Deductions
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="income"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Taxable LLC Income
                </label>
                <input
                  id="income"
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  placeholder="Enter your taxable income"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="filingStatus"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Filing Status
                </label>
                <select
                  id="filingStatus"
                  value={filingStatus}
                  onChange={(e) =>
                    setFilingStatus(e.target.value as FilingStatus)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="single">Single</option>
                  <option value="marriedJoint">Married Filing Jointly</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="deductionType"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Deduction Type
                </label>
                <div id="deductionType" className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="deductionType"
                      checked={standardDeduction}
                      onChange={() => setStandardDeduction(true)}
                      className="mr-2"
                    />
                    <span className="text-sm">
                      Standard Deduction (Federal:{" "}
                      {formatCurrency(standardDeductions[filingStatus].federal)}
                      , Oregon:{" "}
                      {formatCurrency(standardDeductions[filingStatus].oregon)})
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="deductionType"
                      checked={!standardDeduction}
                      onChange={() => setStandardDeduction(false)}
                      className="mr-2"
                    />
                    <span className="text-sm">Itemized Deductions</span>
                  </label>
                </div>

                {!standardDeduction && (
                  <input
                    type="number"
                    value={itemizedAmount}
                    onChange={(e) => setItemizedAmount(e.target.value)}
                    placeholder="Enter itemized deduction amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {calculations && (
            <div className="bg-blue-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Tax Summary
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Gross Income:</span>
                  <span className="font-semibold">
                    {formatCurrency(calculations.grossIncome)}
                  </span>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Federal Income Tax:</span>
                    <span>{formatCurrency(calculations.federalIncomeTax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Self-Employment Tax:</span>
                    <span>{formatCurrency(calculations.seTax)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-600">Total Federal:</span>
                    <span>{formatCurrency(calculations.totalFederalTax)}</span>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Oregon Income Tax:</span>
                  <span>{formatCurrency(calculations.oregonIncomeTax)}</span>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Tax Liability:</span>
                    <span className="text-red-600">
                      {formatCurrency(calculations.totalTax)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>After-Tax Income:</span>
                    <span className="text-green-600">
                      {formatCurrency(calculations.afterTaxIncome)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Effective Tax Rate:</span>
                    <span>{calculations.effectiveRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {calculations && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Tax Breakdown
              </h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">
                    Federal Tax Brackets
                  </h4>
                  <div className="text-sm space-y-1">
                    {calculations.federalBreakdown.map((bracket, index) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <div key={index} className="flex justify-between">
                        <span className="text-gray-600">
                          {bracket.range} ({bracket.rate}):
                        </span>
                        <span>{formatCurrency(bracket.tax)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">
                    Oregon Tax Brackets
                  </h4>
                  <div className="text-sm space-y-1">
                    {calculations.oregonBreakdown.map((bracket, index) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <div key={index} className="flex justify-between">
                        <span className="text-gray-600">
                          {bracket.range} ({bracket.rate}):
                        </span>
                        <span>{formatCurrency(bracket.tax)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">Important Notes:</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>
            • This calculator uses 2024 tax brackets and standard deductions
          </li>
          <li>
            • Self-employment tax is calculated at 15.3% on 92.35% of SE income
          </li>
          <li>• Half of SE tax is deductible from income taxes</li>
          <li>• Consult a tax professional for complex situations</li>
          <li>• This is for estimation purposes only</li>
        </ul>
      </div>
    </div>
  );
};

export default LLCTaxCalculator;
