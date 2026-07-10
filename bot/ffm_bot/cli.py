import asyncio
import re
from datetime import date, datetime
from pathlib import Path
from typing import Optional

import typer
from playwright.async_api import async_playwright

from ffm_bot import config
from ffm_bot.cleaning.transform import guardar_excel_limpio, limpiar_reporte
from ffm_bot.ffm.auth import login
from ffm_bot.ffm.download import descargar_reporte, dia_vencido
from ffm_bot.ffm.navigation import go_to_cierre_diario

app = typer.Typer()

FILENAME_FECHA_PATTERN = re.compile(r"reporteCierreDiario_(\d{4}-\d{2}-\d{2})")


@app.callback()
def main() -> None:
    """FFM Siva Bot: descarga de reportes de Cierre Diario."""


@app.command()
def descargar(
    fecha: Optional[str] = typer.Option(
        None, help="Fecha a descargar en formato YYYY-MM-DD. Default: dia vencido."
    )
) -> None:
    target_fecha = (
        datetime.strptime(fecha, "%Y-%m-%d").date() if fecha else dia_vencido()
    )
    asyncio.run(_descargar(target_fecha))


async def _descargar(fecha: date) -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=config.HEADLESS)
        context = await browser.new_context(accept_downloads=True)
        page = await context.new_page()
        await login(page)
        await go_to_cierre_diario(page)
        dest = await descargar_reporte(page, fecha, config.DOWNLOADS_DIR)
        await browser.close()
        typer.echo(f"Descargado: {dest}")


def _fecha_from_filename(path: Path) -> str:
    match = FILENAME_FECHA_PATTERN.search(path.name)
    if not match:
        raise typer.BadParameter(
            f"No se pudo extraer la fecha del nombre '{path.name}'. "
            "Esperaba un nombre tipo 'reporteCierreDiario_YYYY-MM-DD.xlsx'."
        )
    return match.group(1)


@app.command()
def limpiar(
    archivo: Path = typer.Argument(
        ..., exists=True, readable=True, help="Excel crudo descargado de FFM."
    )
) -> None:
    fecha = _fecha_from_filename(archivo)
    df = limpiar_reporte(archivo)
    dest = config.OUTPUT_DIR / f"CIERRE_DIARIO_{fecha}.xlsx"
    guardar_excel_limpio(df, dest)
    typer.echo(f"Limpio: {dest}")


if __name__ == "__main__":
    app()
