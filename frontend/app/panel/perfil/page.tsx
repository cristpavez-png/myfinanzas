"use client";

import { useEffect, useState } from "react";
import { Form, Input, InputNumber, Button, Typography, Card, message, Spin } from "antd";
import { UserOutlined, DollarOutlined } from "@ant-design/icons";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";

const { Title, Text } = Typography;

interface Usuario {
  id: number;
  email: string;
  ingreso_mensual: number | null;
  created_at: string;
}

export default function MiPerfil() {
  const { token } = useAuth();
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!token) return;
    api
      .get<Usuario>("/auth/me", { token })
      .then((u) => {
        setPerfil(u);
        form.setFieldsValue({
          email: u.email,
          ingreso_mensual: u.ingreso_mensual,
        });
      })
      .catch(() => {
        message.warning("No se pudo cargar tu perfil");
      })
      .finally(() => setLoading(false));
  }, [token, form]);

  const onFinish = async (values: { email?: string; ingreso_mensual?: number | null }) => {
    setSaving(true);
    try {
      await api.put("/auth/me", values, { token });
      message.success("Perfil actualizado");
    } catch (err) {
      const detail =
        err instanceof ApiError ? err.detail : "Error al actualizar perfil";
      message.error(detail);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        Mi perfil
      </Title>

      <Card style={{ maxWidth: 500 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item label="Correo electrónico" name="email">
            <Input
              prefix={<UserOutlined />}
              disabled
              style={{ color: "#000" }}
            />
          </Form.Item>

          <Form.Item
            label="Ingreso mensual"
            name="ingreso_mensual"
            tooltip="Used to distribute household debts proportionally"
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              step={10000}
              prefix={<DollarOutlined />}
              placeholder="Ej: 500000"
            />
          </Form.Item>

          <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
            Tu ingreso mensual se usa para distribuir proporcionalmente las
            deudas del hogar entre sus miembros.
          </Text>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>
              Guardar cambios
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
