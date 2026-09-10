"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Form, Input, Button, Typography, message, Card, Result, Spin } from "antd";
import { LockOutlined, KeyOutlined } from "@ant-design/icons";
import { api, ApiError } from "@/lib/api";

const { Title, Text } = Typography;

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenFromUrl = searchParams.get("token") ?? "";

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onFinish = async (values: { new_password: string }) => {
    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        token: tokenFromUrl,
        new_password: values.new_password,
      });
      setDone(true);
      message.success("Contraseña actualizada correctamente");
    } catch (err) {
      const detail =
        err instanceof ApiError ? err.detail : "Error al restablecer contraseña";
      message.error(detail);
    } finally {
      setLoading(false);
    }
  };

  if (!tokenFromUrl) {
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
          <Result
            status="warning"
            title="Token no encontrado"
            subTitle="No se proporcionó un token de recuperación válido."
            extra={
              <Link href="/forgot-password">
                <Button type="primary">Solicitar nuevo enlace</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  if (done) {
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
          <Result
            status="success"
            title="Contraseña actualizada"
            subTitle="Ya puedes iniciar sesión con tu nueva contraseña."
            extra={
              <Button type="primary" onClick={() => router.push("/login")}>
                Ir a iniciar sesión
              </Button>
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
          Restablecer contraseña
        </Title>
        <Text
          type="secondary"
          style={{ display: "block", textAlign: "center", marginBottom: 24 }}
        >
          Ingresa tu nueva contraseña.
        </Text>

        <Form
          name="reset-password"
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            name="new_password"
            label="Nueva contraseña"
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
            dependencies={["new_password"]}
            rules={[
              { required: true, message: "Confirma tu contraseña" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("new_password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Las contraseñas no coinciden"));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<KeyOutlined />}
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
              Restablecer contraseña
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f0f2f5",
          }}
        >
          <Spin size="large" />
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
