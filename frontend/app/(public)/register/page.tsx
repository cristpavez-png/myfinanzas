"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Typography, message, Card } from "antd";
import { UserOutlined, MailOutlined, LockOutlined } from "@ant-design/icons";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

const { Title, Text } = Typography;

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: {
    nombre: string;
    email: string;
    password: string;
  }) => {
    setLoading(true);
    try {
      await register(values);
      message.success("Cuenta creada correctamente. Ahora inicia sesión.");
      router.push("/login");
    } catch (err) {
      const detail =
        err instanceof ApiError ? err.detail : "Error al registrar";
      message.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0f2f5",
        padding: 24,
      }}
    >
      <Card style={{ width: "100%", maxWidth: 400 }}>
        <Title level={3} style={{ textAlign: "center", marginBottom: 32 }}>
          Crear cuenta
        </Title>

        <Form
          name="register"
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[
              { required: true, message: "Ingresa tu nombre" },
              { min: 2, message: "Mínimo 2 caracteres" },
              { max: 100, message: "Máximo 100 caracteres" },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Tu nombre"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Correo electrónico"
            rules={[
              { required: true, message: "Ingresa tu correo electrónico" },
              { type: "email", message: "Ingresa un correo válido" },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="correo@ejemplo.com"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Contraseña"
            rules={[
              { required: true, message: "Ingresa una contraseña" },
              { min: 8, message: "Mínimo 8 caracteres" },
              { max: 128, message: "Máximo 128 caracteres" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Mínimo 8 caracteres"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirmar contraseña"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Confirma tu contraseña" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Las contraseñas no coinciden"));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Repite tu contraseña"
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
            >
              Registrarse
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center" }}>
          <Text type="secondary">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login">Inicia sesión</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
