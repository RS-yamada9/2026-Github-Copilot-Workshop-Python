"""Pomodoro Timer App settings."""

from dataclasses import dataclass, field

ALLOWED_WORK_DURATIONS = (15, 25, 35, 45)
ALLOWED_BREAK_DURATIONS = (5, 10, 15)
ALLOWED_THEMES = ("dark", "light", "focus")
ALLOWED_SOUND_TYPES = ("start", "end", "tick")


@dataclass
class PomodoroSettings:
    work_duration: int = 25
    break_duration: int = 5
    theme: str = "light"
    sound: dict[str, bool] = field(
        default_factory=lambda: {"start": True, "end": True, "tick": True}
    )

    def set_work_duration(self, minutes: int) -> None:
        if minutes not in ALLOWED_WORK_DURATIONS:
            raise ValueError(f"Unsupported work duration: {minutes}")
        self.work_duration = minutes

    def set_break_duration(self, minutes: int) -> None:
        if minutes not in ALLOWED_BREAK_DURATIONS:
            raise ValueError(f"Unsupported break duration: {minutes}")
        self.break_duration = minutes

    def set_theme(self, theme: str) -> None:
        if theme not in ALLOWED_THEMES:
            raise ValueError(f"Unsupported theme: {theme}")
        self.theme = theme

    def set_sound(self, sound_type: str, enabled: bool) -> None:
        if sound_type not in ALLOWED_SOUND_TYPES:
            raise ValueError(f"Unsupported sound type: {sound_type}")
        self.sound[sound_type] = enabled
