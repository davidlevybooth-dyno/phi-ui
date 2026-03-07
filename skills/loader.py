"""
Skill loader: Auto-discover and parse skills from SKILL.md files.

Skills are discovered from the skills directory and loaded from SKILL.md files
with YAML frontmatter.
"""

import logging
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field


logger = logging.getLogger(__name__)


class Skill(BaseModel):
    """Parsed skill definition from SKILL.md."""

    name: str
    description: str
    category: str
    tags: list[str] = Field(default_factory=list)
    tool_schema: dict[str, Any] | None = None
    recommended_timeout: int = 3600
    recommended_gpu: str | None = None
    qc_thresholds: dict[str, Any] = Field(default_factory=dict)
    biomodals_script: str | None = None
    biomodals_function: str | None = None  # Name of deployed Modal function
    references: dict[str, str] = Field(default_factory=dict)
    examples: dict[str, str] = Field(default_factory=dict)


class SkillLoader:
    """Discover and load skills from directory."""

    def __init__(self, skills_dir: Path | str):
        self.skills_dir = Path(skills_dir)
        self.skills: dict[str, Skill] = {}
        if self.skills_dir.exists() and self.skills_dir.is_dir():
            self._load_all_skills()

    def _load_all_skills(self) -> None:
        """Scan directory and load all SKILL.md files."""
        logger.info(f"Loading skills from {self.skills_dir}")

        for skill_dir in self.skills_dir.iterdir():
            if not skill_dir.is_dir():
                continue

            skill_file = skill_dir / "SKILL.md"
            if skill_file.exists():
                try:
                    skill = self._parse_skill(skill_file, skill_dir)
                    self.skills[skill.name] = skill
                    logger.debug(f"Loaded skill: {skill.name}")
                except ValueError as e:
                    logger.warning(f"Invalid skill format in {skill_dir.name}: {e}")
                except Exception as e:
                    logger.error(f"Failed to load skill {skill_dir.name}: {e}", exc_info=True)

        logger.info(f"Successfully loaded {len(self.skills)} skills")

    def _parse_skill(self, skill_file: Path, skill_dir: Path) -> Skill:
        """Parse SKILL.md file with YAML frontmatter."""
        content = skill_file.read_text()

        # Extract YAML frontmatter
        if not content.startswith("---"):
            raise ValueError("SKILL.md must start with YAML frontmatter (---)")

        parts = content.split("---", 2)
        if len(parts) < 3:
            raise ValueError("Invalid YAML frontmatter format")

        # Parse YAML metadata
        metadata = yaml.safe_load(parts[1])

        # Discover references
        refs: dict[str, str] = {}
        if (skill_dir / "references").exists():
            for ref_file in (skill_dir / "references").glob("*.md"):
                refs[ref_file.stem] = str(ref_file)

        # Discover examples
        examples: dict[str, str] = {}
        if (skill_dir / "examples").exists():
            for ex_file in (skill_dir / "examples").glob("*.md"):
                examples[ex_file.stem] = str(ex_file)

        # Build Skill object
        return Skill(**metadata, references=refs, examples=examples)

    def get(self, name: str) -> Skill | None:
        """Get skill by name."""
        return self.skills.get(name)

    def list_by_category(self, category: str) -> list[Skill]:
        """List all skills in a category."""
        return [s for s in self.skills.values() if s.category == category]

    def search(self, query: str) -> list[Skill]:
        """Search skills by name, description, or tags."""
        query_lower = query.lower()
        return [
            s
            for s in self.skills.values()
            if query_lower in s.name.lower()
            or query_lower in s.description.lower()
            or any(query_lower in tag.lower() for tag in s.tags)
        ]

    def all_skills(self) -> list[Skill]:
        """Get all loaded skills."""
        return list(self.skills.values())
