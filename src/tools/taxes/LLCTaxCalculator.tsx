import { Calculator, DollarSign, FileText, TrendingUp } from "lucide-react";
import React, { useState, useMemo } from "react";

const LLCTaxCalculator = () => {
  const [income, setIncome] = useState("");
  const [filingStatus, setFilingStatus] = useState("single");
  const [standardDeduction, setStandardDeduction] = useState(true);
  const [itemizedAmount, setItemizedAmount] = useState("");

  // 2024 Tax Brackets
  const federalBrackets = {
    single: [
      { min: 0, max: 11000, rate: 0.1 },
      { min: 11000, max: 44725, rate: 0.12 },
      { min: 44725, max: 95375, rate: 0.22 },
      { min: 95375, max: 182050, rate: 0.24 },
      { min: 182050, max: 231250, rate: 0.32 },
      { min: 231250, max: 578125, rate: 0.35 },
      { min: 578125, max: Number.POSITIVE_INFINITY, rate: 0.37 },
    ],
    marriedJoint: [
      { min: 0, max: 22000, rate: 0.1 },
      { min: 22000, max: 89450, rate: 0.12 },
      { min: 89450, max: 190750, rate: 0.22 },
      { min: 190750, max: 364200, rate: 0.24 },
      { min: 364200, max: 462500, rate: 0.32 },
      { min: 462500, max: 693750, rate: 0.35 },
      { min: 693750, max: Number.POSITIVE_INFINITY, rate: 0.37 },
    ],
  };

  const oregonBrackets = {
    single: [
      { min: 0, max: 4050, rate: 0.0475 },
      { min: 4050, max: 10200, rate: 0.0675 },
      { min: 10200, max: 25550, rate: 0.0875 },
      { min: 25550, max: 64100, rate: 0.099 },
      { min: 64100, max: Number.POSITIVE_INFINITY, rate: 0.1175 },
    ],
    marriedJoint: [
      { min: 0, max: 8100, rate: 0.0475 },
      { min: 8100, max: 20400, rate: 0.0675 },
      { min: 20400, max: 51100, rate: 0.0875 },
      { min: 51100, max: 128200, rate: 0.099 },
      { min: 128200, max: Number.POSITIVE_INFINITY, rate: 0.1175 },
    ],
  };

  const standardDeductions = {
    single: { federal: 14600, oregon: 2770 },
    marriedJoint: { federal: 29200, oregon: 5540 },
  };

  const calculateTax = (taxableIncome, brackets) => {
    let tax = 0;
    const breakdown = [];

    for (const bracket of brackets) {
      if (taxableIncome <= bracket.min) break;

      const taxableInBracket =
        Math.min(taxableIncome, bracket.max) - bracket.min;
      const taxForBracket = taxableInBracket * bracket.rate;

      if (taxableInBracket > 0) {
        tax += taxForBracket;
        breakdown.push({
          range: `$${bracket.min.toLocaleString()} - ${
            bracket.max === Number.POSITIVE_INFINITY
              ? "∞"
              : "$" + bracket.max.toLocaleString()
          }`,
          rate: (bracket.rate * 100).toFixed(2) + "%",
          taxableAmount: taxableInBracket,
          tax: taxForBracket,
        });
      }
    }

    return { total: tax, breakdown };
  };

  const calculations = useMemo(() => {
    const grossIncome = Number.parseFloat(income) || 0;
    if (grossIncome <= 0) return null;

    const deductions = standardDeduction
      ? standardDeductions[filingStatus]
      : {
          federal: Number.parseFloat(itemizedAmount) || 0,
          oregon: Number.parseFloat(itemizedAmount) || 0,
        };

    // Federal calculations
    const federalTaxableIncome = Math.max(0, grossIncome - deductions.federal);
    const federalIncomeTax = calculateTax(
      federalTaxableIncome,
      federalBrackets[filingStatus]
    );

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
      oregonBrackets[filingStatus]
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
  }, [income, filingStatus, standardDeduction, itemizedAmount]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taxable LLC Income
                </label>
                <input
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  placeholder="Enter your taxable income"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filing Status
                </label>
                <select
                  value={filingStatus}
                  onChange={(e) => setFilingStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="single">Single</option>
                  <option value="marriedJoint">Married Filing Jointly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deduction Type
                </label>
                <div className="space-y-2">
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
