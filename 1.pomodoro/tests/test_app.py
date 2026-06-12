import importlib.util
import unittest
from pathlib import Path


def load_app_module():
    app_path = None
    for candidate_root in Path(__file__).resolve().parents:
        candidate_app_path = candidate_root / "1.pomodoro" / "app.py"
        if candidate_app_path.exists():
            app_path = candidate_app_path
            break
    if app_path is None:
        raise FileNotFoundError("Pomodoro app module not found from test path hierarchy")
    # ディレクトリ名にドットを含むため通常 import では読み込めない。
    spec = importlib.util.spec_from_file_location("pomodoro_app", app_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


app = load_app_module()


class PomodoroSettingsTest(unittest.TestCase):
    def test_work_duration_can_be_selected_from_supported_values(self):
        settings = app.PomodoroSettings()
        for minutes in (15, 25, 35, 45):
            settings.set_work_duration(minutes)
            self.assertEqual(settings.work_duration, minutes)

    def test_break_duration_can_be_selected_from_supported_values(self):
        settings = app.PomodoroSettings()
        for minutes in (5, 10, 15):
            settings.set_break_duration(minutes)
            self.assertEqual(settings.break_duration, minutes)

    def test_theme_can_be_switched_to_supported_modes(self):
        settings = app.PomodoroSettings()
        for theme in ("dark", "light", "focus"):
            settings.set_theme(theme)
            self.assertEqual(settings.theme, theme)

    def test_sound_can_be_enabled_or_disabled_per_type(self):
        settings = app.PomodoroSettings()
        for sound_type in ("start", "end", "tick"):
            settings.set_sound(sound_type, False)
            self.assertFalse(settings.sound[sound_type])
            settings.set_sound(sound_type, True)
            self.assertTrue(settings.sound[sound_type])

    def test_invalid_values_raise_value_error(self):
        settings = app.PomodoroSettings()
        with self.assertRaises(ValueError):
            settings.set_work_duration(20)
        with self.assertRaises(ValueError):
            settings.set_break_duration(20)
        with self.assertRaises(ValueError):
            settings.set_theme("blue")
        with self.assertRaises(ValueError):
            settings.set_sound("alarm", True)


if __name__ == "__main__":
    unittest.main()
