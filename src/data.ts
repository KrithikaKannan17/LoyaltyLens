import { Customer, ChurnMetrics } from './types';

// Simulated customer data
export const customers: Customer[] = Array.from({ length: 20 }, (_, i) => ({
  id: `CUS${(i + 1).toString().padStart(5, '0')}`,
  name: [
    'Emma Thompson', 'James Wilson', 'Sarah Davis', 'Michael Brown',
    'Lisa Anderson', 'David Martinez', 'Jennifer Taylor', 'Robert Johnson',
    'Maria Garcia', 'William Lee', 'Patricia Moore', 'John Smith',
    'Linda Williams', 'Richard Miller', 'Elizabeth Jones', 'Thomas White',
    'Susan Brown', 'Joseph Davis', 'Margaret Wilson', 'Charles Taylor'
  ][i],
  age: Math.floor(Math.random() * (70 - 25) + 25),
  creditScore: Math.floor(Math.random() * (850 - 580) + 580),
  balance: Math.floor(Math.random() * (100000 - 1000) + 1000),
  numProducts: Math.floor(Math.random() * 4) + 1,
  hasInsurance: Math.random() > 0.5,
  tenure: Math.floor(Math.random() * 20),
  isActive: Math.random() > 0.2,
  churnProbability: Math.random(),
  lastTransaction: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  location: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][Math.floor(Math.random() * 5)]
}));

export const calculateMetrics = (customers: Customer[]): ChurnMetrics => ({
  totalCustomers: customers.length,
  activeCustomers: customers.filter(c => c.isActive).length,
  highRiskCustomers: customers.filter(c => c.churnProbability > 0.7).length,
  averageChurnProbability: Number((customers.reduce((acc, c) => acc + c.churnProbability, 0) / customers.length).toFixed(2))
});