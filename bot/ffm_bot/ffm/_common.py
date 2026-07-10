from playwright.async_api import Page


async def wait_for_loading_overlay_to_clear(page: Page, timeout_ms: int = 30000) -> None:
    overlay = page.get_by_text("Cargando registros...")
    try:
        # El grace period para "aparecio" debe respetar el mismo timeout_ms que
        # el de "desaparecio": con un timeout corto fijo (probado en vivo con
        # 3000ms), en cargas iniciales lentas (bootstrap de Angular en
        # moduloReportesPI, con <body style="display:none"> hasta que termina)
        # el overlay nunca llega a hacerse visible dentro de esa ventana, el
        # except silencia el timeout, y el wait_for("hidden") subsiguiente pasa
        # trivialmente de inmediato porque el overlay nunca estuvo visible -
        # dejando que el codigo continue antes de que la pagina real haya
        # cargado (reproducido en vivo: #cierreDiario-tab ausente del DOM,
        # <body> aun display:none, justo despues de que esta funcion retornaba).
        #
        # Nota: no hay forma economica de distinguir "overlay nunca aparecera"
        # de "aun no ha aparecido" — timeout corto bloqueara el timeout completo
        # si el overlay nunca se muestra. Todos los call sites actuales usan 120s.
        await overlay.wait_for(state="visible", timeout=timeout_ms)
    except Exception:
        pass
    await overlay.wait_for(state="hidden", timeout=timeout_ms)
