import sys
with open("backend/app/main.py", "r") as f:
    content = f.read()

handler_code = """
from fastapi.exceptions import RequestValidationError
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    import json
    body = await request.body()
    print("VALIDATION ERROR:", exc.errors())
    print("REQUEST BODY:", body)
    return JSONResponse(status_code=422, content={"detail": exc.errors()})
"""

if "validation_exception_handler" not in content:
    content = content.replace("app.include_router", handler_code + "\napp.include_router", 1)
    with open("backend/app/main.py", "w") as f:
        f.write(content)
