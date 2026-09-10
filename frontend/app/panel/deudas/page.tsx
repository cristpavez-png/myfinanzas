"use client";

import { useEffect, useState, useCallback } from "react";
import {
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
  Typography,
  message,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { api, ApiError } from "@/lib/api";

const { Title } = Typography;

/* ── Enums (matching backend) ─────────────────────────── */

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

/* ── Types ────────────────────────────────────────────── */

interface Deuda {
  id: number;
  descripcion: string;
  categoria: string;
  monto_total: number;
  num_cuotas: number | null;
  fecha_vencimiento: string;
  estado: string;
}

interface DeudaFormValues {
  descripcion: string;
  categoria: string;
  monto_total: number;
  num_cuotas?: number | null;
  fecha_vencimiento: dayjs.Dayjs;
  estado: string;
}

/* ── Component ────────────────────────────────────────── */

export default function MisDeudas() {
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Deuda | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<DeudaFormValues>();

  // El estado inicial de loading ya es true; en refetches posteriores la
  // tabla mantiene los datos actuales mientras llega la respuesta.
  const fetchDeudas = useCallback(() => {
    api
      .get<Deuda[]>("/deudas")
      .then(setDeudas)
      .catch(() => message.error("Error al cargar deudas"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDeudas();
  }, [fetchDeudas]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      estado: "pendiente",
      num_cuotas: 1,
    });
    setModalOpen(true);
  };

  const openEdit = (deuda: Deuda) => {
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
      const values = await form.validateFields();
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
        await api.put(`/deudas/${editing.id}`, payload);
        message.success("Deuda actualizada");
      } else {
        await api.post("/deudas", payload);
        message.success("Deuda creada");
      }

      setModalOpen(false);
      fetchDeudas();
    } catch (err) {
      if (err instanceof ApiError) {
        message.error(err.detail);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/deudas/${id}`);
      message.success("Deuda eliminada");
      fetchDeudas();
    } catch (err) {
      if (err instanceof ApiError) {
        message.error(err.detail);
      }
    }
  };

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
      render: (v: number) => `$${v.toLocaleString("es-CL")}`,
    },
    {
      title: "Cuotas",
      dataIndex: "num_cuotas",
      key: "num_cuotas",
      align: "center" as const,
      render: (v: number | null) => v ?? "—",
    },
    {
      title: "Vencimiento",
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
      render: (_: unknown, record: Deuda) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          />
          <Popconfirm
            title="¿Eliminar esta deuda?"
            onConfirm={() => handleDelete(record.id)}
            okText="Eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Mis deudas
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Nueva deuda
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={deudas}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: 700 }}
      />

      <Modal
        title={editing ? "Editar deuda" : "Nueva deuda"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        okText={editing ? "Guardar" : "Crear"}
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            estado: "pendiente",
            num_cuotas: 1,
          }}
        >
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
            <Select
              placeholder="Selecciona categoría"
              options={[...CATEGORIAS]}
            />
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

          <Form.Item
            name="num_cuotas"
            label="Número de cuotas"
          >
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
