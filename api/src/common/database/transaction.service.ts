import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

/**
 * Runs units of work in database transactions, one at a time.
 *
 * SQLite uses a single connection, so two overlapping `dataSource.transaction`
 * calls would try to nest on it. Queuing them keeps every write transaction
 * atomic and isolated, which is what person + profile creation relies on.
 */
@Injectable()
export class TransactionService {
  private tail: Promise<unknown> = Promise.resolve();

  constructor(private readonly dataSource: DataSource) {}

  run<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    const result = this.tail.then(() => this.dataSource.transaction(work));
    this.tail = result.catch(() => undefined);
    return result;
  }
}
