"use client";

import { useEffect, useState } from "react";
import { Form, Input, InputNumber, Button, Typography, Card, message } from "antd";
import { UserOutlined, MailOutlined, DollarOutlined } from "@ant-design/icons";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";

const { Title, Text } = Typography;

interface PerfilFormValues {
  nombre: string;
  email: string;
  ingreso_mensual: number | null;
}

export default function MiPerfil() {
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<PerfilFormValues>();

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        nombre: user.nombre,
        email: user.email,
        ingreso_mensual: user.ingreso_mensual,
      });
    }
  }, [user, form]);

  const onFinish = async (values: PerfilFormValues) => {
    setSaving(true);
    try {
      await api.put("/usuarios/me", {
        ingreso_mensual: values.ingreso_mensual ?? null,
      });
      await refreshUser();
      message.success("Perfil actualizado");
    } catch (err) {
      const detail =
        err instanceof ApiError ? err.detail : "Error al actualizar perfil";
      message.error(detail);
    } finally {
      setSaving(false);
    }
  };

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
          <Form.Item label="Nombre" name="nombre">
            <Input prefix={<UserOutlined />} disabled style={{ color: "#000" }} />
          </Form.Item>

          <Form.Item label="Correo electrónico" name="email">
            <Input prefix={<MailOutlined />} disabled style={{ color: "#000" }} />
          </Form.Item>

          <Form.Item
            label="Ingreso mensual"
            name="ingreso_mensual"
            tooltip="Se usa para distribuir proporcionalmente las deudas del hogar"
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
