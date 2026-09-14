"use client";

import { useState } from "react";
import Link from "next/link";
import { Form, Input, Button, Typography, message, Card, Result } from "antd";
import { MailOutlined } from "@ant-design/icons";
import { api, ApiError } from "@/lib/api";

const { Title, Text } = Typography;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const onFinish = async (values: { email: string }) => {
    setLoading(true);
    try {
      const res = await api.post<{
        message: string;
        reset_token?: string;
      }>("/auth/forgot-password", values);

      if (res.reset_token) {
        setResetToken(res.reset_token);
      }
      setSent(true);
      message.info(res.message);
    } catch (err) {
      const detail =
        err instanceof ApiError ? err.detail : "Error al enviar solicitud";
      message.error(detail);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
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
        <Card style={{ width: "100%", maxWidth: 480 }}>
          <Result
            status="success"
            title="Solicitud enviada"
            subTitle="Si el correo existe en nuestro sistema, recibirás un enlace de recuperación."
            extra={
              resetToken ? (
                <div style={{ textAlign: "left" }}>
                  <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                    En modo desarrollo, usa este token:
                  </Text>
                  <Input.TextArea
                    value={resetToken}
                    readOnly
                    autoSize
                    style={{ fontFamily: "monospace", marginBottom: 16 }}
                  />
                  <Link href={`/reset-password?token=${resetToken}`}>
                    <Button type="primary" block>
                      Restablecer contraseña
                    </Button>
                  </Link>
                </div>
              ) : (
                <Link href="/login">
                  <Button type="primary">Volver al inicio de sesión</Button>
                </Link>
              )
            }
          />
        </Card>
      </div>
    );
  }

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
        <Title level={3} style={{ textAlign: "center", marginBottom: 8 }}>
          Recuperar contraseña
        </Title>
        <Text
          type="secondary"
          style={{ display: "block", textAlign: "center", marginBottom: 24 }}
        >
          Ingresa tu correo y te enviaremos un enlace para restablecer tu
          contraseña.
        </Text>

        <Form
          name="forgot-password"
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
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

          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
            >
              Enviar enlace
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center" }}>
          <Text type="secondary">
            <Link href="/login">Volver al inicio de sesión</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
