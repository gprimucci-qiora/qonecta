from playwright.async_api import Page

from ffm_bot.ffm._common import wait_for_loading_overlay_to_clear

# Los reportes del sitio pueden tardar hasta ~35s+ en cargar (verificado en vivo),
# por eso usamos un timeout mayor que el default de Playwright (30s).
SLOW_REPORT_TIMEOUT_MS = 120000


async def go_to_cierre_diario(page: Page) -> None:
    await page.click("#otros-option-navbar")
    await page.click('a.dropdown-item[href="moduloReportesPI"]')
    await page.wait_for_url("**/FSC/moduloReportesPI")
    # moduloReportesPI carga un reporte por defecto al entrar, con un overlay de
    # pantalla completa que bloquea el click en el tab de Cierre Diario hasta que
    # termina. Esa carga inicial puede tardar bastante mas que la busqueda del
    # reporte de Cierre Diario en si (observado hasta ~70s en el sitio real), asi
    # que se usa un timeout mayor aqui.
    await wait_for_loading_overlay_to_clear(page, timeout_ms=SLOW_REPORT_TIMEOUT_MS)
    # El sidebar de tabs esta colapsado a solo iconos visualmente, pero el
    # elemento <a> del tab conserva su ancho de layout completo, que queda
    # tapado por la tabla de resultados del reporte por defecto (un click normal,
    # e incluso uno con force=True, termina apuntando a la celda de la tabla que
    # esta encima en ese punto, no al tab). Se dispara un click via JS sobre el
    # elemento para invocar su handler ng-click directamente, sin depender de la
    # posicion real en pantalla.
    # NOTA: Este click via JS bypass los checkeos de actionability de Playwright
    # (visibilidad, recepcion de eventos, etc). Si el elemento se oculta/detacha/
    # desactiva en el futuro, este click no lanzará el timeout de actionability
    # normal de Playwright; puede fallar silenciosamente o causar un error confuso
    # aguas abajo.
    await page.eval_on_selector("#cierreDiario-tab", "el => el.click()")
    await page.wait_for_selector("#filtro_fecha_inicio_reporte_cierre", state="visible")
    # La busqueda del reporte de Cierre Diario tambien puede tardar mas de los
    # 30s por defecto (observado hasta ~35s en el sitio real).
    await wait_for_loading_overlay_to_clear(page, timeout_ms=SLOW_REPORT_TIMEOUT_MS)
