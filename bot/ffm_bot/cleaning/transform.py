from pathlib import Path

import pandas as pd

QIORA_USER_PREFIX = "MEG"

# El orden de este dict define el orden de columnas de salida (SIVA es
# posicional). No reordenar sin actualizar el importador de SIVA.
COLUMN_MAPPING = {
    "Cuenta": "CUENTA",
    "OT": "OT",
    "Tipo": "TIPO",
    "Tipo cuadrilla": "TIPO CUADRILLA",
    "Distrito": "DISTRITO",
    "Usuario instalador": "USUARIO INSTALADOR",
    "Nombre tecnico": "NOMBRE INSTALADOR",
    "Usuario auxiliar": "USUARIO AUXILIAR",
    "Nombre auxiliar": "NOMBRE AUXILIAR",
    "Fecha termino": "FECHA TERMINO",
    "Estatus": "ESTATUS",
    "Estado": "ESTADO",
    "Tipo pago": "TIPO PAGO",
    "Monto pago": "MONTO PAGO",
    "Estatus pago": "ESTATUS PAGO",
}


def limpiar_reporte(raw_path: Path) -> pd.DataFrame:
    df = pd.read_excel(raw_path, sheet_name="Reporte Cierre Diario", header=1)
    df = df[df["Usuario instalador"].astype(str).str.startswith(QIORA_USER_PREFIX)]
    df = df.drop_duplicates(subset="OT")
    df = df[list(COLUMN_MAPPING.keys())].rename(columns=COLUMN_MAPPING)
    df["FECHA TERMINO"] = _parse_fecha_termino(df["FECHA TERMINO"])
    df["OT"] = df["OT"].astype(str)
    return df.reset_index(drop=True)


def _parse_fecha_termino(series: pd.Series) -> pd.Series:
    normalizado = series.astype(str).str.replace(r"\s+", " ", regex=True).str.strip()
    return pd.to_datetime(normalizado, format="%d/%m/%Y %H:%M:%S").dt.normalize()


def guardar_excel_limpio(df: pd.DataFrame, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_excel(output_path, sheet_name="CIERRE DIARIO", index=False)
