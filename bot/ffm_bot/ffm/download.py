from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from playwright.async_api import Page

from ffm_bot.ffm._common import wait_for_loading_overlay_to_clear
from ffm_bot.ffm.navigation import SLOW_REPORT_TIMEOUT_MS


def dia_vencido(today: Optional[date] = None) -> date:
    today = today or date.today()
    return today - timedelta(days=1)


def _epoch_ms_utc_midnight(d: date) -> int:
    dt = datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)


async def _set_fecha(page: Page, input_id: str, fecha: date) -> None:
    await page.click(f"#{input_id}")
    picker = page.locator(".datepicker.datepicker-dropdown:visible").first
    await picker.wait_for(state="visible")

    today = date.today()
    months_back = (today.year - fecha.year) * 12 + (today.month - fecha.month)
    # bootstrap-datepicker renders the days/months/years/decades/centuries views
    # simultaneously in the DOM (each with its own thead and th.prev), toggling
    # which one is visible via display:none. _set_fecha never switches views, so
    # we scope to the days view specifically; otherwise th.prev resolves to 5
    # elements and Playwright's strict mode click() raises (verified live).
    prev_button = picker.locator(".datepicker-days th.prev")
    for _ in range(months_back):
        await prev_button.click()

    epoch_ms = _epoch_ms_utc_midnight(fecha)
    await picker.locator(f'td.day[data-date="{epoch_ms}"]').click()


async def descargar_reporte(page: Page, fecha: date, download_dir: Path) -> Path:
    await _set_fecha(page, "filtro_fecha_inicio_reporte_cierre", fecha)
    await _set_fecha(page, "filtro_fecha_fin_reporte_cierre", fecha)
    # #btn_consultar no es unico: cada tab de moduloReportesPI define su propio
    # boton de busqueda con ese mismo id (28 en el sitio real), y el que
    # Playwright resuelve primero pertenece a un tab oculto. El boton de
    # busqueda real del tab de Cierre Diario tiene su propio id unico
    # (verificado en vivo).
    await page.click("#btn_consultar_cierre_diario")
    # La busqueda del reporte de Cierre Diario puede tardar mas de los 30s por
    # defecto (observado hasta ~35s+ en el sitio real, ver navigation.py), asi
    # que reusamos el mismo timeout mayor que go_to_cierre_diario.
    await wait_for_loading_overlay_to_clear(page, timeout_ms=SLOW_REPORT_TIMEOUT_MS)

    await page.click("#imgBtnDescargaReporteCierreDiario")
    async with page.expect_download() as download_info:
        await page.click("#extensionXlsxCierreDiario")
    download = await download_info.value

    download_dir.mkdir(parents=True, exist_ok=True)
    dest = download_dir / f"reporteCierreDiario_{fecha.isoformat()}.xlsx"
    await download.save_as(dest)
    return dest
