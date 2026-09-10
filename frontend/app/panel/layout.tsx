"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Layout, Menu, Button, Typography, Spin, theme } from "antd";
import {
  DashboardOutlined,
  CreditCardOutlined,
  UserOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/lib/auth";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const menuItems = [
  { key: "/panel", icon: <DashboardOutlined />, label: "Resumen" },
  { key: "/panel/deudas", icon: <CreditCardOutlined />, label: "Mis deudas" },
  { key: "/panel/perfil", icon: <UserOutlined />, label: "Mi perfil" },
];

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, loading, logout } = useAuth();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    if (!loading && !token) {
      router.replace("/login");
    }
  }, [loading, token, router]);

  if (loading || !token) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  const selectedKey = menuItems.find((m) => pathname.startsWith(m.key))?.key ?? "/panel";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        breakpoint="lg"
        collapsedWidth={0}
        style={{ background: colorBgContainer }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Title level={4} style={{ margin: 0, color: "#1677ff" }}>
            MyFinanzas
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            padding: "0 24px",
            background: colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Button
            icon={<LogoutOutlined />}
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            Cerrar sesión
          </Button>
        </Header>

        <Content
          style={{
            margin: 24,
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: 280,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
