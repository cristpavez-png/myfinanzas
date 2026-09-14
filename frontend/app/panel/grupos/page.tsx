"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Tag,
  Popconfirm,
  Space,
  Typography,
  message,
} from "antd";
import {
  PlusOutlined,
  EyeOutlined,
  DeleteOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { api, ApiError } from "@/lib/api";

const { Title, Text } = Typography;

interface GrupoResumen {
  id: number;
  nombre: string;
  propietario_id: number;
  es_propietario: boolean;
  n_miembros: number;
  total_pendiente: number;
  created_at: string;
}

interface GrupoFormValues {
  nombre: string;
  ingreso_mensual?: number;
}

const fmt = (v: number) => `$${v.toLocaleString("es-CL")}`;

export default function MisGrupos() {
  const router = useRouter();
  const [grupos, setGrupos] = useState<GrupoResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<GrupoFormValues>();

  const fetchGrupos = useCallback(() => {
    api
      .get<GrupoResumen[]>("/grupos")
      .then(setGrupos)
      .catch(() => message.error("Error al cargar grupos"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchGrupos();
  }, [fetchGrupos]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await api.post("/grupos", {
        nombre: values.nombre,
        ingreso_mensual: values.ingreso_mensual ?? null,
      });
      message.success("Grupo creado");
      setModalOpen(false);
      form.resetFields();
      fetchGrupos();
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
      await api.delete(`/grupos/${id}`);
      message.success("Grupo eliminado");
      fetchGrupos();
    } catch (err) {
      if (err instanceof ApiError) {
        message.error(err.detail);
      }
    }
  };

  const columns = [
    {
      title: "Nombre",
      dataIndex: "nombre",
      key: "nombre",
      render: (nombre: string, record: GrupoResumen) => (
        <Space>
          <TeamOutlined style={{ color: "#1677ff" }} />
          <Text strong>{nombre}</Text>
          {record.es_propietario ? (
            <Tag color="geekblue">Propietario</Tag>
          ) : (
            <Tag>Miembro</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Miembros",
      dataIndex: "n_miembros",
      key: "n_miembros",
      align: "center" as const,
    },
    {
      title: "Deudas pendientes",
      dataIndex: "total_pendiente",
      key: "total_pendiente",
      align: "right" as const,
      render: (v: number) =>
        v > 0 ? (
          <Text strong>{fmt(v)}</Text>
        ) : (
          <Text type="secondary">$0</Text>
        ),
    },
    {
      title: "Acciones",
      key: "acciones",
      align: "center" as const,
      width: 140,
      render: (_: unknown, record: GrupoResumen) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/panel/grupos/${record.id}`)}
          >
            Ver
          </Button>
          {record.es_propietario && (
            <Popconfirm
              title="¿Eliminar este grupo?"
              description="Se eliminarán sus miembros y deudas."
              onConfirm={() => handleDelete(record.id)}
              okText="Eliminar"
              cancelText="Cancelar"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
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
          Mis grupos
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Nuevo grupo
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={grupos}
        loading={loading}
        pagination={false}
        locale={{ emptyText: "Aún no tienes grupos. Crea uno para compartir gastos." }}
      />

      <Modal
        title="Nuevo grupo"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleCreate}
        confirmLoading={submitting}
        okText="Crear"
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="nombre"
            label="Nombre del grupo"
            rules={[{ required: true, message: "Ingresa un nombre" }]}
          >
            <Input placeholder="Ej: Hogar Duoc" maxLength={100} />
          </Form.Item>
          <Form.Item
            name="ingreso_mensual"
            label="Tu ingreso mensual"
            extra="Opcional: si lo dejas vacío se usará el de tu perfil."
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