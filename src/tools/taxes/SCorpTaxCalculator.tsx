import {
  BarChart3,
  Calculator,
  DollarSign,
  FileText,
  Minus,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTaxBrackets } from "./TaxBracketContext";
import { type FilingStatus, calculateTax, formatCurrency } from "./taxUtils";

const SCorpTaxCalculator = () => {
  const [inputs, setInputs] = useState({
    revenue: 150000,
    salary: 60000,
    businessExpenses: 20000,
    healthInsurance: 6000,
    retirementContribution: 5000,
    homeOfficeDeduction: 2000,
    priorYearTax: 0,
    filingStatus: "single" as FilingStatus, // single, marriedJoint, marriedSeparate
    commercialActivity: 150000, // for CAT tax
    taxDeductions: 15000, // for federal and state deductions
  });

  const [showBrackets, setShowBrackets] = useState(false);
  const [showPayrollRates, setShowPayrollRates] = useState(false);

  // Payroll tax rates (editable)
  const [payrollRates, setPayrollRates] = useState({
    socialSecurityEmployee: 0.062,
    socialSecurityEmployer: 0.062,
    socialSecurityWageBase: 168600, // 2025 estimate
    medicareEmployee: 0.0145,
    medicareEmployer: 0.0145,
    medicareSurtaxThreshold: 200000,
    medicareSurtaxRate: 0.009,
    oregonPaidLeave: 0.006,
    oregonTransit: 0.001,
    futa: 0.006,
    futaWageBase: 7000,
    suta: 0.024, // Oregon estimated rate
  });

  // Federal tax brackets 2024 (updated for 2025 would be similar)
  const {
    federalBrackets,
    setFederalBrackets,
    oregonBrackets,
    setOregonBrackets,
  } = useTaxBrackets();

  const calculations = useMemo(() => {
    // Business profit calculation
    const employerPayrollTaxes =
      Math.min(inputs.salary, payrollRates.socialSecurityWageBase) *
        payrollRates.socialSecurityEmployer +
      inputs.salary * payrollRates.medicareEmployer;
    const futa = Math.min(
      inputs.salary * payrollRates.futa,
      payrollRates.futaWageBase * payrollRates.futa
    );
    const suta = inputs.salary * payrollRates.suta;

    const totalBusinessExpenses =
      inputs.businessExpenses +
      inputs.healthInsurance +
      inputs.retirementContribution +
      inputs.homeOfficeDeduction +
      employerPayrollTaxes +
      futa +
      suta;

    const businessProfit = Math.max(
      0,
      inputs.revenue - inputs.salary - totalBusinessExpenses
    );

    // Employee payroll taxes
    const socialSecurityEmployee =
      Math.min(inputs.salary, payrollRates.socialSecurityWageBase) *
      payrollRates.socialSecurityEmployee;
    const medicareEmployee = inputs.salary * payrollRates.medicareEmployee;
    const medicareeSurtax = Math.max(
      0,
      (inputs.salary - payrollRates.medicareSurtaxThreshold) *
        payrollRates.medicareSurtaxRate
    );
    const oregonPaidLeave = inputs.salary * payrollRates.oregonPaidLeave;
    const oregonTransit = inputs.salary * payrollRates.oregonTransit;

    // Total income for tax purposes
    const totalIncome = inputs.salary + businessProfit - inputs.taxDeductions;

    // Federal income tax
    const federalTax = calculateTax(
      totalIncome,
      federalBrackets[inputs.filingStatus] || federalBrackets.single
    );

    // Oregon income tax
    const oregonTax = calculateTax(totalIncome, oregonBrackets);

    // Oregon CAT tax
    const catTax = Math.max(0, (inputs.commercialActivity - 1000000) * 0.0057);

    // Total taxes
    const totalPayrollTaxes =
      socialSecurityEmployee +
      medicareEmployee +
      medicareeSurtax +
      employerPayrollTaxes +
      oregonPaidLeave +
      oregonTransit +
      futa +
      suta;

    const totalIncomeTaxes = federalTax.total + oregonTax.total;
    const totalTaxes = totalPayrollTaxes + totalIncomeTaxes + catTax;

    // Quarterly payment calculation
    const requiredQuarterly = Math.max(
      (totalTaxes - totalPayrollTaxes) / 4, // Current year estimate
      (inputs.priorYearTax * 1.1) / 4 // 110% safe harbor
    );

    return {
      businessProfit,
      totalIncome,
      employerPayrollTaxes,
      socialSecurityEmployee,
      medicareEmployee,
      medicareeSurtax,
      oregonPaidLeave,
      oregonTransit,
      futa,
      suta,
      federalTax,
      oregonTax,
      catTax,
      totalPayrollTaxes,
      totalIncomeTaxes,
      totalTaxes,
      netIncome: totalIncome - totalTaxes,
      effectiveRate: totalIncome > 0 ? (totalTaxes / totalIncome) * 100 : 0,
      requiredQuarterly,
      totalBusinessExpenses,
    };
  }, [inputs, federalBrackets, oregonBrackets, payrollRates]);

  // Add type annotations for function parameters to resolve implicit any warnings
  const updateInput = (field: string, value: string) => {
    setInputs((prev) => ({ ...prev, [field]: Number.parseFloat(value) || 0 }));
  };

  const updateBracket = (
    type: "federal" | "oregon",
    index: number,
    field: string,
    value: string
  ) => {
    if (type === "federal") {
      setFederalBrackets((prev) => ({
        ...prev,
        [inputs.filingStatus]: prev[inputs.filingStatus].map((bracket, i) =>
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
        const currentBrackets = [...prev[inputs.filingStatus]];
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
          [inputs.filingStatus]: [...currentBrackets, newBracket],
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
        const currentBrackets = prev[inputs.filingStatus];
        if (currentBrackets.length <= 1) return prev;
        const newBrackets = currentBrackets.filter((_, i) => i !== index);
        // If we removed the last bracket, make the new last bracket go to infinity
        if (index === currentBrackets.length - 1 && newBrackets.length > 0) {
          newBrackets[newBrackets.length - 1].max = Number.POSITIVE_INFINITY;
        }
        return {
          ...prev,
          [inputs.filingStatus]: newBrackets,
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

  const updatePayrollRate = (field: string, value: string) => {
    setPayrollRates((prev) => ({
      ...prev,
      [field]: Number.parseFloat(value) || 0,
    }));
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
            {type === "federal" && ` (${inputs.filingStatus})`}
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
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="flex items-center space-x-1">
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
                      </div>
                      {index === activeBracket && (
                        <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
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
                      </div>
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
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPayrollRates = () => {
    return (
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">
          Payroll Tax Rates & Limits
        </h4>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h5 className="text-sm font-medium text-gray-700">
              Social Security
            </h5>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <label
                  htmlFor="socialSecurityEmployee"
                  className="text-xs text-gray-600 w-20"
                >
                  Employee:
                </label>
                <input
                  id="socialSecurityEmployee"
                  type="number"
                  step="0.001"
                  value={payrollRates.socialSecurityEmployee}
                  onChange={(e) =>
                    updatePayrollRate("socialSecurityEmployee", e.target.value)
                  }
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600">
                  ({(payrollRates.socialSecurityEmployee * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <label
                  htmlFor="socialSecurityEmployer"
                  className="text-xs text-gray-600 w-20"
                >
                  Employer:
                </label>
                <input
                  id="socialSecurityEmployer"
                  type="number"
                  step="0.001"
                  value={payrollRates.socialSecurityEmployer}
                  onChange={(e) =>
                    updatePayrollRate("socialSecurityEmployer", e.target.value)
                  }
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600">
                  ({(payrollRates.socialSecurityEmployer * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <label
                  htmlFor="socialSecurityWageBase"
                  className="text-xs text-gray-600 w-20"
                >
                  Wage Base:
                </label>
                <input
                  id="socialSecurityWageBase"
                  type="number"
                  value={payrollRates.socialSecurityWageBase}
                  onChange={(e) =>
                    updatePayrollRate("socialSecurityWageBase", e.target.value)
                  }
                  className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-sm font-medium text-gray-700">Medicare</h5>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <label
                  htmlFor="medicareEmployee"
                  className="text-xs text-gray-600 w-20"
                >
                  Employee:
                </label>
                <input
                  id="medicareEmployee"
                  type="number"
                  step="0.001"
                  value={payrollRates.medicareEmployee}
                  onChange={(e) =>
                    updatePayrollRate("medicareEmployee", e.target.value)
                  }
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600">
                  ({(payrollRates.medicareEmployee * 100).toFixed(2)}%)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <label
                  htmlFor="medicareEmployer"
                  className="text-xs text-gray-600 w-20"
                >
                  Employer:
                </label>
                <input
                  id="medicareEmployer"
                  type="number"
                  step="0.001"
                  value={payrollRates.medicareEmployer}
                  onChange={(e) =>
                    updatePayrollRate("medicareEmployer", e.target.value)
                  }
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600">
                  ({(payrollRates.medicareEmployer * 100).toFixed(2)}%)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <label
                  htmlFor="medicareSurtaxRate"
                  className="text-xs text-gray-600 w-20"
                >
                  Surtax Rate:
                </label>
                <input
                  id="medicareSurtaxRate"
                  type="number"
                  step="0.001"
                  value={payrollRates.medicareSurtaxRate}
                  onChange={(e) =>
                    updatePayrollRate("medicareSurtaxRate", e.target.value)
                  }
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600">
                  ({(payrollRates.medicareSurtaxRate * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <label
                  htmlFor="medicareSurtaxThreshold"
                  className="text-xs text-gray-600 w-20"
                >
                  Surtax Limit:
                </label>
                <input
                  id="medicareSurtaxThreshold"
                  type="number"
                  value={payrollRates.medicareSurtaxThreshold}
                  onChange={(e) =>
                    updatePayrollRate("medicareSurtaxThreshold", e.target.value)
                  }
                  className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-sm font-medium text-gray-700">Oregon State</h5>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <label
                  htmlFor="oregonPaidLeave"
                  className="text-xs text-gray-600 w-20"
                >
                  Paid Leave:
                </label>
                <input
                  id="oregonPaidLeave"
                  type="number"
                  step="0.001"
                  value={payrollRates.oregonPaidLeave}
                  onChange={(e) =>
                    updatePayrollRate("oregonPaidLeave", e.target.value)
                  }
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600">
                  ({(payrollRates.oregonPaidLeave * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <label
                  htmlFor="oregonTransit"
                  className="text-xs text-gray-600 w-20"
                >
                  Transit Tax:
                </label>
                <input
                  id="oregonTransit"
                  type="number"
                  step="0.001"
                  value={payrollRates.oregonTransit}
                  onChange={(e) =>
                    updatePayrollRate("oregonTransit", e.target.value)
                  }
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600">
                  ({(payrollRates.oregonTransit * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <label htmlFor="suta" className="text-xs text-gray-600 w-20">
                  SUTA Rate:
                </label>
                <input
                  id="suta"
                  type="number"
                  step="0.001"
                  value={payrollRates.suta}
                  onChange={(e) => updatePayrollRate("suta", e.target.value)}
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600">
                  ({(payrollRates.suta * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-sm font-medium text-gray-700">Unemployment</h5>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <label htmlFor="futa" className="text-xs text-gray-600 w-20">
                  FUTA Rate:
                </label>
                <input
                  id="futa"
                  type="number"
                  step="0.001"
                  value={payrollRates.futa}
                  onChange={(e) => updatePayrollRate("futa", e.target.value)}
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600">
                  ({(payrollRates.futa * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <label
                  htmlFor="futaWageBase"
                  className="text-xs text-gray-600 w-20"
                >
                  FUTA Base:
                </label>
                <input
                  id="futaWageBase"
                  type="number"
                  value={payrollRates.futaWageBase}
                  onChange={(e) =>
                    updatePayrollRate("futaWageBase", e.target.value)
                  }
                  className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calculator className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">
            S-Corp Tax Calculator - Oregon
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowBrackets(!showBrackets)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            {showBrackets ? "Hide" : "Show"} Tax Brackets
          </button>
          <button
            type="button"
            onClick={() => setShowPayrollRates(!showPayrollRates)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Users className="w-4 h-4" />
            {showPayrollRates ? "Hide" : "Show"} Payroll Rates
          </button>
        </div>
      </div>
      {showPayrollRates && (
        <div className="bg-green-50 p-4 rounded-lg mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Payroll Tax Rate Controls
            </h2>
            <span className="text-sm text-gray-600">
              Adjust rates and wage bases
            </span>
          </div>
          {renderPayrollRates()}
        </div>
      )}

      {showBrackets && (
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
                federalBrackets[inputs.filingStatus] || federalBrackets.single,
                "federal",
                calculations.totalIncome
              )}
            </div>
            <div>
              {renderTaxBrackets(
                oregonBrackets,
                "oregon",
                calculations.totalIncome
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Business Inputs
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="revenue"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Annual Revenue
                </label>
                <input
                  id="revenue"
                  type="number"
                  value={inputs.revenue}
                  onChange={(e) => updateInput("revenue", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="salary"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  W-2 Salary
                </label>
                <input
                  id="salary"
                  type="number"
                  value={inputs.salary}
                  onChange={(e) => updateInput("salary", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="businessExpenses"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Business Expenses
                </label>
                <input
                  id="businessExpenses"
                  type="number"
                  value={inputs.businessExpenses}
                  onChange={(e) =>
                    updateInput("businessExpenses", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="healthInsurance"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Health Insurance (Annual)
                </label>
                <input
                  id="healthInsurance"
                  type="number"
                  value={inputs.healthInsurance}
                  onChange={(e) =>
                    updateInput("healthInsurance", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="retirementContribution"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Retirement Contribution
                </label>
                <input
                  id="retirementContribution"
                  type="number"
                  value={inputs.retirementContribution}
                  onChange={(e) =>
                    updateInput("retirementContribution", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="homeOfficeDeduction"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Home Office Deduction
                </label>
                <input
                  id="homeOfficeDeduction"
                  type="number"
                  value={inputs.homeOfficeDeduction}
                  onChange={(e) =>
                    updateInput("homeOfficeDeduction", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="taxDeductions"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Standard or Itemized Deductions
                </label>
                <input
                  id="taxDeductions"
                  type="number"
                  value={inputs.taxDeductions}
                  onChange={(e) => updateInput("taxDeductions", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="priorYearTax"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Prior Year Total Tax (for safe harbor)
                </label>
                <input
                  id="priorYearTax"
                  type="number"
                  value={inputs.priorYearTax}
                  onChange={(e) => updateInput("priorYearTax", e.target.value)}
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
                  value={inputs.filingStatus}
                  onChange={(e) =>
                    setInputs((prev) => ({
                      ...prev,
                      filingStatus: e.target.value as FilingStatus,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="single">Single</option>
                  <option value="marriedJoint">Married Filing Jointly</option>
                  <option value="marriedSeparate">
                    Married Filing Separately
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Tax Breakdown
            </h2>

            <div className="space-y-3">
              <div className="bg-white p-3 rounded border-l-4 border-blue-500">
                <div className="text-sm text-gray-600">Business Profit</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(calculations.businessProfit)}
                </div>
              </div>

              <div className="bg-white p-3 rounded border-l-4 border-purple-500">
                <div className="text-sm text-gray-600">
                  Total Taxable Income
                </div>
                <div className="text-lg font-semibold">
                  {formatCurrency(calculations.totalIncome)}
                </div>
              </div>

              <div className="bg-white p-3 rounded">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Payroll Taxes
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Social Security (Employee):</span>
                    <span>
                      {formatCurrency(calculations.socialSecurityEmployee)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Medicare (Employee):</span>
                    <span>{formatCurrency(calculations.medicareEmployee)}</span>
                  </div>
                  {calculations.medicareeSurtax > 0 && (
                    <div className="flex justify-between">
                      <span>Medicare Surtax:</span>
                      <span>
                        {formatCurrency(calculations.medicareeSurtax)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>OR Paid Leave:</span>
                    <span>{formatCurrency(calculations.oregonPaidLeave)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>OR Transit Tax:</span>
                    <span>{formatCurrency(calculations.oregonTransit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Employer Payroll Taxes:</span>
                    <span>
                      {formatCurrency(calculations.employerPayrollTaxes)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>FUTA:</span>
                    <span>{formatCurrency(calculations.futa)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SUTA:</span>
                    <span>{formatCurrency(calculations.suta)}</span>
                  </div>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total Payroll:</span>
                    <span>
                      {formatCurrency(calculations.totalPayrollTaxes)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Income Taxes
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Federal Income Tax:</span>
                    <span>{formatCurrency(calculations.federalTax.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Oregon Income Tax:</span>
                    <span>{formatCurrency(calculations.oregonTax.total)}</span>
                  </div>
                  {calculations.catTax > 0 && (
                    <div className="flex justify-between">
                      <span>Oregon CAT Tax:</span>
                      <span>{formatCurrency(calculations.catTax)}</span>
                    </div>
                  )}
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total Income Tax:</span>
                    <span>{formatCurrency(calculations.totalIncomeTaxes)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 p-3 rounded border-l-4 border-red-500">
                <div className="text-sm text-gray-600">Total Tax Burden</div>
                <div className="text-xl font-bold text-red-700">
                  {formatCurrency(calculations.totalTaxes)}
                </div>
                <div className="text-sm text-gray-600">
                  Effective Rate: {calculations.effectiveRate.toFixed(1)}%
                </div>
              </div>

              <div className="bg-green-100 p-3 rounded border-l-4 border-green-500">
                <div className="text-sm text-gray-600">
                  Net Income After Taxes
                </div>
                <div className="text-xl font-bold text-green-700">
                  {formatCurrency(calculations.netIncome)}
                </div>
              </div>

              <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-500">
                <div className="text-sm text-gray-600">
                  Suggested Quarterly Payment
                </div>
                <div className="text-lg font-semibold text-yellow-700">
                  {formatCurrency(calculations.requiredQuarterly)}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Based on current year estimate and safe harbor rule
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-2">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>Important Notes:</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>
                This calculator uses 2024 tax brackets and rates as estimates
              </li>
              <li>
                Oregon CAT tax only applies if commercial activity exceeds $1M
              </li>
              <li>Quarterly payments help avoid underpayment penalties</li>
              <li>
                Consider consulting a tax professional for complex situations
              </li>
              <li>
                Employer payroll taxes are business expenses that reduce profit
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SCorpTaxCalculator;
