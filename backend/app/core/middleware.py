from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

import jwt


class JWTContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request.state.user_id = None

        token = request.cookies.get("access_token")
        if token:
            try:
                payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
                request.state.user_id = payload.get("sub")
            except jwt.PyJWTError:
                request.state.user_id = None

        return await call_next(request)
