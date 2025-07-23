from pathlib import Path
import decky # type: ignore
import mimetypes
import base64
import json

MUSIC_DIR = Path.home() / "homebrew/data/SDH-GameThemeMusic/music"
LOADER_SETTINGS_JSON = Path.home() / "homebrew/settings/loader.json"

audio_cache: dict[str,str] = {}

class Plugin:
    async def _main(self):
        decky.logger.info("Plugin initialized!")
        decky.logger.info(MUSIC_DIR)
        pass

    async def _unload(self):
        decky.logger.info("Plugin unloaded!")
        try:
            audio_cache.clear()
            decky.logger.info("clearing audio_cache upon unloading")
        except:
            decky.logger.info("Error clearing audio_cache upon unloading")
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
        if video_id in audio_cache:
            return audio_cache[video_id]

        decky.logger.info(f"[AudioHook] Resolving path for video_id: {video_id}")
        if not MUSIC_DIR.exists():
            decky.logger.info(f"[AudioHook] Music dir does not exist: {MUSIC_DIR}")
            return None

        for file in MUSIC_DIR.iterdir():
            if video_id in file.name:
                decky.logger.info(f"[AudioHook] Found matching file: {file}")
                with open(file, "rb") as f:
                    encoded = base64.b64encode(f.read()).decode("utf-8")
                    mime_type = mimetypes.guess_type(file.name)[0] or "audio/webm"
                    data_url = f"data:{mime_type};base64,{encoded}"
                    audio_cache[video_id] = data_url
                    decky.logger.info(f"[AudioHook] Returning data URL for: {file.name}")
                    return [data_url]

        decky.logger.info(f"[AudioHook] No file found for video_id: {video_id}")
        return None