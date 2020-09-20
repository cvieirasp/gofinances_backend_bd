import { getRepository, getCustomRepository } from 'typeorm';

import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  categoryTitle: string;
}

class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    categoryTitle,
  }: Request): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    if (type !== 'income' && type !== 'outcome') {
      throw new AppError('type must be income or outcome');
    }

    // Valida se possui saldo suficiente.
    if (type === 'outcome') {
      const { total } = await transactionRepository.getBalance();
      if (value > total) {
        throw new AppError('outcome is more than total in account');
      }
    }

    let category: Category;
    // Verifica se já existe categoria.
    category = await categoryRepository.findOne({
      where: { title: categoryTitle },
    });

    // Caso não exista, cria um novo registro
    if (!category) {
      category = categoryRepository.create({
        title: categoryTitle,
      });

      await categoryRepository.save(category);
    }

    const transaction = transactionRepository.create({
      title,
      type,
      value,
      category,
    });

    await transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
