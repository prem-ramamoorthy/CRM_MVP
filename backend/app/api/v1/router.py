from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, leads, pipeline, visits, activities, dashboard

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(users.router)
router.include_router(leads.router)
router.include_router(pipeline.router)
router.include_router(visits.router)
router.include_router(activities.router)
router.include_router(dashboard.router)
