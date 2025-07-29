from pathlib import Path
import decky # type: ignore
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
        self.convert_quality = "32k"
        self.converted_count:int = 0
        await self.update_converted_count()
        if not CONVERTED_DIR.exists():
            os.makedirs(CONVERTED_DIR)
        pass

    async def _unload(self):
        decky.logger.info("Plugin unloaded!")
        pass

    async def _uninstall(self):
        decky.logger.info("Plugin uninstalled!")
        pass
    

    async def update_converted_count(self) -> None:
        self.converted_count = 0
        for file in CONVERTED_DIR.iterdir():
            self.converted_count += 1
        decky.logger.info(f"converted count: {self.converted_count}")

    async def get_converted_count(self) -> bool:
        return self.converted_count > 0

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
                    await self.convert_to_opus(file, converted)

                with open(converted, "rb") as f:
                    encoded = base64.b64encode(f.read()).decode("utf-8")
                    return f"data:audio/ogg;base64,{encoded}"

        return None
    async def change_convert_quality(self,value:str) -> None:
        self.change_convert_quality = value
    
    async def delete_converted_audio(self) -> None:
        for file in CONVERTED_DIR.iterdir():
            if os.path.isfile(file):
                os.remove(file)
    
    async def convert_to_opus(self,source: Path, target: Path):
        clean_env = os.environ.copy()
        clean_env["LD_LIBRARY_PATH"] = ""
        subprocess.run([
            "ffmpeg", "-y", "-i", str(source),
            "-c:a", "libopus", "-b:a", self.convert_quality,
            str(target)
        ], env=clean_env,check=True)
        await self.update_converted_count()