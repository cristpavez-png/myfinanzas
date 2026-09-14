from dataclasses import dataclass


class DistribucionError(ValueError):
    """Error de negocio al no poder distribuir las deudas del grupo."""


@dataclass
class MiembroAporte:
    miembro_id: int
    nombre: str
    ingreso_mensual: float
    porcentaje: float
    aporte: float


def _monto_a_centavos(monto: float) -> int:
    return int(round(monto * 100))


def repartir_deuda(
    monto_total: float,
    miembros: list[tuple[int, str, float]],
) -> list[dict]:
    """Distribuye ``monto_total`` (CLP) proporcional al ingreso de cada miembro.

    ``miembros`` es una lista de ``(miembro_id, nombre, ingreso_mensual)``.
    El reparto se hace en céntimos y se ajusta la diferencia de redondeo en el
    miembro de mayor ingreso, de modo que la suma de los aportes sea exacta.

    Lanza :class:`DistribucionError` si no hay ingresos positivos.
    """
    if not miembros:
        raise DistribucionError("El grupo no tiene miembros")

    ingresos = [m[2] for m in miembros]
    total_ingresos = sum(ingresos)
    if total_ingresos <= 0:
        raise DistribucionError(
            "Todos los miembros deben declarar un ingreso mensual mayor a cero"
        )

    total_centavos = _monto_a_centavos(monto_total)

    aportes_centavos = [
        round(ingreso / total_ingresos * total_centavos) for ingreso in ingresos
    ]

    # Ajuste de redondeo: la suma debe ser exacta al céntimo.
    diferencia = total_centavos - sum(aportes_centavos)
    if diferencia != 0:
        idx = max(range(len(miembros)), key=lambda i: miembros[i][2])
        aportes_centavos[idx] += diferencia

    resultado: list[dict] = []
    for miembro, aporte_centavos in zip(miembros, aportes_centavos):
        miembro_id, nombre, ingreso = miembro
        resultado.append(
            {
                "miembro_id": miembro_id,
                "nombre": nombre,
                "ingreso_mensual": ingreso,
                "porcentaje": round(ingreso / total_ingresos * 100, 2),
                "aporte": aporte_centavos / 100,
            }
        )
    return resultado