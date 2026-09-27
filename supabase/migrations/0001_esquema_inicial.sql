BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 0001

CREATE TABLE usuario (
    id SERIAL NOT NULL, 
    nombre VARCHAR(100) NOT NULL, 
    email VARCHAR(255) NOT NULL, 
    password_hash VARCHAR(255) NOT NULL, 
    ingreso_mensual NUMERIC(12, 2), 
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_usuario_email ON usuario (email);

CREATE TABLE deuda_personal (
    id SERIAL NOT NULL, 
    usuario_id INTEGER NOT NULL, 
    descripcion VARCHAR(255) NOT NULL, 
    categoria VARCHAR(50) NOT NULL, 
    monto_total NUMERIC(12, 2) NOT NULL, 
    num_cuotas INTEGER, 
    fecha_vencimiento DATE NOT NULL, 
    estado VARCHAR(20) NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(usuario_id) REFERENCES usuario (id) ON DELETE CASCADE
);

CREATE INDEX ix_deuda_personal_usuario_id ON deuda_personal (usuario_id);

CREATE TABLE grupo (
    id SERIAL NOT NULL, 
    nombre VARCHAR(100) NOT NULL, 
    propietario_id INTEGER NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(propietario_id) REFERENCES usuario (id) ON DELETE CASCADE
);

CREATE INDEX ix_grupo_propietario_id ON grupo (propietario_id);

CREATE TABLE grupo_miembro (
    id SERIAL NOT NULL, 
    grupo_id INTEGER NOT NULL, 
    usuario_id INTEGER, 
    nombre VARCHAR(100), 
    ingreso_mensual NUMERIC(12, 2) NOT NULL, 
    es_propietario BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(grupo_id) REFERENCES grupo (id) ON DELETE CASCADE, 
    FOREIGN KEY(usuario_id) REFERENCES usuario (id) ON DELETE CASCADE, 
    CONSTRAINT uq_grupo_miembro_usuario UNIQUE (grupo_id, usuario_id), 
    CONSTRAINT uq_grupo_miembro_nombre UNIQUE (grupo_id, nombre)
);

CREATE INDEX ix_grupo_miembro_grupo_id ON grupo_miembro (grupo_id);

CREATE TABLE deuda_hogar (
    id SERIAL NOT NULL, 
    grupo_id INTEGER NOT NULL, 
    creada_por INTEGER NOT NULL, 
    descripcion VARCHAR(255) NOT NULL, 
    categoria VARCHAR(50) NOT NULL, 
    monto_total NUMERIC(12, 2) NOT NULL, 
    num_cuotas INTEGER, 
    fecha_vencimiento DATE NOT NULL, 
    estado VARCHAR(20) NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(grupo_id) REFERENCES grupo (id) ON DELETE CASCADE, 
    FOREIGN KEY(creada_por) REFERENCES usuario (id) ON DELETE CASCADE
);

CREATE INDEX ix_deuda_hogar_grupo_id ON deuda_hogar (grupo_id);

INSERT INTO alembic_version (version_num) VALUES ('0001') RETURNING alembic_version.version_num;

COMMIT;

