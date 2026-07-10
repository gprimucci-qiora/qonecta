from playwright.async_api import Page

from ffm_bot import config


class LoginError(RuntimeError):
    pass


async def login(page: Page) -> None:
    await page.goto(f"{config.BASE_URL}/FSC/moduloDespacho")
    await page.fill("#user_user", config.FFM_USER)
    await page.fill("#user_pswd", config.FFM_PASSWORD)
    await page.click("#ingresar-btn-login")
    try:
        await page.wait_for_url("**/FSC/moduloDespacho", timeout=15000)
    except Exception as exc:
        raise LoginError(
            "No se pudo iniciar sesion en FFM: revisa FFM_USER/FFM_PASSWORD en .env"
        ) from exc
