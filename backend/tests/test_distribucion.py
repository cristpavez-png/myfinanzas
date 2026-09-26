"""Pruebas del motor de distribución proporcional por ingresos (Hito 4)."""

import pytest

from app.services.distribucion import DistribucionError, repartir_deuda


def _sumar_centavos(aportes: list[dict]) -> int:
    return round(sum(a["aporte"] for a in aportes) * 100)


def test_reparto_proporcional_exacto():
    aportes = repartir_deuda(
        100000.0,
        [(1, "Chris", 300000.0), (2, "Nick", 700000.0)],
    )
    assert aportes[0]["aporte"] == 30000.0
    assert aportes[1]["aporte"] == 70000.0
    assert aportes[0]["porcentaje"] == 30.0
    assert aportes[1]["porcentaje"] == 70.0
    assert _sumar_centavos(aportes) == 10000000


def test_reparto_dos_miembros_iguales():
    aportes = repartir_deuda(100000.0, [(1, "A", 500000.0), (2, "B", 500000.0)])
    assert aportes[0]["aporte"] == 50000.0
    assert aportes[1]["aporte"] == 50000.0


def test_reparto_un_solo_miembro():
    aportes = repartir_deuda(250000.0, [(1, "Chris", 900000.0)])
    assert aportes[0]["aporte"] == 250000.0
    assert aportes[0]["porcentaje"] == 100.0


def test_reparto_redondeo_suma_exacta():
    # 3 miembros con ingresos que generan decimales infinitos en la cuota.
    aportes = repartir_deuda(
        100000.0,
        [
            (1, "A", 333333.0),
            (2, "B", 333333.0),
            (3, "C", 333334.0),
        ],
    )
    assert _sumar_centavos(aportes) == 10000000
    # El ajuste de centavo debe ir al miembro de mayor ingreso (C).
    assert aportes[2]["aporte"] > aportes[0]["aporte"]


def test_reparto_centavos_impares():
    # 99.99 repartido en 3 miembros iguales: centavos exactos 3333+3333+3333 = 9999,
    # el céntimo que falta va al primer miembro (mayor ingreso, empate -> primero).
    aportes = repartir_deuda(
        99.99,
        [(1, "A", 600000.0), (2, "B", 500000.0), (3, "C", 400000.0)],
    )
    assert _sumar_centavos(aportes) == 9999
    assert aportes[0]["aporte"] > aportes[1]["aporte"]


def test_eror_sin_miembros():
    with pytest.raises(DistribucionError):
        repartir_deuda(100000.0, [])


def test_error_ingresos_en_cero():
    with pytest.raises(DistribucionError):
        repartir_deuda(100000.0, [(1, "A", 0.0), (2, "B", 0.0)])