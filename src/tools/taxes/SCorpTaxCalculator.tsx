import {
  BarChart3,
  Calculator,
  DollarSign,
  FileText,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EditTaxBrackets } from "./EditTaxBrackets";
import { useTaxBrackets } from "./TaxBracketContext";
import { InputField, SelectField } from "./TaxFormFields";
import { type FilingStatus, calculateTax, formatCurrency } from "./taxUtils";
import { useLocalStorageState } from "./useLocalStorageState";

// Add standardDeductions definition for SCorpTaxCalculator
const standardDeductions: Record<
  "single" | "marriedJoint",
  { federal: number }
> = {
  single: { federal: 14600 },
  marriedJoint: { federal: 29200 },
};

type SCorpCalculatorState = {
  revenue: number;
  salary: number;
  businessExpenses: number;
  healthInsurance: number;
  retirementContribution: number;
  homeOfficeDeduction: number;
  priorYearTax: number;
  filingStatus: FilingStatus;
  commercialActivity: number;
  deductionType: "standard" | "itemized";
  itemizedAmount: string; // Use string to handle empty input
};

const SCorpTaxCalculator = () => {
  // Replace all useState for inputs, deductionType, itemizedAmount with useLocalStorageStates
  const [state, setState] = useLocalStorageState<SCorpCalculatorState>(
    "scorpInputs",
    {
      revenue: 150000,
      salary: 60000,
      businessExpenses: 20000,
      healthInsurance: 6000,
      retirementContribution: 5000,
      homeOfficeDeduction: 2000,
      priorYearTax: 0,
      filingStatus: "single",
      commercialActivity: 150000,
      deductionType: "standard",
      itemizedAmount: "",
    }
  );

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
    sutaWageBase: 54300,
  });

  // Federal tax brackets 2024 (updated for 2025 would be similar)
  const { federalBrackets, oregonBrackets } = useTaxBrackets();

  const calculations = useMemo(() => {
    // Business profit calculation
    const employerPayrollTaxes =
      Math.min(state.salary, payrollRates.socialSecurityWageBase) *
        payrollRates.socialSecurityEmployer +
      state.salary * payrollRates.medicareEmployer;
    const futa = Math.min(
      state.salary * payrollRates.futa,
      payrollRates.futaWageBase * payrollRates.futa
    );
    const suta = Math.min(
      state.salary * payrollRates.suta,
      payrollRates.sutaWageBase * payrollRates.suta
    );

    const totalBusinessExpenses =
      state.businessExpenses +
      state.healthInsurance +
      state.retirementContribution +
      state.homeOfficeDeduction +
      employerPayrollTaxes +
      futa +
      suta;

    const businessProfit = Math.max(
      0,
      state.revenue - state.salary - totalBusinessExpenses
    );

    // Employee payroll taxes
    const socialSecurityEmployee =
      Math.min(state.salary, payrollRates.socialSecurityWageBase) *
      payrollRates.socialSecurityEmployee;
    const medicareEmployee = state.salary * payrollRates.medicareEmployee;
    const medicareeSurtax = Math.max(
      0,
      (state.salary - payrollRates.medicareSurtaxThreshold) *
        payrollRates.medicareSurtaxRate
    );
    const oregonPaidLeave = state.salary * payrollRates.oregonPaidLeave;
    const oregonTransit = state.salary * payrollRates.oregonTransit;

    // Total income for tax purposes
    const deductionValue =
      state.deductionType === "standard"
        ? standardDeductions[
            state.filingStatus === "marriedJoint" ? "marriedJoint" : "single"
          ].federal
        : Number.parseFloat(state.itemizedAmount) || 0;

    const totalIncome = state.salary + businessProfit;
    const totalTaxableIncome = state.salary + businessProfit - deductionValue;

    // Federal income tax
    const federalTax = calculateTax(
      totalTaxableIncome,
      federalBrackets[state.filingStatus] || federalBrackets.single
    );

    // Oregon income tax
    const oregonTax = calculateTax(totalTaxableIncome, oregonBrackets);

    // Oregon CAT tax
    const catTax = Math.max(0, (state.commercialActivity - 1000000) * 0.0057);

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
      (state.priorYearTax * 1.1) / 4 // 110% safe harbor
    );

    return {
      businessProfit,
      totalTaxableIncome,
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
  }, [state, federalBrackets, oregonBrackets, payrollRates]);

  // Add type annotations for function parameters to resolve implicit any warnings
  const updateInput = (field: string, value: string) => {
    setState({ ...state, [field]: Number.parseFloat(value) || 0 });
  };

  const updatePayrollRate = (field: string, value: string) => {
    setPayrollRates((prev) => ({
      ...prev,
      [field]: Number.parseFloat(value) || 0,
    }));
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

  // Save inputs to localStorage on change
  useEffect(() => {
    localStorage.setItem("scorpInputs", JSON.stringify(state));
  }, [state]);

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
        <EditTaxBrackets
          filingStatus={state.filingStatus}
          totalIncome={calculations.totalTaxableIncome}
        />
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
                  value={state.revenue}
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
                  value={state.salary}
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
                  value={state.businessExpenses}
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
                  value={state.healthInsurance}
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
                  value={state.retirementContribution}
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
                  value={state.homeOfficeDeduction}
                  onChange={(e) =>
                    updateInput("homeOfficeDeduction", e.target.value)
                  }
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
                  value={state.priorYearTax}
                  onChange={(e) => updateInput("priorYearTax", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <SelectField
                  id="filingStatus"
                  label="Filing Status"
                  value={state.filingStatus}
                  onChange={(e) =>
                    setState({
                      ...state,
                      filingStatus: e.target.value as FilingStatus,
                    })
                  }
                  options={[
                    { value: "single", label: "Single" },
                    { value: "marriedJoint", label: "Married Filing Jointly" },
                    {
                      value: "marriedSeparate",
                      label: "Married Filing Separately",
                    },
                  ]}
                />
              </div>
              <div className="mb-4">
                <label
                  className="block text-sm font-medium text-gray-700 mb-2"
                  htmlFor="deductionType"
                >
                  Deduction Type
                </label>
                <div id="deductionType" className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="deductionType"
                      checked={state.deductionType === "standard"}
                      onChange={() =>
                        setState({ ...state, deductionType: "standard" })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">
                      Standard Deduction (Federal:{" "}
                      {formatCurrency(
                        standardDeductions[
                          state.filingStatus === "marriedJoint"
                            ? "marriedJoint"
                            : "single"
                        ].federal
                      )}
                      )
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="deductionType"
                      checked={state.deductionType === "itemized"}
                      onChange={() =>
                        setState({ ...state, deductionType: "itemized" })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">Itemized Deductions</span>
                  </label>
                  {state.deductionType === "itemized" && (
                    <InputField
                      id="itemizedAmount"
                      label="Itemized Deduction Amount"
                      value={state.itemizedAmount}
                      onChange={(e) =>
                        setState({ ...state, itemizedAmount: e.target.value })
                      }
                      type="number"
                      className="mt-2"
                    />
                  )}
                </div>
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
                  {formatCurrency(calculations.totalTaxableIncome)}
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
                This calculator uses 2025 tax brackets and rates as estimates
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
