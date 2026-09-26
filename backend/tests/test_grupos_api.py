"""Pruebas de endpoints de grupos (Hito 4): permisos y ciclo de vida."""

from tests.conftest import (
    _login,
    crear_deuda_hogar,
    crear_grupo,
    crear_usuario_logueado,
)


def test_401_sin_sesion(client):
    assert client.get("/grupos").status_code == 401
    assert client.post("/grupos", json={"nombre": "X", "ingreso_mensual": 1}).status_code == 401
    assert client.get("/grupos/1").status_code == 401
    assert client.get("/grupos/1/distribucion").status_code == 401


def test_crear_y_listar_grupo(client):
    email = crear_usuario_logueado(client, ingreso=800000.0)

    r = client.post("/grupos", json={"nombre": "Hogar Pruéba "})
    assert r.status_code == 201, r.text
    grupo = r.json()
    assert grupo["nombre"] == "Hogar Pruéba"
    assert grupo["propietario_id"] is not None
    assert len(grupo["miembros"]) == 1

    miembro = grupo["miembros"][0]
    assert miembro["es_propietario"] is True
    assert miembro["ingreso_mensual"] == 800000.0
    assert miembro["email"] == email
    assert miembro["nombre"] == "Chris Duoc"

    r = client.get("/grupos")
    assert r.status_code == 200
    resumen = r.json()[0]
    assert resumen["id"] == grupo["id"]
    assert resumen["n_miembros"] == 1
    assert resumen["total_pendiente"] == 0.0
    assert resumen["es_propietario"] is True


def test_crear_grupo_sin_ingreso_422(client):
    crear_usuario_logueado(client, ingreso=None)
    r = client.post("/grupos", json={"nombre": "Sin Ingreso"})
    assert r.status_code == 422

    r = client.post("/grupos", json={"nombre": "Con Ingreso", "ingreso_mensual": 300000.0})
    assert r.status_code == 201


def test_grupo_inexistente_404(client):
    crear_usuario_logueado(client)
    assert client.get("/grupos/999").status_code == 404
    assert client.post("/grupos/999/miembros", json={"nombre": "X", "ingreso_mensual": 1}).status_code == 404
    assert client.get("/grupos/999/distribucion").status_code == 404


def test_forbiddel_usuario_no_miembro(client):
    crear_usuario_logueado(client, ingreso=600000.0)
    grupo_id = crear_grupo(client)

    # Un segundo usuario sin sesión en el grupo no puede verlo ni mutarlo.
    crear_usuario_logueado(client, ingreso=900000.0)
    assert client.get(f"/grupos/{grupo_id}").status_code == 403
    assert client.get(f"/grupos/{grupo_id}/deudas").status_code == 403
    assert client.get(f"/grupos/{grupo_id}/distribucion").status_code == 403
    assert client.put(f"/grupos/{grupo_id}", json={"nombre": "Hack"}).status_code == 403
    assert client.delete(f"/grupos/{grupo_id}").status_code == 403
    assert (
        client.post(f"/grupos/{grupo_id}/miembros", json={"nombre": "X", "ingreso_mensual": 1}).status_code
        == 403
    )
    assert client.post(f"/grupos/{grupo_id}/deudas", json={
        "descripcion": "X", "categoria": "otros", "monto_total": 100.0,
        "fecha_vencimiento": "2026-10-01",
    }).status_code == 403


def test_miembro_manual_y_duplicado_409(client):
    crear_usuario_logueado(client)
    grupo_id = crear_grupo(client)

    r = client.post(
        f"/grupos/{grupo_id}/miembros",
        json={"nombre": "Pedro", "ingreso_mensual": 500000.0},
    )
    assert r.status_code == 201, r.text
    pedro = r.json()
    assert pedro["nombre"] == "Pedro"
    assert pedro["usuario_id"] is None
    assert pedro["ingreso_mensual"] == 500000.0

    r = client.post(
        f"/grupos/{grupo_id}/miembros",
        json={"nombre": "Pedro", "ingreso_mensual": 400000.0},
    )
    assert r.status_code == 409


def test_miembro_validacion_422(client):
    crear_usuario_logueado(client)
    grupo_id = crear_grupo(client)

    # Sin un identificador ("usuario"/"email"/"nombre") y sin ingreso.
    assert (
        client.post(f"/grupos/{grupo_id}/miembros", json={}).status_code == 422
    )
    # Persona manual sin ingreso.
    assert (
        client.post(f"/grupos/{grupo_id}/miembros", json={"nombre": "Ana"}).status_code
        == 422
    )
    # usuario_id y email a la vez.
    assert (
        client.post(
            f"/grupos/{grupo_id}/miembros",
            json={"usuario_id": 1, "email": "a@test.cl", "ingreso_mensual": 1},
        ).status_code
        == 422
    )


def test_miembro_registrado_por_email(client):
    propietario = crear_usuario_logueado(client, ingreso=1000000.0)
    grupo_id = crear_grupo(client, "Hogar Duoc")

    amigo = crear_usuario_logueado(client, ingreso=700000.0, nombre="Nick Duoc")
    # Volver a la sesión del propietario para invitar al amigo.
    _login(client, propietario)

    r = client.post(f"/grupos/{grupo_id}/miembros", json={"email": amigo})
    assert r.status_code == 201, r.text
    miembro = r.json()
    assert miembro["nombre"] == "Nick Duoc"
    assert miembro["email"] == amigo
    assert miembro["ingreso_mensual"] == 700000.0
    assert miembro["es_propietario"] is False

    # Duplicado: vuelve a intentar por usuario_id.
    r = client.post(f"/grupos/{grupo_id}/miembros", json={"usuario_id": miembro["usuario_id"]})
    assert r.status_code == 409

    # El propio propietario no puede agregarse de nuevo.
    r = client.post(f"/grupos/{grupo_id}/miembros", json={"email": amigo})
    assert r.status_code == 409


def test_miembro_registrado_sin_ingreso_422(client):
    propietario = crear_usuario_logueado(client, ingreso=1000000.0)
    grupo_id = crear_grupo(client)

    amigo = crear_usuario_logueado(client, ingreso=None)
    _login(client, propietario)
    r = client.post(f"/grupos/{grupo_id}/miembros", json={"email": amigo})
    assert r.status_code == 422


def test_miembro_inexistente_404(client):
    crear_usuario_logueado(client)
    grupo_id = crear_grupo(client)
    r = client.post(
        f"/grupos/{grupo_id}/miembros", json={"email": "nadie@test.cl"}
    )
    assert r.status_code == 404


def test_actualizar_ingreso_miembro(client):
    propietario = crear_usuario_logueado(client, ingreso=1000000.0)
    grupo_id = crear_grupo(client)
    miembro_id = client.get(f"/grupos/{grupo_id}").json()["miembros"][0]["id"]

    r = client.put(f"/grupos/{grupo_id}/miembros/{miembro_id}", json={"ingreso_mensual": 1200000.0})
    assert r.status_code == 200, r.text
    assert r.json()["ingreso_mensual"] == 1200000.0

    amigo = crear_usuario_logueado(client, ingreso=700000.0)
    _login(client, propietario)
    amigo_miembro_id = client.post(
        f"/grupos/{grupo_id}/miembros", json={"email": amigo}
    ).json()["id"]

    # Un miembro no propietario solo puede editarse a sí mismo.
    _login(client, amigo)
    assert (
        client.put(f"/grupos/{grupo_id}/miembros/{miembro_id}", json={"ingreso_mensual": 1}).status_code
        == 403
    )
    r = client.put(f"/grupos/{grupo_id}/miembros/{amigo_miembro_id}", json={"ingreso_mensual": 750000.0})
    assert r.status_code == 200
    assert r.json()["ingreso_mensual"] == 750000.0


def test_eliminar_miembro_y_propietario(client):
    crear_usuario_logueado(client, ingreso=1000000.0)
    grupo_id = crear_grupo(client)
    pedro_id = client.post(
        f"/grupos/{grupo_id}/miembros", json={"nombre": "Pedro", "ingreso_mensual": 300000.0}
    ).json()["id"]

    propietario_id = client.get(f"/grupos/{grupo_id}").json()["miembros"][0]["id"]
    r = client.delete(f"/grupos/{grupo_id}/miembros/{propietario_id}")
    assert r.status_code == 400

    r = client.delete(f"/grupos/{grupo_id}/miembros/{pedro_id}")
    assert r.status_code == 204
    detalle = client.get(f"/grupos/{grupo_id}").json()
    assert len(detalle["miembros"]) == 1


def test_deudas_hogar_ciclo_verde(client):
    propietario = crear_usuario_logueado(client, ingreso=1000000.0)
    grupo_id = crear_grupo(client, "Hogar Duoc")
    amigo = crear_usuario_logueado(client, ingreso=700000.0)
    _login(client, propietario)
    client.post(f"/grupos/{grupo_id}/miembros", json={"email": amigo})

    deuda = crear_deuda_hogar(client, grupo_id, monto=510000.0)
    assert deuda["grupo_id"] == grupo_id
    assert deuda["monto_total"] == 510000.0

    r = client.get(f"/grupos/{grupo_id}/deudas")
    assert r.status_code == 200
    assert len(r.json()) == 1

    # Cualquier miembro puede crear una deuda (no solo el propietario).
    _login(client, amigo)
    r = client.post(
        f"/grupos/{grupo_id}/deudas",
        json={
            "descripcion": "Luz",
            "categoria": "servicios",
            "monto_total": 40000.0,
            "fecha_vencimiento": "2026-10-05",
        },
    )
    assert r.status_code == 201
    luz_id = r.json()["id"]

    # Un miembro puede marcar una deuda propia como pagada.
    r = client.put(f"/grupos/{grupo_id}/deudas/{luz_id}", json={"estado": "pagada"})
    assert r.status_code == 200

    # El propietario puede marcar como pagada una deuda ajena.
    _login(client, propietario)
    r = client.put(f"/grupos/{grupo_id}/deudas/{deuda['id']}", json={"estado": "pagada"})
    assert r.status_code == 200

    deudas = client.get(f"/grupos/{grupo_id}/deudas").json()
    assert deudas[0]["estado"] == "pagada"

    r = client.delete(f"/grupos/{grupo_id}/deudas/{deuda['id']}")
    assert r.status_code == 204


def test_distribucion_proporcional(client):
    propietario = crear_usuario_logueado(client, ingreso=1000000.0)
    grupo_id = crear_grupo(client, "Hogar Duoc")
    amigo = crear_usuario_logueado(client, ingreso=700000.0, nombre="Nick Duoc")
    _login(client, propietario)
    client.post(f"/grupos/{grupo_id}/miembros", json={"email": amigo})
    crear_deuda_hogar(client, grupo_id, monto=510000.0)

    r = client.get(f"/grupos/{grupo_id}/distribucion")
    assert r.status_code == 200
    data = r.json()
    assert data["total_deudas"] == 510000.0
    assert len(data["por_deuda"]) == 1
    assert len(data["miembros"]) == 2

    aportes = data["por_deuda"][0]["aportes"]
    total_aportes = round(sum(a["aporte"] for a in aportes) * 100)
    assert total_aportes == 51000000

    # Saber los ingresos a partir del cuerpo; cuotas 10:7.
    aporte_propietario = max(a["aporte"] for a in aportes)
    aporte_amigo = min(a["aporte"] for a in aportes)
    assert aporte_propietario == 300000.0
    assert aporte_amigo == 210000.0

    totales = {m["nombre"]: m["total"] for m in data["miembros"]}
    assert totales["Chris Duoc"] == 300000.0
    assert totales["Nick Duoc"] == 210000.0


def test_distribucion_distingue_pagadas(client):
    crear_usuario_logueado(client, ingreso=1000000.0)
    grupo_id = crear_grupo(client)
    crear_deuda_hogar(client, grupo_id, monto=510000.0)
    pagada = crear_deuda_hogar(client, grupo_id, monto=100000.0)
    client.put(f"/grupos/{grupo_id}/deudas/{pagada['id']}", json={"estado": "pagada"})

    r = client.get(f"/grupos/{grupo_id}/distribucion")
    assert r.status_code == 200
    data = r.json()
    assert data["total_deudas"] == 510000.0
    assert len(data["por_deuda"]) == 1
    assert data["por_deuda"][0]["descripcion"] == "Arriendo octubre"


def test_distribucion_porcentaje_global(client):
    propietario = crear_usuario_logueado(client, ingreso=1000000.0)
    grupo_id = crear_grupo(client, "Hogar Duoc")
    amigo = crear_usuario_logueado(client, ingreso=700000.0, nombre="Nick Duoc")
    _login(client, propietario)
    client.post(f"/grupos/{grupo_id}/miembros", json={"email": amigo})
    crear_deuda_hogar(client, grupo_id, monto=510000.0)

    r = client.get(f"/grupos/{grupo_id}/distribucion")
    data = r.json()
    for total in data["miembros"]:
        assert abs(total["porcentaje"] - (total["total"] / data["total_deudas"] * 100)) < 0.01


def test_eliminar_grupo(client):
    crear_usuario_logueado(client)
    grupo_id = crear_grupo(client)
    client.post(f"/grupos/{grupo_id}/miembros", json={
        "nombre": "Pedro", "ingreso_mensual": 1.0
    })
    crear_deuda_hogar(client, grupo_id, monto=1000.0)

    r = client.delete(f"/grupos/{grupo_id}")
    assert r.status_code == 204
    assert client.get(f"/grupos/{grupo_id}").status_code == 404
    assert len(client.get("/grupos").json()) == 0


def test_renombrar_grupo(client):
    crear_usuario_logueado(client)
    grupo_id = crear_grupo(client, "Nombre Original")
    r = client.put(f"/grupos/{grupo_id}", json={"nombre": "Nuevo Nombre"})
    assert r.status_code == 200
    assert r.json()["nombre"] == "Nuevo Nombre"


def test_deuda_hogar_403_para_no_dueno(client):
    propietario = crear_usuario_logueado(client, ingreso=800000.0)
    grupo_id = crear_grupo(client)
    deuda_id = crear_deuda_hogar(client, grupo_id, monto=50000.0)["id"]

    amigo = crear_usuario_logueado(client, ingreso=400000.0)
    _login(client, propietario)
    client.post(f"/grupos/{grupo_id}/miembros", json={"email": amigo})

    # Un miembro que no creó la deuda ni es propietario no puede modificarla.
    _login(client, amigo)
    r = client.put(f"/grupos/{grupo_id}/deudas/{deuda_id}", json={"estado": "pagada"})
    assert r.status_code == 403