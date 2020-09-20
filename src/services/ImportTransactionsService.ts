import { getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import uploadConfig from '../config/upload';

interface Line {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  categoryTitle: string;
}

class ImportTransactionsService {
  async execute(file: string): Promise<Transaction[]> {
    const csvFilePath = path.resolve(uploadConfig.directory, file);
    const readCSVStream = fs.createReadStream(csvFilePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);
    const transactions: Line[] = [];
    const categories: string[] = [];

    parseCSV.on('data', line => {
      const [title, type, value, categoryTitle] = line;
      categories.push(categoryTitle);
      transactions.push({ title, type, value, categoryTitle });
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    // Retorna categorias registradas no Banco de Dados com mesmo título.
    const categoryRepository = getRepository(Category);
    const registeredCategories = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });

    const registeredTitles = registeredCategories.map(
      (cat: Category) => cat.title,
    );

    // Filtra somente categorias que devem ser registradas no Banco de Dados.
    const categoryToRegister = categories
      .filter(cat => !registeredTitles.includes(cat))
      .filter((value, index, self) => self.indexOf(value) === index);

    // Registra categorias no Banco de Dados.
    const newCategories = categoryRepository.create(
      categoryToRegister.map(title => ({
        title,
      })),
    );

    await categoryRepository.save(newCategories);

    const allCategories = [...newCategories, ...registeredCategories];

    // Criação das Transações.
    const transactionRepository = getRepository(Transaction);
    const criationTransactions = transactionRepository.create(
      transactions.map(line => ({
        title: line.title,
        type: line.type,
        value: line.value,
        category: allCategories.find(cat => cat.title === line.categoryTitle),
      })),
    );

    await transactionRepository.save(criationTransactions);

    await fs.promises.unlink(csvFilePath);

    return criationTransactions;
  }
}

export default ImportTransactionsService;
