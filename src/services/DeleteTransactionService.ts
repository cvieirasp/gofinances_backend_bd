import { getRepository } from 'typeorm';

import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    const transactionRepository = getRepository(Transaction);
    const transaction = await transactionRepository.findOne(id);

    if (!transaction) {
      throw new AppError('there is no transaction with specified id');
    }

    await transactionRepository.delete(id);
  }
}

export default DeleteTransactionService;
