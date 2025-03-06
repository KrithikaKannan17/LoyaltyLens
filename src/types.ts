export interface Customer {
  id: string;
  name: string;
  age: number;
  creditScore: number;
  balance: number;
  numProducts: number;
  hasInsurance: boolean;
  tenure: number;
  isActive: boolean;
  churnProbability: number;
  lastTransaction: string;
  location: string;
}

export interface ChurnMetrics {
  totalCustomers: number;
  activeCustomers: number;
  highRiskCustomers: number;
  averageChurnProbability: number;
}