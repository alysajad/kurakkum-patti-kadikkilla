"""Keyword-driven scoring and dialogue selection for Kurakkum Patti Kadikkilla.

This module implements:
- Malayalam danger/noise keyword detection
- Drama heuristics that reduce perceived danger
- A simple danger score and category mapping
- Dialogue selection based on the final category
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple
import re


# Core keyword lists (expandable)
DANGER_KEYWORDS: List[str] = [
    "Bomb",
    "war"
    "gun",
    "knife",
    "sword",
    "axe",
    "bomb",
    "weapon",
    "ബോംബ്",
    "വെടിവെപ്പ്",
    "ആക്രമണം",
    "ഭീകരൻ",
    "പൊട്ടിത്തെറി",
    "തീവ്രവാദം",
    "പൊളി",
    "പൊളിച്ചടുക്കി",
    "പൊളിച്ചുപോയി",
    "പൊളിച്ചുപോയത്",
    "പൊളിച്ചുനടക്കുന്നു",
    "പൊളിച്ചുപോയി",
    "മാസ്സ്",
    "മാസ്സ് ആക്കി",
    "sensational",
    "viral",
    "trending",
    "exclusive",
    "hot news",
    "വൈറല്‍",
    "ഹോട്ട് ന്യൂസ്",
    "വൈറല്‍ വീഡിയോ",
]

NOISE_KEYWORDS: List[str] = [
    "attack",
    "terrorist",
    "explosion",
    "shooting",
    "assault",
    "hostage",
    "murder",
    "crime",
    "വധം",
    "കൊലപാതകം",
    "ആക്രമണം",
    "ഭീഷണി",
    "പിടികൂടല്‍",
    "തീവ്രവാദി",
    "വെടിവെപ്പ്",
    "അക്രമം",
    "ജയിച്ചുകാണിച്ചു",
    "പൊളിച്ചു",
    "കിടിലൻ",
    "ബ്രേക്കിങ്",
    "ബ്രേക്കിംഗ്",
    "ബ്രേക്കിങ് ന്യൂസ്",
    "ബ്രേക്കിംഗ് ന്യൂസ്",
    "മാസ്",
    "മാസ്സ്",
]


LOW_DANGER_DIALOGUES: List[str] = [
    "ഇതൊക്കെ കേട്ടു ചിരിച്ചുപോകാം.",
    "പണി ഇല്ലാത്ത ബഹളം!",
    "ഇതൊക്കെ സാധാരണമാണ്.",
    "ഇതൊക്കെ കേട്ടു തലവേദന വരും.",
    "ഇത് കേട്ട് ഞാന്‍ ചായ കുടിച്ചിട്ട് വരാം.",
    "അമ്മേ, പണി ഇല്ലാത്ത ബഹളം!",
    "ഇവന്‍റെ ശബ്ദം കേട്ടാല്‍ പോലീസ് പോലും ഉറങ്ങും.",
    "കുരയ്ക്കും പട്ടി, കടിക്കില്ലേ മച്ചാനെ!",
]

HIGH_DANGER_DIALOGUES: List[str] = [
    "ഇത് സാധാരണ കാര്യമല്ല, ശ്രദ്ധിക്കണം.",
    "ഇവിടെ കാര്യങ്ങള്‍ സീരിയസാണ്, പോലീസ് വിളിക്കണേ.",
    "ഇത് വളരെ ഗുരുതരമായ കാര്യമാണ്.",
    "ഇവിടെ ഉടൻ നടപടിയെടുക്കണം.",
    "പോലീസ് ഇടപെടൽ ആവശ്യമുണ്ട്.",
    "ഇത് അപകടകരമായ സാഹചര്യമാണ്.",
]

MEDIUM_DANGER_DIALOGUES: List[str] = [
    "നോട്ടമിടാം, ഈ കാര്യം ചെറിയതല്ലായിരിക്കും.",
    "ഒന്ന് സീരിയസായി നോക്കാം, പക്ഷേ അത്ര ബഹളം വേണ്ട.",
    "ഇത് ശ്രദ്ധിക്കേണ്ട കാര്യമാണെങ്കിലും അത്ര വലിയതല്ല.",
    "നമുക്ക് ഒന്ന് നോക്കാം, പക്ഷേ പാനിക്കാവേണ്ട.",
    "ഇതിൽ കുറച്ച് ശ്രദ്ധ വേണം.",
    "ഇതിനെ കുറിച്ച് കൂടുതൽ വിവരങ്ങൾ അറിയണം.",
]


@dataclass
class AnalysisResult:
    score: float
    category: str
    matched_keywords: Dict[str, List[str]]
    chosen_dialogue: str


def _count_occurrences(text: str, keywords: List[str]) -> Tuple[int, List[str]]:
    """Count total keyword occurrences and list matched unique keywords.

    Uses simple substring counts which work reasonably well for Malayalam.
    """
    total_occurrences = 0
    matched_unique: List[str] = []
    for keyword in keywords:
        occurrences = text.count(keyword)
        if occurrences > 0:
            total_occurrences += occurrences
            matched_unique.append(keyword)
    return total_occurrences, matched_unique


def _estimate_drama_components(text: str) -> Dict[str, int]:
    """Estimate drama components that reduce threat perception.

    Components:
    - exclaim_groups: groups of !/?
    - elongations: repeated Malayalam vowel signs
    - latin_hype: hype words in Latin script
    - caps_shout: number of ALL-CAPS tokens (scaled)
    """
    exclaim_groups = len(re.findall(r"[!؟?]{2,}", text))
    elongations = len(re.findall(r"([ാിീുൂെേൈോൌ])\1{2,}", text))
    latin_hype = len(re.findall(r"\b(OMG|BREAKING|MASS|HYPE)\b", text, flags=re.IGNORECASE))
    caps_words = len(re.findall(r"\b[A-Z]{3,}\b", text))
    # Scale caps words so they don't dominate (1 unit per 3 caps words)
    caps_shout = caps_words // 3
    return {
        "exclaim_groups": exclaim_groups,
        "elongations": elongations,
        "latin_hype": latin_hype,
        "caps_shout": caps_shout,
    }


def _clamp(value: float, min_value: float, max_value: float) -> float:
    if value < min_value:
        return min_value
    if value > max_value:
        return max_value
    return value


def _categorize(score: float) -> str:
    if score < 35:
        return "low"
    if score < 70:
        return "medium"
    return "high"


def _choose_dialogue(category: str) -> str:
    from random import choice

    if category == "low":
        return choice(LOW_DANGER_DIALOGUES)
    if category == "high":
        return choice(HIGH_DANGER_DIALOGUES)
    return choice(MEDIUM_DANGER_DIALOGUES)


def analyze_text(input_text: str) -> AnalysisResult:
    """Analyze text for danger/noise keywords and compute a score and dialogue.

    Scoring (0-100):
    - Start at 30
    - +15 per danger occurrence
    - -10 per noise occurrence
    - -5 per drama penalty unit
    Clamped to [0, 100]
    """
    text = (input_text or "").strip()

    danger_occurrences, matched_danger = _count_occurrences(text, DANGER_KEYWORDS)
    noise_occurrences, matched_noise = _count_occurrences(text, NOISE_KEYWORDS)
    drama_components = _estimate_drama_components(text)
    drama_penalty_units = sum(drama_components.values())

    score = 30.0 + 15.0 * danger_occurrences - 10.0 * noise_occurrences - 5.0 * drama_penalty_units
    score = _clamp(score, 0.0, 100.0)

    category = _categorize(score)
    dialogue = _choose_dialogue(category)

    # Extra metrics for UI
    threat_index = float(danger_occurrences)
    noise_index = float(noise_occurrences + drama_penalty_units)
    total_index = max(threat_index + noise_index, 1.0)
    threat_percent = 100.0 * threat_index / total_index
    noise_percent = 100.0 * noise_index / total_index

    result = AnalysisResult(
        score=score,
        category=category,
        matched_keywords={
            "danger": matched_danger,
            "noise": matched_noise,
        },
        chosen_dialogue=dialogue,
    )

    # Monkey-patch attributes for backwards-compatible dataclass usage
    # (Pydantic model in app will expose these via a 'metrics' field.)
    result.danger_count = danger_occurrences  # type: ignore[attr-defined]
    result.noise_count = noise_occurrences  # type: ignore[attr-defined]
    result.drama_units = drama_penalty_units  # type: ignore[attr-defined]
    result.drama_breakdown = drama_components  # type: ignore[attr-defined]
    result.metrics = {  # type: ignore[attr-defined]
        "danger_count": danger_occurrences,
        "noise_count": noise_occurrences,
        "drama_units": drama_penalty_units,
        "drama_breakdown": drama_components,
        "threat_index": threat_index,
        "noise_index": noise_index,
        "threat_percent": threat_percent,
        "noise_percent": noise_percent,
    }

    return result


