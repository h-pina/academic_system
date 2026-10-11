"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  Pagination,
  SegmentedFilter,
  Select,
  Skeleton,
  StatTile,
  Textarea,
  Toast,
  type Column,
} from "@/components/ui";

interface Sample {
  id: number;
  name: string;
  course: string;
  status: "Ativo" | "Trancado" | "Formado";
}

const SAMPLE: Sample[] = [
  { id: 1, name: "Erin Student", course: "Computer Science", status: "Ativo" },
  { id: 2, name: "Karl Locked", course: "Computer Science", status: "Trancado" },
  { id: 3, name: "Liam Graduated", course: "Mathematics", status: "Formado" },
];

const COLUMNS: Column<Sample>[] = [
  {
    key: "name",
    header: "Aluno",
    cell: (row) => (
      <span className="flex items-center gap-3 font-medium text-slate-900">
        <Avatar name={row.name} size="sm" />
        {row.name}
      </span>
    ),
  },
  { key: "course", header: "Curso", cell: (row) => row.course },
  {
    key: "status",
    header: "Situação",
    cell: (row) => (
      <Badge
        tone={
          row.status === "Ativo"
            ? "success"
            : row.status === "Trancado"
              ? "warning"
              : "neutral"
        }
      >
        {row.status}
      </Badge>
    ),
  },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-surface shadow-card p-5">
      <h2 className="mb-4 text-base">{title}</h2>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

/** Internal catalogue of the component library. Development only. */
export default function DesignCatalogPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [page, setPage] = useState(2);

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-extrabold">Componentes</h1>
        <p className="text-sm text-slate-500">
          Catálogo interno, visível apenas em desenvolvimento. Alterne o tema no
          cabeçalho para conferir os dois modos.
        </p>
      </header>

      <Section title="Botões">
        <Button icon={<Plus className="h-4 w-4" />}>Novo aluno</Button>
        <Button variant="secondary">Cancelar</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger" icon={<Trash2 className="h-4 w-4" />}>
          Excluir
        </Button>
        <Button loading>Salvando</Button>
        <Button disabled>Desabilitado</Button>
        <Button size="sm">Pequeno</Button>
        <Button size="lg">Grande</Button>
        <IconButton label="Editar">
          <Pencil className="h-4 w-4" />
        </IconButton>
        <IconButton label="Buscar" variant="secondary">
          <Search className="h-4 w-4" />
        </IconButton>
      </Section>

      <Section title="Campos">
        <Field label="CPF" hint="Somente números" required className="w-64">
          {(control) => <Input {...control} placeholder="000.000.000-00" />}
        </Field>
        <Field label="Nome" error="O nome deve ter pelo menos 3 caracteres." className="w-64">
          {(control) => <Input {...control} defaultValue="Al" />}
        </Field>
        <Field label="Curso" className="w-64">
          {(control) => (
            <Select {...control}>
              <option>Computer Science (CC)</option>
              <option>Mathematics (MAT)</option>
            </Select>
          )}
        </Field>
        <Field label="Descrição" className="w-64">
          {(control) => <Textarea {...control} rows={2} />}
        </Field>
        <Field label="Desabilitado" className="w-64">
          {(control) => <Input {...control} disabled defaultValue="Somente leitura" />}
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox defaultChecked /> Disciplina obrigatória
        </label>
      </Section>

      <Section title="Indicadores e situações">
        <StatTile label="Alunos ativos" value={4} tone="blue" className="w-44" />
        <StatTile label="Professores" value={4} tone="coral" className="w-44" />
        <StatTile label="Cursos ativos" value={2} tone="sun" className="w-44" />
        <StatTile label="Disciplinas" value={12} tone="mint" hint="em 2 matrizes" className="w-44" />
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="success">Ativo</Badge>
          <Badge tone="warning">Trancado</Badge>
          <Badge tone="danger">Desligado</Badge>
          <Badge tone="neutral">Formado</Badge>
          <Badge tone="brand">Administrador</Badge>
          <Avatar name="Erin Student" />
          <Avatar name="Karl Locked" />
          <Avatar name="Liam Graduated" />
          <Avatar name="Judy Student" size="lg" />
        </div>
      </Section>

      <Section title="Filtro segmentado">
        <SegmentedFilter
          label="Situação"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Todos", count: 6 },
            { value: "active", label: "Ativos", count: 4 },
            { value: "locked", label: "Trancados", count: 1 },
            { value: "graduated", label: "Formados", count: 1 },
          ]}
        />
      </Section>

      <section className="rounded-xl border border-slate-200 bg-surface shadow-card overflow-hidden">
        <h2 className="px-5 pt-5 text-base">Tabela</h2>
        <div className="p-2">
          <DataTable
            caption="Alunos de exemplo"
            columns={COLUMNS}
            rows={SAMPLE}
            getRowKey={(row) => row.id}
            onRowClick={() => setModal(true)}
          />
        </div>
        <Pagination page={page} pageSize={20} total={45} onChange={setPage} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-surface shadow-card overflow-hidden">
        <h2 className="px-5 pt-5 text-base">Tabela carregando e vazia</h2>
        <div className="grid gap-4 p-2 md:grid-cols-2">
          <DataTable caption="Carregando" columns={COLUMNS} rows={[]} loading skeletonRows={3} getRowKey={(row) => row.id} />
          <DataTable
            caption="Vazia"
            columns={COLUMNS}
            rows={[]}
            getRowKey={(row) => row.id}
            empty={
              <EmptyState
                icon={<Search className="h-5 w-5" />}
                title="Nenhum aluno encontrado"
                description="Limpe os filtros ou cadastre um novo aluno."
                action={<Button size="sm">Novo aluno</Button>}
              />
            }
          />
        </div>
      </section>

      <Section title="Avisos">
        <Toast type="SUCCESS" messages={["Aluno cadastrado."]} onDismiss={() => {}} />
        <Toast type="WARNING" messages={["A disciplina foi salva, mas os pré-requisitos não foram aplicados."]} onDismiss={() => {}} />
        <Toast type="ERROR" messages={["Já existe um usuário com este CPF."]} onDismiss={() => {}} />
      </Section>

      <Section title="Carregamento e diálogos">
        <div className="w-64 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Button variant="secondary" onClick={() => setModal(true)}>
          Abrir modal
        </Button>
        <Button variant="danger" onClick={() => setConfirm(true)}>
          Abrir confirmação
        </Button>
      </Section>

      <Modal
        open={modal}
        onOpenChange={setModal}
        title="Novo aluno"
        description="Preencha os dados do aluno."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setModal(false)}>Cadastrar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nome" required>
            {(control) => <Input {...control} />}
          </Field>
          <Field label="E-mail" required>
            {(control) => <Input {...control} type="email" />}
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm}
        title="Excluir curso"
        message="A matriz curricular do curso também será excluída. Esta ação não pode ser desfeita."
        onConfirm={() => setConfirm(false)}
        onClose={() => setConfirm(false)}
      />
    </div>
  );
}
