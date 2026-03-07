"""
Global skill registry singleton.

Loads skills from the configured skills directory on first access.
"""

from pathlib import Path

from src.config import get_settings
from src.skills.loader import SkillLoader


# Global registry instance (lazy-loaded)
_registry: SkillLoader | None = None


def get_skill_registry() -> SkillLoader:
    """Get or create global skill registry."""
    global _registry
    if _registry is None:
        settings = get_settings()
        skills_path = Path(settings.skills_path)
        _registry = SkillLoader(skills_path)
        print(f"Loaded {len(_registry.skills)} skills from {skills_path}")
    return _registry


# Convenience alias
skill_registry = get_skill_registry
