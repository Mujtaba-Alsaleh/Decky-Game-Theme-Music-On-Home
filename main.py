from pathlib import Path
import decky # type: ignore
import mimetypes
import base64
import json
import subprocess
import os

MUSIC_DIR = Path.home() / "homebrew/data/SDH-GameThemeMusic/music"
LOADER_SETTINGS_JSON = Path.home() / "homebrew/settings/loader.json"
CONVERTED_DIR = MUSIC_DIR / "converted"

class Plugin:
    async def _main(self):
        decky.logger.info("Plugin initialized!")
        decky.logger.info(MUSIC_DIR)
        if not CONVERTED_DIR.exists():
            os.makedirs(CONVERTED_DIR)
        pass

    async def _unload(self):
        decky.logger.info("Plugin unloaded!")
        pass

    async def _uninstall(self):
        decky.logger.info("Plugin uninstalled!")
        pass
    
    async def game_theme_music_install_check(self) -> bool:
        if not LOADER_SETTINGS_JSON.exists():
            decky.logger.info("Loader.json not found")
            return False
        with open(LOADER_SETTINGS_JSON,'r') as f:
            data = json.load(f)
            f.close()
             
        return data["pluginOrder"].__contains__("Game Theme Music")

    async def resolve_music_path(self, video_id: str) -> str | None:
        for file in MUSIC_DIR.iterdir():
            if video_id in file.name and file.suffix == ".webm":
                converted = CONVERTED_DIR / (video_id + ".opus")
                if not converted.exists():
                    self.convert_to_opus(file, converted)

                with open(converted, "rb") as f:
                    encoded = base64.b64encode(f.read()).decode("utf-8")
                    return f"data:audio/ogg;base64,{encoded}"

        return None
    
    def convert_to_opus(self,source: Path, target: Path):
        clean_env = os.environ.copy()
        clean_env["LD_LIBRARY_PATH"] = ""
        subprocess.run([
            "ffmpeg", "-y", "-i", str(source),
            "-c:a", "libopus", "-b:a", "32k",
            str(target)
        ], env=clean_env,check=True)