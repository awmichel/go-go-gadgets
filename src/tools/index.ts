import { Calculator, type LucideIcon, Settings } from "lucide-react";
import type { ComponentType } from "react";
import SCorpTaxCalculator from "./taxes/SCorpTaxCalculator";

export enum Categories {
  CALCULATORS = "calculators",
}

export type Tool = {
  id: string;
  name: string;
  category: Categories;
  icon: LucideIcon;
  color: string;
  description: string;
  Component: ComponentType<unknown>;
};

export const tools: Tool[] = [
  {
    id: "s-corp-tax-calculator",
    name: "S-Corp Tax Calculator",
    category: Categories.CALCULATORS,
    icon: Calculator,
    color: "from-blue-600 to-blue-400",
    description: "Calculate S-Corp taxes with ease",
    Component: SCorpTaxCalculator,
  },
];

export const categories = [
  { id: "all", name: "All Gadgets", icon: Settings, count: tools.length },
  {
    id: Categories.CALCULATORS,
    name: "Calculators",
    icon: Calculator,
    count: tools.filter((tool) => tool.category === Categories.CALCULATORS)
      .length,
  },
];
