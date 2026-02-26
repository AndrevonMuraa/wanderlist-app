from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from legal_pages import PRIVACY_POLICY_HTML, TERMS_OF_SERVICE_HTML

router = APIRouter()


@router.get("/legal/privacy", response_class=HTMLResponse)
async def privacy_policy():
    return HTMLResponse(content=PRIVACY_POLICY_HTML)


@router.get("/legal/terms", response_class=HTMLResponse)
async def terms_of_service():
    return HTMLResponse(content=TERMS_OF_SERVICE_HTML)
