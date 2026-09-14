"use client";

import { useEffect, useState } from "react";
import { Typography, Row, Col, Card, Statistic, Spin } from "antd";
import {
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { api } from "@/lib/api";

const { Title } = Typography;

interface Deuda {
  id: number;
  descripcion: string;
  categoria: string;
  monto_total: number;
  num_cuotas: number | null;
  fecha_vencimiento: string;
  estado: string;
}

export default function PanelResumen() {
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Deuda[]>("/deudas")
      .then(setDeudas)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  const total = deudas.reduce((s, d) => s + d.monto_total, 0);
  const pendientes = deudas.filter((d) => d.estado === "pendiente");
  const pagadas = deudas.filter((d) => d.estado === "pagada");
  const totalPendiente = pendientes.reduce((s, d) => s + d.monto_total, 0);
  const totalPagado = pagadas.reduce((s, d) => s + d.monto_total, 0);

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        Resumen
      </Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total deudas"
              value={total}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="CLP"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Pendientes"
              value={totalPendiente}
              precision={2}
              prefix={<ClockCircleOutlined />}
              suffix="CLP"
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Pagadas"
              value={totalPagado}
              precision={2}
              prefix={<CheckCircleOutlined />}
              suffix="CLP"
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Deudas totales" value={deudas.length} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Pendientes"
              value={pendientes.length}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Pagadas"
              value={pagadas.length}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Por vencer pronto"
              value={
                pendientes.filter((d) => {
                  const vence = new Date(d.fecha_vencimiento);
                  const hoy = new Date();
                  const diff = (vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
                  return diff >= 0 && diff <= 7;
                }).length
              }
              valueStyle={{ color: "#ff4d4f" }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
