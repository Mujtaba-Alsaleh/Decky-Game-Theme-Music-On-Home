import {
  ButtonItem,
  DialogButton,
  findSP,
  Focusable,
  PanelSection,
  PanelSectionRow,
  staticClasses
} from "@decky/ui";
import { definePlugin, callable } from "@decky/api";
import { useEffect, useState } from "react";
import { FaMusic } from "react-icons/fa";
import localforage from "localforage";

// --- Setup localForage ---
localforage.config({ name: "game-theme-music-cache" });
type GameThemeMusicCache = {
  videoId?: string;
  volume?: number;
};

// --- Logging ---
function log(msg: string) {
  console.log("[GTM]", msg);
}

// --- Backend callable ---
const _changeConvertQuality = callable<any,  null>("change_convert_quality");
const _deleteConvertedFiles = callable<any,  null>("delete_converted_audio");
const _convertedFilesCount = callable<any,  boolean>("get_converted_count");
const _resolveMusicPath = callable<[string], string | null>("resolve_music_path");
const resolveMusicPath = async (videoId: string): Promise<string | null> => {
  if (audioUrlCache[videoId]) {
    return audioUrlCache[videoId];
  }

  try {
    const result = await _resolveMusicPath(videoId);
    if (result) {
      audioUrlCache[videoId] = result;
    }
    return result ?? null;
  } catch (e) {
    log(`Backend error: ${e}`);
    return null;
  }
};

const _game_theme_music_install_check = callable<any,boolean>("game_theme_music_install_check");

// --- Audio ---
const audio = new Audio();
audio.volume = 1.0;
audio.loop = true;
let currentlyPlayingAppID = "";
let audioIsPlaying = false;
const audioUrlCache: Record<string, string> = {};


function playAudio(path: string) {
  if(audioIsPlaying)
    audio.pause();
  audio.src = path;
  audio.play().then(() => 
    {
      log("Audio playing"); 
      audioIsPlaying = true
    }
    ).catch(err => log(`Audio error: ${err}`));
}

function stopAudio() {
  if(audioIsPlaying)
    audio.pause();
  audio.currentTime = 0;
  audio.removeAttribute("src");
  audio.load();
  currentlyPlayingAppID = ""
  audioIsPlaying = false;
  log("Audio stopped");
}

async function getVideoIdFromAppId(appId: string): Promise<string | null> {
  if(appId == currentlyPlayingAppID)
    return null;
  try {
    const cache = await localforage.getItem<GameThemeMusicCache>(appId);
    return cache?.videoId ?? null;
  } catch (e) {
    log(`Cache error: ${e}`);
    return null;
  }
}


let hoverEnabled = true;
// --- Main UI ---
const Content = () => {
  const [GTMInstalled,setGTMinstalled] = useState(false)
  const [enabled,setEnabled] = useState(hoverEnabled);
  const convertQualityList = ["24k","32k","64k"];
  const [qualitydropactive,setQualityDropActive] = useState(false);
  const [canDeleteConverted,setCanDeleteConverted] = useState(false);

  useEffect(() => {
    _game_theme_music_install_check().then(setGTMinstalled);
  }, []);

    useEffect(() => {
    _convertedFilesCount().then(setCanDeleteConverted);
  }, []);

  const handleconvertQualityButtonClick = (quality: string) => {
    // Call the parent handler to handle the backend logic
    _changeConvertQuality(quality)
    
    // Hide the quality buttons after one is clicked
    setQualityDropActive(false);
  };

  const HandleDeleteConverted = () => 
  {
      if(!canDeleteConverted)
        return;

      _deleteConvertedFiles();
      setCanDeleteConverted(false)
  }

const toggleHover = () =>
{
  hoverEnabled = !hoverEnabled;
  setEnabled(hoverEnabled);
  stopAudio();
  log(`Hover playback ${hoverEnabled ? "enabled" : "disabled"}`)
}
  return (
    <PanelSection title="Game Theme Music for Home page">
      <PanelSectionRow>
        <Focusable>
          <DialogButton onClick={toggleHover}>🎮 Enable Plugin Home Detection: {enabled? "On ✅" : "Off ❌"}</DialogButton>
        </Focusable>
      </PanelSectionRow>
      <Focusable>
      <PanelSectionRow>
        <DialogButton onClick={()=>stopAudio()}>
          🔇 FORCE STOP AUDIO
        </DialogButton>
      </PanelSectionRow>
      </Focusable>
      <Focusable>
            <div>
            <div id="gtm-log-box" style={{
              whiteSpace: "pre-wrap",
              background: "#111",
              color: "#0f0",
              padding: "8px",
              height: "150px",
              overflowY: "auto",
              fontFamily: "monospace",
              fontSize: "0.75rem",
              border: "1px solid #333",
              borderRadius: "6px",
              marginTop: "10px"
            }}>
              {
              GTMInstalled?
              "Game Theme Music is installed ✅\n"+
              "Download theme music for your games using Game Theme Music plugin and enjoy listening to them in Home page"
              :
              "Game Theme Music is not installed ❌\n"+
              "Please Install Game Theme Music first, download some music to your games and enjoy listening to them in Home page"
            }

            </div>
          </div>
      </Focusable>
      
      <PanelSectionRow>

      <Focusable>
        <PanelSectionRow>
          <DialogButton onClick={() => setQualityDropActive(!qualitydropactive)}>
            {qualitydropactive ? 'Hide Quality Options' : 'Show Quality Options'}
          </DialogButton>
        </PanelSectionRow>
        </Focusable>
      </PanelSectionRow>

      <Focusable>
      {qualitydropactive && (
        <PanelSectionRow>
          {convertQualityList.map((quality, index) => (
            <ButtonItem key={index} layout="below" onClick={() => handleconvertQualityButtonClick(quality)}>
              <span>{quality}</span>
            </ButtonItem>
          ))}
          <div>
          recommended quality is 32k for balance audio quality and file size.
        </div>
        </PanelSectionRow>
      )}
      </Focusable>
      <PanelSectionRow>
      <Focusable>
      {canDeleteConverted && (
        <PanelSectionRow>
          <DialogButton onClick={HandleDeleteConverted}>
            Delete Converted Files
          </DialogButton>
        </PanelSectionRow>
      )}
      </Focusable>
      </PanelSectionRow>

      <PanelSectionRow>
        {!canDeleteConverted &&(
          <div>
            No Cache/Converted Files yet
          </div>
        )}
      </PanelSectionRow>

    </PanelSection>
  );
};

// --- Plugin export ---
export default definePlugin(() => {
  log("Plugin loaded.");
  const sp = findSP();
  let cleanup = () => { };

  if (sp && sp.addEventListener) {
    const handleFocusIn = async (event: FocusEvent) => {
      if (!hoverEnabled) 
        return;

      if(!window.location.href.includes("/library/home"))
      {
        stopAudio();
        //Clear cache upon leaving home as user might change game theme or trying to start a game
        Object.keys(audioUrlCache).forEach(k=>delete audioUrlCache[k]);
        return;
      }
      const active = event.target as Element | null;
      const tile = active?.closest?.("[data-id]");
      if (!tile) return;

      const appId = tile.getAttribute("data-id");
      if (!appId)
        return log("No AppID found on focused tile");;
      

      log(`Focused tile with AppID: ${appId}`);
      if(appId == currentlyPlayingAppID)
        return log("changed appid is the same for playing appid");

      const videoId = await getVideoIdFromAppId(appId);
      if (!videoId) 
      {
        stopAudio();
        return log("No videoId in cache");
      }
      const path = await resolveMusicPath(videoId);
      if (!path) 
      {
        stopAudio();
        return log("No music path returned")
      };
      currentlyPlayingAppID = appId;
      stopAudio(); // in case something is already playing
      playAudio(path);
    };

    sp.addEventListener("focusin", handleFocusIn);
    log("Attached focusin listener");

    cleanup = () => {
      sp.removeEventListener("focusin", handleFocusIn);
      stopAudio();
      log("Removed focusin listener");
    };
  } else {
    log("SP root not found or does not support event listener");
  }
  return {
    name: "Game Theme Music for home",
    title: <div className={staticClasses.Title}>Game Theme Music hooker plugin to play in Home</div>,
    content: <Content />,
    icon: <FaMusic />,
    onDismount() {
      cleanup();
      currentlyPlayingAppID = ""
      Object.keys(audioUrlCache).forEach(k=>delete audioUrlCache[k]);
      log("Cleared audio urls cache");
    }
  };
});
