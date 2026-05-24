import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*
  Define the data models for the Financial Flow application.
  This creates DynamoDB tables and standard AppSync GraphQL mutations/queries.
  
  The schema has:
  1. FinancialMonth: Custom financial billing cycles
  2. Expense: Individual transactions (expenses or incomes)
  3. Debt: Debts to pay or to receive
*/
const schema = a.schema({
  FinancialMonth: a
    .model({
      name: a.string().required(),
      startDate: a.string().required(),
      endDate: a.string(),
      active: a.boolean().required(),
    })
    .authorization((allow) => [allow.owner()]),

  Expense: a
    .model({
      date: a.string().required(),
      description: a.string().required(),
      amount: a.float().required(),
      category: a.string().required(),
      rawExpression: a.string(),
      type: a.string().required(), // 'EXPENSE' or 'INCOME'
      financialMonthId: a.string(),
    })
    .authorization((allow) => [allow.owner()]),

  Debt: a
    .model({
      date: a.string().required(),
      type: a.string().required(), // 'RECEIVABLE' or 'PAYABLE'
      person: a.string().required(),
      amount: a.float().required(),
      rawExpression: a.string(),
      settled: a.boolean().required(),
      notes: a.string(),
      financialMonthId: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
