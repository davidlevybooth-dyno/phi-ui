"""
Extract examples from SKILL.md files for agent instruction enrichment.

This module provides utilities to parse SKILL.md files and extract
concrete usage examples that can be injected into agent instructions.

Design principle:
- Skills are the single source of truth for tool usage
- Agents learn from examples extracted from Skills
- Examples stay synchronized with tool documentation
"""

import re
from dataclasses import dataclass
from pathlib import Path


@dataclass
class ToolExample:
    """A concrete example of tool usage extracted from SKILL.md."""

    title: str  # e.g., "Basic Inverse Folding"
    description: str  # Description of what the example does
    parameters: dict  # The actual parameter values
    use_case: str  # When/why to use this pattern
    output: str | None = None  # Expected output description
    runtime: str | None = None  # Expected runtime


def extract_examples_from_skill(skill_path: Path) -> list[ToolExample]:
    """
    Extract usage examples from a SKILL.md file.

    Parses the ## Examples section and extracts code blocks with context.

    Args:
        skill_path: Path to SKILL.md file

    Returns:
        List of ToolExample objects

    Example:
        >>> skill_path = Path("src/skills/proteinmpnn/SKILL.md")
        >>> examples = extract_examples_from_skill(skill_path)
        >>> examples[0].title
        'Basic Inverse Folding'
    """
    if not skill_path.exists():
        return []

    content = skill_path.read_text()
    examples = []

    # Find the ## Examples section
    examples_section = re.search(
        r"## Examples\s*\n(.*?)(?=^## |\Z)", content, re.MULTILINE | re.DOTALL
    )

    if not examples_section:
        return []

    examples_text = examples_section.group(1)

    # Parse individual examples (### heading followed by code block)
    example_pattern = re.compile(
        r"### (.*?)\n"  # Title
        r"(.*?)"  # Description
        r"```(?:python|json)\s*\n"  # Code block start
        r"(\{.*?\})"  # JSON/dict content
        r"\s*```\s*\n"  # Code block end
        r"(.*?)(?=###|\Z)",  # Rest until next example or end
        re.DOTALL,
    )

    for match in example_pattern.finditer(examples_text):
        title = match.group(1).strip()
        description = match.group(2).strip()
        params_str = match.group(3).strip()
        rest = match.group(4).strip()

        # Parse parameters (try to eval as dict, handle safely)
        try:
            # Replace comments for parsing
            params_clean = re.sub(r"#.*$", "", params_str, flags=re.MULTILINE)
            # Simple parsing (not using eval for security)
            params = parse_simple_dict(params_clean)
        except Exception:
            params = {}

        # Extract metadata from rest
        output_match = re.search(r"\*\*Output\*\*:\s*([^\n]+)", rest)
        runtime_match = re.search(r"\*\*Runtime\*\*:\s*([^\n]+)", rest)
        use_case_match = re.search(r"\*\*Use case\*\*:\s*([^\n]+)", rest)

        examples.append(
            ToolExample(
                title=title,
                description=description,
                parameters=params,
                use_case=use_case_match.group(1).strip() if use_case_match else description,
                output=output_match.group(1).strip() if output_match else None,
                runtime=runtime_match.group(1).strip() if runtime_match else None,
            )
        )

    return examples


def parse_simple_dict(json_str: str) -> dict:
    """
    Parse a simple JSON-like dict string into a Python dict.

    This is a basic parser for the JSON snippets in SKILL.md.
    Not using eval() or json.loads() for security.

    Args:
        json_str: JSON string like '{"key": "value", "num": 10}'

    Returns:
        Parsed dictionary
    """
    import json

    # Remove trailing commas before closing braces (common in examples)
    json_str = re.sub(r",(\s*[}\]])", r"\1", json_str)

    try:
        return json.loads(json_str)  # type: ignore[no-any-return]
    except json.JSONDecodeError:
        # Fallback: extract key-value pairs manually
        result = {}

        # Extract strings
        for match in re.finditer(r'"(\w+)":\s*"([^"]*)"', json_str):
            result[match.group(1)] = match.group(2)

        # Extract numbers
        for match in re.finditer(r'"(\w+)":\s*(\d+\.?\d*)', json_str):
            key = match.group(1)
            if key not in result:  # Don't override strings
                val_str = match.group(2)
                result[key] = float(val_str) if "." in val_str else int(val_str)

        return result


def format_examples_for_agent(examples: list[ToolExample], tool_name: str) -> str:
    """
    Format extracted examples for agent instruction injection.

    Creates a formatted string suitable for including in agent instructions
    with clear structure showing correct usage patterns.

    Args:
        examples: List of ToolExample objects
        tool_name: Name of the tool (e.g., "proteinmpnn")

    Returns:
        Formatted string for agent instructions
    """
    if not examples:
        return ""

    lines = [
        f"=== {tool_name.upper()} USAGE EXAMPLES (from SKILL documentation) ===",
        "",
        "These examples show correct tool usage patterns extracted from the official SKILL docs.",
        "Learn from these patterns when calling this tool.",
        "",
    ]

    for i, example in enumerate(examples, 1):
        lines.extend(
            [
                f"Example {i}: {example.title}",
                "-" * 60,
                f"Description: {example.description}",
                "",
                "✅ Correct tool call:",
                f"  {tool_name}(",
            ]
        )

        # Format parameters
        for key, value in example.parameters.items():
            if isinstance(value, str):
                lines.append(f'    {key}="{value}",')
            else:
                lines.append(f"    {key}={value},")

        lines.append("  )")
        lines.append("")

        if example.use_case:
            lines.append(f"Use case: {example.use_case}")

        if example.output:
            lines.append(f"Expected output: {example.output}")

        if example.runtime:
            lines.append(f"Runtime: {example.runtime}")

        lines.append("")

    lines.append("=" * 60)
    lines.append("")

    return "\n".join(lines)


def inject_skill_examples_into_instructions(
    base_instructions: str, skill_examples: str, injection_point: str = "Parameter Guidelines:"
) -> str:
    """
    Inject SKILL examples into agent instructions.

    Finds the injection point in base instructions and inserts
    the formatted skill examples before it.

    Args:
        base_instructions: Original agent instructions
        skill_examples: Formatted examples from format_examples_for_agent()
        injection_point: Text marker where to inject (examples go BEFORE this)

    Returns:
        Enhanced instructions with examples
    """
    if injection_point in base_instructions:
        parts = base_instructions.split(injection_point, 1)
        return parts[0] + skill_examples + injection_point + parts[1]
    else:
        # Fallback: append at end
        return base_instructions + "\n\n" + skill_examples


# Convenience function for agent configs
def load_skill_examples(skill_name: str, skills_dir: Path) -> str:
    """
    Load and format examples from a SKILL.md file.

    Args:
        skill_name: Name of the skill (e.g., "proteinmpnn")
        skills_dir: Path to skills directory

    Returns:
        Formatted examples string for agent instructions

    Example:
        >>> from pathlib import Path
        >>> skills_dir = Path("src/skills")
        >>> examples = load_skill_examples("proteinmpnn", skills_dir)
        >>> "Basic Inverse Folding" in examples
        True
    """
    skill_path = skills_dir / skill_name / "SKILL.md"
    examples = extract_examples_from_skill(skill_path)
    return format_examples_for_agent(examples, skill_name)
