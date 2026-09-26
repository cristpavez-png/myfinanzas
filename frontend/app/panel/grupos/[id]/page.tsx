"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Tag,
  Popconfirm,
  Space,
  Spin,
  Result,
  Statistic,
  Empty,
  Typography,
  message,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserAddOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const { Title, Text } = Typography;

const fmt = (v: number) => `$${v.toLocaleString("es-CL")}`;

const CATEGORIAS = [
  { value: "arriendo", label: "Arriendo" },
  { value: "servicios", label: "Servicios" },
  { value: "tarjeta_credito", label: "Tarjeta de crédito" },
  { value: "transporte", label: "Transporte" },
  { value: "comida", label: "Comida" },
  { value: "salud", label: "Salud" },
  { value: "educacion", label: "Educación" },
  { value: "otros", label: "Otros" },
] as const;

const ESTADO_COLORS: Record<string, string> = {
  pendiente: "warning",
  pagada: "success",
};

const CATEGORIA_COLORS: Record<string, string> = {
  arriendo: "blue",
  servicios: "cyan",
  tarjeta_credito: "purple",
  transporte: "geekblue",
  comida: "orange",
  salud: "red",
  educacion: "green",
  otros: "default",
};

interface Miembro {
  id: number;
  grupo_id: number;
  usuario_id: number | null;
  email: string | null;
  nombre: string | null;
  ingreso_mensual: number;
  es_propietario: boolean;
  created_at: string;
}

interface DeudaHogar {
  id: number;
  grupo_id: number;
  creada_por: number;
  descripcion: string;
  categoria: string;
  monto_total: number;
  num_cuotas: number | null;
  fecha_vencimiento: string;
  estado: string;
  created_at: string;
}

interface Grupo {
  id: number;
  nombre: string;
  propietario_id: number;
  created_at: string;
  updated_at: string;
  miembros: Miembro[];
  deudas_hogar: DeudaHogar[];
}

interface AporteMiembro {
  miembro_id: number;
  nombre: string;
  ingreso_mensual: number;
  porcentaje: number;
  aporte: number;
}

interface DistribucionDeuda {
  deuda_id: number;
  descripcion: string;
  monto_total: number;
  aportes: AporteMiembro[];
}

interface TotalMiembro {
  miembro_id: number;
  nombre: string;
  ingreso_mensual: number;
  porcentaje: number;
  total: number;
}

interface DistribucionOut {
  grupo_id: number;
  total_deudas: number;
  miembros: TotalMiembro[];
  por_deuda: DistribucionDeuda[];
}

export default function DetalleGrupo() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const grupoId = Number(params.id);
  const { user } = useAuth();

  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("miembros");
  const [dist, setDist] = useState<DistribucionOut | null>(null);

  const fetchGrupo = useCallback(() => {
    api
      .get<Grupo>(`/grupos/${grupoId}`)
      .then(setGrupo)
      .catch((err) => {
        if (err instanceof ApiError) message.error(err.detail);
      })
      .finally(() => setLoading(false));
  }, [grupoId]);

  useEffect(() => {
    fetchGrupo();
  }, [fetchGrupo]);

  useEffect(() => {
    if (tab === "distribucion") {
      let cancelled = false;
      api
        .get<DistribucionOut>(`/grupos/${grupoId}/distribucion`)
        .then((d) => {
          if (!cancelled) setDist(d);
        })
        .catch((err) => {
          if (!cancelled && err instanceof ApiError) message.error(err.detail);
        });
      return () => {
        cancelled = true;
      };
    }
    return undefined;
  }, [tab, grupoId]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!grupo) {
    return (
      <Result
        status="404"
        title="Grupo no encontrado"
        extra={
          <Button onClick={() => router.push("/panel/grupos")}>
            Volver a mis grupos
          </Button>
        }
      />
    );
  }

  const canManage = user?.id === grupo.propietario_id;

  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/panel/grupos")}>
          Volver
        </Button>
      </Space>
      <GroupHeader
        grupo={grupo}
        canManage={canManage}
        onChanged={fetchGrupo}
        onDeleted={() => router.push("/panel/grupos")}
      />

      <Tabs
        activeKey={tab}
        onChange={(key) => {
          setTab(key);
          if (key !== "distribucion") setDist(null);
        }}
        items={[
          {
            key: "miembros",
            label: `Miembros (${grupo.miembros.length})`,
            children: (
              <MiembrosTab
                grupo={grupo}
                canManage={canManage}
                user={user}
                onChanged={fetchGrupo}
              />
            ),
          },
          {
            key: "deudas",
            label: `Deudas (${grupo.deudas_hogar.length})`,
            children: (
              <DeudasTab
                grupo={grupo}
                canManage={canManage}
                user={user}
                onChanged={fetchGrupo}
              />
            ),
          },
          {
            key: "distribucion",
            label: "Distribución",
            children: (
              <DistribucionTab
                dist={dist}
                loading={tab === "distribucion" && dist === null}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

function GroupHeader({
  grupo,
  canManage,
  onChanged,
  onDeleted,
}: {
  grupo: Grupo;
  canManage: boolean;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<{ nombre: string }>();

  const handleRename = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await api.put(`/grupos/${grupo.id}`, { nombre: values.nombre });
      message.success("Grupo actualizado");
      setModalOpen(false);
      onChanged();
    } catch (err) {
      if (err instanceof ApiError) message.error(err.detail);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/grupos/${grupo.id}`);
      message.success("Grupo eliminado");
      onDeleted();
    } catch (err) {
      if (err instanceof ApiError) message.error(err.detail);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      <Space>
        <Title level={3} style={{ margin: 0 }}>
          {grupo.nombre}
        </Title>
        {canManage && (
          <Tag color="geekblue">Eres el propietario</Tag>
        )}
      </Space>
      {canManage && (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              form.setFieldsValue({ nombre: grupo.nombre });
              setModalOpen(true);
            }}
          >
            Renombrar
          </Button>
          <Popconfirm
            title="¿Eliminar este grupo?"
            description="Se eliminarán sus miembros y deudas."
            onConfirm={handleDelete}
            okText="Eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      )}

      <Modal
        title="Renombrar grupo"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleRename}
        confirmLoading={submitting}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: "Ingresa un nombre" }]}
          >
            <Input maxLength={100} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function MiembrosTab({
  grupo,
  canManage,
  user,
  onChanged,
}: {
  grupo: Grupo;
  canManage: boolean;
  user: { id: number } | null;
  onChanged: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<Miembro | null>(null);
  const [form] = Form.useForm();
  const tipo = Form.useWatch("tipo", form) as "registrada" | "manual" | undefined;

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ tipo: "manual" });
    setModalOpen(true);
  };

  const openEditIngreso = (miembro: Miembro) => {
    setEditing(miembro);
    form.resetFields();
    form.setFieldsValue({ ingreso_mensual: miembro.ingreso_mensual });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (editing) {
        await api.put(`/grupos/${grupo.id}/miembros/${editing.id}`, {
          ingreso_mensual: values.ingreso_mensual,
        });
        message.success("Ingreso actualizado");
      } else if (values.tipo === "manual") {
        await api.post(`/grupos/${grupo.id}/miembros`, {
          nombre: values.nombre,
          ingreso_mensual: values.ingreso_mensual,
        });
        message.success("Miembro agregado");
      } else {
        await api.post(`/grupos/${grupo.id}/miembros`, {
          email: values.email,
          ingreso_mensual: values.ingreso_mensual ?? null,
        });
        message.success("Miembro invitado");
      }

      setModalOpen(false);
      onChanged();
    } catch (err) {
      if (err instanceof ApiError) message.error(err.detail);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (miembro: Miembro) => {
    try {
      await api.delete(`/grupos/${grupo.id}/miembros/${miembro.id}`);
      message.success("Miembro eliminado");
      onChanged();
    } catch (err) {
      if (err instanceof ApiError) message.error(err.detail);
    }
  };

  const columns = [
    {
      title: "Nombre",
      key: "nombre",
      render: (_: unknown, m: Miembro) => (
        <Space direction="vertical" size={0}>
          <Text strong>{m.nombre ?? "—"}</Text>
          {m.email && <Text type="secondary">{m.email}</Text>}
        </Space>
      ),
    },
    {
      title: "Tipo",
      key: "tipo",
      render: (_: unknown, m: Miembro) =>
        m.es_propietario ? (
          <Tag color="geekblue">Propietario</Tag>
        ) : m.usuario_id !== null ? (
          <Tag color="cyan">Registrado</Tag>
        ) : (
          <Tag>Manual</Tag>
        ),
    },
    {
      title: "Ingreso mensual",
      dataIndex: "ingreso_mensual",
      key: "ingreso_mensual",
      align: "right" as const,
      render: (v: number) => fmt(v),
    },
    {
      title: "Acciones",
      key: "acciones",
      align: "center" as const,
      width: 140,
      render: (_: unknown, m: Miembro) => {
        const canEdit = canManage || m.usuario_id === user?.id;
        return (
          <Space>
            {canEdit && (
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => openEditIngreso(m)}
              />
            )}
            {canManage && !m.es_propietario && (
              <Popconfirm
                title="¿Eliminar este miembro?"
                onConfirm={() => handleDelete(m)}
                okText="Eliminar"
                cancelText="Cancelar"
                okButtonProps={{ danger: true }}
              >
                <Button type="link" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      {canManage && (
        <Button
          type="primary"
          icon={<UserAddOutlined />}
          onClick={openAdd}
          style={{ marginBottom: 16 }}
        >
          Agregar miembro
        </Button>
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={grupo.miembros}
        pagination={false}
      />

      <Modal
        title={editing ? "Editar ingreso mensual" : "Agregar miembro"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        okText={editing ? "Guardar" : "Agregar"}
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          {!editing && (
            <>
              <Form.Item
                name="tipo"
                label="Tipo de miembro"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: "manual", label: "Persona manual (sin cuenta)" },
                    { value: "registrada", label: "Usuario registrado" },
                  ]}
                />
              </Form.Item>

              {tipo === "registrada" ? (
                <Form.Item
                  name="email"
                  label="Email del usuario"
                  dependencies={["tipo"]}
                  rules={[
                    { required: true, message: "Ingresa un email" },
                    { type: "email", message: "Email inválido" },
                  ]}
                >
                  <Input placeholder="usuario@correo.cl" />
                </Form.Item>
              ) : (
                <Form.Item
                  name="nombre"
                  label="Nombre"
                  dependencies={["tipo"]}
                  rules={[
                    { required: true, message: "Ingresa un nombre" },
                    { max: 100, message: "Máximo 100 caracteres" },
                  ]}
                >
                  <Input placeholder="Ej: Pedro" />
                </Form.Item>
              )}
            </>
          )}

          <Form.Item
            name="ingreso_mensual"
            label="Ingreso mensual"
            dependencies={["tipo"]}
            extra={
              !editing && tipo === "registrada"
                ? "Opcional: si lo dejas vacío se usará el del perfil."
                : undefined
            }
            rules={
              (tipo === "manual" || editing
                ? [{ required: true, message: "Ingresa el ingreso mensual" }]
                : []) as never
            }
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0.01}
              step={10000}
              prefix="$"
              placeholder="0"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function DeudasTab({
  grupo,
  canManage,
  user,
  onChanged,
}: {
  grupo: Grupo;
  canManage: boolean;
  user: { id: number } | null;
  onChanged: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<DeudaHogar | null>(null);
  const [form] = Form.useForm();

  interface DeudaFormValues {
    descripcion: string;
    categoria: string;
    monto_total: number;
    num_cuotas?: number | null;
    fecha_vencimiento: dayjs.Dayjs;
    estado: string;
  }

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ estado: "pendiente", num_cuotas: 1 });
    setModalOpen(true);
  };

  const openEdit = (deuda: DeudaHogar) => {
    setEditing(deuda);
    form.setFieldsValue({
      descripcion: deuda.descripcion,
      categoria: deuda.categoria,
      monto_total: deuda.monto_total,
      num_cuotas: deuda.num_cuotas ?? 1,
      fecha_vencimiento: dayjs(deuda.fecha_vencimiento),
      estado: deuda.estado,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = (await form.validateFields()) as DeudaFormValues;
      setSubmitting(true);
      const payload = {
        descripcion: values.descripcion,
        categoria: values.categoria,
        monto_total: values.monto_total,
        num_cuotas: values.num_cuotas ?? 1,
        fecha_vencimiento: values.fecha_vencimiento.format("YYYY-MM-DD"),
        estado: values.estado,
      };

      if (editing) {
        await api.put(`/grupos/${grupo.id}/deudas/${editing.id}`, payload);
        message.success("Deuda actualizada");
      } else {
        await api.post(`/grupos/${grupo.id}/deudas`, payload);
        message.success("Deuda creada");
      }

      setModalOpen(false);
      onChanged();
    } catch (err) {
      if (err instanceof ApiError) message.error(err.detail);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (deuda: DeudaHogar) => {
    try {
      await api.delete(`/grupos/${grupo.id}/deudas/${deuda.id}`);
      message.success("Deuda eliminada");
      onChanged();
    } catch (err) {
      if (err instanceof ApiError) message.error(err.detail);
    }
  };

  const canEditDeuda = (deuda: DeudaHogar) =>
    canManage || deuda.creada_por === user?.id;

  const columns = [
    {
      title: "Descripción",
      dataIndex: "descripcion",
      key: "descripcion",
      ellipsis: true,
    },
    {
      title: "Categoría",
      dataIndex: "categoria",
      key: "categoria",
      render: (cat: string) => (
        <Tag color={CATEGORIA_COLORS[cat] ?? "default"}>
          {CATEGORIAS.find((c) => c.value === cat)?.label ?? cat}
        </Tag>
      ),
    },
    {
      title: "Monto",
      dataIndex: "monto_total",
      key: "monto_total",
      align: "right" as const,
      render: (v: number) => fmt(v),
    },
    {
      title: "Vence",
      dataIndex: "fecha_vencimiento",
      key: "fecha_vencimiento",
      render: (d: string) => dayjs(d).format("DD/MM/YYYY"),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      render: (e: string) => (
        <Tag color={ESTADO_COLORS[e] ?? "default"}>
          {e === "pendiente" ? "Pendiente" : "Pagada"}
        </Tag>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      align: "center" as const,
      width: 120,
      render: (_: unknown, deuda: DeudaHogar) => {
        if (!canEditDeuda(deuda)) return null;
        return (
          <Space>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => openEdit(deuda)}
            />
            <Popconfirm
              title="¿Eliminar esta deuda?"
              onConfirm={() => handleDelete(deuda)}
              okText="Eliminar"
              cancelText="Cancelar"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={openCreate}
        style={{ marginBottom: 16 }}
      >
        Nueva deuda del hogar
      </Button>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={grupo.deudas_hogar}
        pagination={false}
        scroll={{ x: 700 }}
      />

      <Modal
        title={editing ? "Editar deuda" : "Nueva deuda del hogar"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        okText={editing ? "Guardar" : "Crear"}
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="descripcion"
            label="Descripción"
            rules={[
              { required: true, message: "Ingresa una descripción" },
              { max: 255, message: "Máximo 255 caracteres" },
            ]}
          >
            <Input placeholder="Ej: Arriendo departamento" />
          </Form.Item>

          <Form.Item
            name="categoria"
            label="Categoría"
            rules={[{ required: true, message: "Selecciona una categoría" }]}
          >
            <Select placeholder="Selecciona categoría" options={[...CATEGORIAS]} />
          </Form.Item>

          <Form.Item
            name="monto_total"
            label="Monto total"
            rules={[
              { required: true, message: "Ingresa el monto" },
              { type: "number", min: 0.01, message: "Debe ser mayor a 0" },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0.01}
              step={1000}
              prefix="$"
              placeholder="0"
            />
          </Form.Item>

          <Form.Item name="num_cuotas" label="Número de cuotas">
            <InputNumber style={{ width: "100%" }} min={1} max={120} />
          </Form.Item>

          <Form.Item
            name="fecha_vencimiento"
            label="Fecha de vencimiento"
            rules={[{ required: true, message: "Selecciona una fecha" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item
            name="estado"
            label="Estado"
            rules={[{ required: true, message: "Selecciona un estado" }]}
          >
            <Select
              options={[
                { value: "pendiente", label: "Pendiente" },
                { value: "pagada", label: "Pagada" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function DistribucionTab({
  dist,
  loading,
}: {
  dist: DistribucionOut | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!dist) return null;

  if (dist.total_deudas <= 0) {
    return (
      <Empty description="No hay deudas pendientes para distribuir" />
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Statistic title="Total a distribuir" value={dist.total_deudas} precision={0} prefix="$" />

      <div>
        <Title level={5}>Total por miembro</Title>
        <Table
          rowKey="miembro_id"
          dataSource={dist.miembros}
          pagination={false}
          columns={[
            {
              title: "Miembro",
              dataIndex: "nombre",
              key: "nombre",
            },
            {
              title: "Ingreso mensual",
              dataIndex: "ingreso_mensual",
              key: "ingreso_mensual",
              align: "right" as const,
              render: (v: number) => fmt(v),
            },
            {
              title: "Parte del total",
              dataIndex: "porcentaje",
              key: "porcentaje",
              align: "right" as const,
              render: (v: number) => `${v.toFixed(2)}%`,
            },
            {
              title: "Aporte",
              dataIndex: "total",
              key: "total",
              align: "right" as const,
              render: (v: number) => (
                <Text strong>{fmt(v)}</Text>
              ),
            },
          ]}
        />
      </div>

      <div>
        <Title level={5}>Desglose por deuda</Title>
        <Table
          rowKey="deuda_id"
          dataSource={dist.por_deuda}
          pagination={false}
          columns={[
            {
              title: "Deuda",
              dataIndex: "descripcion",
              key: "descripcion",
            },
            {
              title: "Monto",
              dataIndex: "monto_total",
              key: "monto_total",
              align: "right" as const,
              render: (v: number) => fmt(v),
            },
          ]}
          expandable={{
            expandedRowRender: (row: DistribucionDeuda) => (
              <Table
                rowKey="miembro_id"
                size="small"
                dataSource={row.aportes}
                pagination={false}
                columns={[
                  {
                    title: "Miembro",
                    dataIndex: "nombre",
                    key: "nombre",
                  },
                  {
                    title: "Porcentaje",
                    dataIndex: "porcentaje",
                    key: "porcentaje",
                    align: "right" as const,
                    render: (v: number) => `${v.toFixed(2)}%`,
                  },
                  {
                    title: "Aporte",
                    dataIndex: "aporte",
                    key: "aporte",
                    align: "right" as const,
                    render: (v: number) => fmt(v),
                  },
                ]}
              />
            ),
          }}
        />
      </div>
    </Space>
  );
}