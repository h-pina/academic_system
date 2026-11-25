import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicCalendar } from './entities/academic-calendar.entity';
import { Semester } from './entities/semester.entity';
import {
  CreateCalendarDto,
  CreateSemesterDto,
  ListSemestersQueryDto,
  UpdateCalendarDto,
} from './dto/calendar.dto';
import {
  CalendarDates,
  semesterFitsCalendar,
  validateCalendarDates,
} from './calendar-rules';
import { AuditService } from '../audit/audit.service';
import { isIsoDate } from '../../common/utils/schedule.util';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(AcademicCalendar)
    private readonly calendars: Repository<AcademicCalendar>,
    @InjectRepository(Semester)
    private readonly semesters: Repository<Semester>,
    private readonly audit: AuditService,
  ) {}

  listCalendars(): Promise<AcademicCalendar[]> {
    return this.calendars.find({ order: { startDate: 'DESC' } });
  }

  async getCalendar(id: number): Promise<AcademicCalendar> {
    const calendar = await this.calendars.findOneBy({ id });
    if (!calendar) throw new NotFoundException('Calendário acadêmico não encontrado');
    return calendar;
  }

  async createCalendar(dto: CreateCalendarDto, actorId: number) {
    this.assertDates(dto);
    const saved = await this.calendars.save(this.calendars.create(dto));
    await this.audit.log(actorId, 'calendar.create', 'academic_calendar', saved.id, { ...dto });
    return saved;
  }

  async updateCalendar(id: number, dto: UpdateCalendarDto, actorId: number) {
    const calendar = await this.getCalendar(id);
    const merged = { ...calendar, ...stripUndefined(dto) };
    this.assertDates(merged);

    const children = await this.semesters.findBy({ calendarId: id });
    if (children.some((semester) => !semesterFitsCalendar(semester, merged))) {
      throw new BadRequestException(
        'O novo período deixaria semestres já implantados fora do calendário',
      );
    }
    await this.calendars.update({ id }, stripUndefined(dto));
    await this.audit.log(actorId, 'calendar.update', 'academic_calendar', id, { ...dto });
    return this.getCalendar(id);
  }

  async removeCalendar(id: number, actorId: number): Promise<void> {
    await this.getCalendar(id);
    if (await this.semesters.existsBy({ calendarId: id })) {
      throw new ConflictException('O calendário possui semestres e não pode ser excluído');
    }
    await this.calendars.delete({ id });
    await this.audit.log(actorId, 'calendar.delete', 'academic_calendar', id);
  }

  async listSemesters(query: ListSemestersQueryDto) {
    return this.semesters.find({
      where: query.status ? { status: query.status } : {},
      relations: { calendar: true },
      order: { year: 'DESC', term: 'DESC' },
    });
  }

  async getSemester(id: number): Promise<Semester> {
    const semester = await this.semesters.findOne({
      where: { id },
      relations: { calendar: true },
    });
    if (!semester) throw new NotFoundException('Semestre letivo não encontrado');
    return semester;
  }

  async createSemester(dto: CreateSemesterDto, actorId: number) {
    const calendar = await this.calendars.findOneBy({ id: dto.calendarId });
    if (!calendar) {
      throw new BadRequestException(
        'Cadastre o calendário acadêmico do período antes de criar o semestre',
      );
    }
    if (!isIsoDate(dto.startDate) || !isIsoDate(dto.endDate) || dto.startDate >= dto.endDate) {
      throw new BadRequestException('Datas do semestre inválidas ou inconsistentes');
    }
    if (!semesterFitsCalendar(dto, calendar)) {
      throw new BadRequestException('O semestre deve estar dentro do período do calendário');
    }
    if (await this.semesters.existsBy({ year: dto.year, term: dto.term })) {
      throw new ConflictException(`O semestre ${dto.year}/${dto.term} já foi implantado`);
    }
    const saved = await this.semesters.save(this.semesters.create({ ...dto, status: 'draft' }));
    await this.audit.log(actorId, 'semester.create', 'semester', saved.id, { ...dto });
    return this.getSemester(saved.id);
  }

  /** Deploys (activates) a draft semester so classes can be offered. */
  async deploy(id: number, actorId: number) {
    const semester = await this.getSemester(id);
    if (semester.status !== 'draft') {
      throw new ConflictException(
        semester.status === 'active'
          ? 'Este semestre já está implantado'
          : 'Um semestre encerrado não pode ser implantado',
      );
    }
    await this.semesters.update({ id }, { status: 'active' });
    await this.audit.log(actorId, 'semester.deploy', 'semester', id);
    return this.getSemester(id);
  }

  async close(id: number, actorId: number) {
    const semester = await this.getSemester(id);
    if (semester.status !== 'active') {
      throw new ConflictException('Somente um semestre implantado pode ser encerrado');
    }
    await this.semesters.update({ id }, { status: 'closed' });
    await this.audit.log(actorId, 'semester.close', 'semester', id);
    return this.getSemester(id);
  }

  private assertDates(dates: CalendarDates): void {
    const problems = validateCalendarDates(dates);
    if (problems.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        message: problems,
        error: 'Bad Request',
      });
    }
  }
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}
