"use client";

import Link from "next/link";
import { Layout, Button, Typography, Row, Col, Card, Steps, Space } from "antd";
import {
  WalletOutlined,
  TeamOutlined,
  PieChartOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

const { Header, Content, Footer } = Layout;
const { Title, Paragraph } = Typography;

const steps = [
  {
    title: "Regístrate",
    description: "Crea tu cuenta gratuita en segundos.",
    icon: <WalletOutlined style={{ fontSize: 28, color: "#1677ff" }} />,
  },
  {
    title: "Agrega tus deudas",
    description: "Registra las deudas personales de cada miembro del hogar.",
    icon: <TeamOutlined style={{ fontSize: 28, color: "#1677ff" }} />,
  },
  {
    title: "Crea tu hogar",
    description:
      "Invita a tus compañeros de hogar y declara los ingresos de cada uno.",
    icon: <PieChartOutlined style={{ fontSize: 28, color: "#1677ff" }} />,
  },
  {
    title: "Distribuye automáticamente",
    description:
      "El sistema calcula y reparte las deudas del hogar proporcionalmente según los ingresos.",
    icon: <CheckCircleOutlined style={{ fontSize: 28, color: "#52c41a" }} />,
  },
];

export default function LandingPage() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* ── Header ── */}
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Title level={4} style={{ margin: 0, color: "#1677ff" }}>
          MyFinanzas
        </Title>
        <Space>
          <Link href="/login">
            <Button>Iniciar sesión</Button>
          </Link>
          <Link href="/register">
            <Button type="primary">Registrarse</Button>
          </Link>
        </Space>
      </Header>

      {/* ── Content ── */}
      <Content style={{ padding: "0" }}>
        {/* Hero */}
        <section
          style={{
            background: "linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)",
            padding: "80px 24px",
          }}
        >
          <Row justify="center">
            <Col xs={24} sm={22} md={18} lg={14} xl={12} style={{ textAlign: "center" }}>
              <Title level={1} style={{ marginBottom: 16 }}>
                Controla tus finanzas y las de tu hogar
              </Title>
              <Paragraph
                style={{ fontSize: 18, maxWidth: 600, margin: "0 auto 32px" }}
              >
                Administra tus deudas personales y{" "}
                <strong>distribuye automáticamente</strong> las deudas del hogar
                según los ingresos de cada miembro. Simple, justo y transparente.
              </Paragraph>
              <Link href="/register">
                <Button type="primary" size="large">
                  Empieza gratis
                </Button>
              </Link>
            </Col>
          </Row>
        </section>

        {/* Cómo funciona */}
        <section style={{ padding: "64px 24px", background: "#fff" }}>
          <Row justify="center">
            <Col xs={24} sm={22} md={18} lg={14} xl={12}>
              <Title level={2} style={{ textAlign: "center", marginBottom: 48 }}>
                ¿Cómo funciona?
              </Title>

              <Row gutter={[32, 32]}>
                {steps.map((step, index) => (
                  <Col key={step.title} xs={24} sm={12}>
                    <Card
                      hoverable
                      style={{ height: "100%" }}
                      styles={{ body: { padding: 24 } }}
                    >
                      <Space direction="vertical" size={12} style={{ width: "100%" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 40,
                              height: 40,
                              borderRadius: "50%",
                              background: "#e6f4ff",
                              fontWeight: 700,
                              color: "#1677ff",
                              fontSize: 16,
                            }}
                          >
                            {index + 1}
                          </span>
                          {step.icon}
                        </div>
                        <Title level={4} style={{ margin: 0 }}>
                          {step.title}
                        </Title>
                        <Paragraph type="secondary" style={{ margin: 0 }}>
                          {step.description}
                        </Paragraph>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Col>
          </Row>
        </section>

        {/* Resumen visual con Steps */}
        <section
          style={{
            padding: "48px 24px 64px",
            background: "#f5f5f5",
          }}
        >
          <Row justify="center">
            <Col xs={24} sm={22} md={18} lg={14} xl={12}>
              <Steps
                current={steps.length}
                items={steps.map((s) => ({
                  title: s.title,
                  description: s.description,
                }))}
                responsive
              />
            </Col>
          </Row>
        </section>
      </Content>

      {/* ── Footer ── */}
      <Footer style={{ textAlign: "center", background: "#fafafa" }}>
        MyFinanzas &copy; {new Date().getFullYear()} &mdash; Proyecto de
        Ingeniería en Informática &middot; DUOC UC
      </Footer>
    </Layout>
  );
}
