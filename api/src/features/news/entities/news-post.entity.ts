import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClassGroup } from '../../classes/entities/class-group.entity';

/** News or notice; with no class it is addressed to the whole institution. */
@Entity('news_posts')
@Index('IDX_news_posts_class', ['classId'])
export class NewsPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'author_id', type: 'integer' })
  authorId: number;

  @Column({ name: 'class_id', type: 'integer', nullable: true })
  classId: number | null;

  @ManyToOne(() => ClassGroup, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'class_id' })
  classGroup: ClassGroup | null;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'varchar', length: 4000 })
  body: string;

  @Column({ name: 'published_at', type: 'varchar', length: 30 })
  publishedAt: string;

  @Column({ name: 'updated_at', type: 'varchar', length: 30 })
  updatedAt: string;
}
