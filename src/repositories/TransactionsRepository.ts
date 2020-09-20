import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const balance = await this.createQueryBuilder()
      .select(['type', 'SUM(value)'])
      .groupBy('type')
      .getRawMany();

    const income = balance.find(b => b.type === 'income');
    const outcome = balance.find(b => b.type === 'outcome');

    const incomeNum = income ? Number(income.sum) : 0;
    const outcomeNum = outcome ? Number(outcome.sum) : 0;

    return {
      income: incomeNum,
      outcome: outcomeNum,
      total: incomeNum - outcomeNum,
    };
  }
}

export default TransactionsRepository;
