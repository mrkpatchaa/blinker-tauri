import { useState, useEffect } from "react";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/api/notification";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/tauri";
import { SettingsManager } from "tauri-settings";

const settingsManager = new SettingsManager(
  {
    // defaults
    launchOnStartup: true,
    playSound: true,
  },
  {
    // options
    fileName: "settings",
  }
);
const expositionTime = 20 * 60 * 1000;
// const expositionTime = 10 * 1000;
const breakTime = 20 * 1000;
// const breakTime = 10 * 1000;
const timers = {};

const startTimer = (key, interval, cb = () => {}) => {
  timers[key] = setTimeout(() => {
    cb();
  }, interval);
};

const stopTimer = (key, cb = () => {}) => {
  clearTimeout(timers[key]);
  cb();
};

function App() {
  const [started, setStarted] = useState(true);
  let permissionGranted;

  const takeABreak = () => {
    console.log("Take a break from the screen!");
    stopTimer("main");
    if (permissionGranted) {
      sendNotification({
        title: "Take a break from the screen!",
        body: "Your eyes need to rest buddy.",
        icon: "icons/eye.png",
        // sound: playSound, // not supported yet in tauri
      });
    }

    startTimer("break", breakTime, () => {
      console.log("Go back to work !");
      if (permissionGranted) {
        sendNotification({
          title: "Go back to work !",
          body: "Yay !",
          icon: "icons/eye.png",
          // sound: playSound, // not supported yet in tauri
        });
      }
      startTimer("main", expositionTime, takeABreak);
    });
  };

  const eventHandler = async (event) => {
    console.log(event);
    // setStarted(true);
    // await invoke("set_menu_item", { id: "", msgType: `count` });
    switch (event?.payload?.message) {
      case "playSound":
      case "launchOnStartup":
        {
          const settingValue = await settingsManager.get(
            event?.payload?.message
          );
          await settingsManager.set(event?.payload?.message, !settingValue);
          await invoke("set_menu_item", {
            id: event?.payload?.message,
            msgType: settingValue ? "deactivate" : "activate",
          });
          //   notifier.notify({
          //     title: 'Startup status changed',
          //     message: launchOnStartup ? 'You will have to launch the application every time you log in' : 'Great! Application will launch on system startup',
          //     icon: path.join(__dirname, 'icons/eye.png'),
          //     contentImage: '',
          //     sound: playSound
          // })
        }
        break;

      case "toggleTimer":
        if (started) {
          stopTimer("main");
          stopTimer("break");
        } else {
          startTimer("main", expositionTime, takeABreak);
        }
        await invoke("set_menu_item", {
          id: event?.payload?.message,
          msgType: started ? "deactivate" : "activate",
        });
        setStarted(!started);

        break;
      default:
        break;
    }
  };

  useEffect(() => {
    startTimer("main", expositionTime, takeABreak);
    let unlisten = () => {};
    async function checkPermission() {
      unlisten = await listen("menu-item-click", eventHandler);
      permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === "granted";
      }
    }
    async function initializeSettings() {
      await settingsManager.initialize();
      try {
        const launchOnStartup = await settingsManager.get("launchOnStartup");
        if (launchOnStartup) {
          await invoke("set_menu_item", {
            id: "launchOnStartup",
            msgType: "activate",
          });
        }
        const hasPlaySound = await settingsManager.get("playSound");
        if (hasPlaySound) {
          await invoke("set_menu_item", {
            id: "playSound",
            msgType: "activate",
          });
        }
      } catch (error) {
        console.log(error);
      }
    }

    initializeSettings();
    checkPermission();

    return () => {
      unlisten();
    };
  }, []);

  return (
    <div
      style={{
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        width: "100%",
        fontFamily: "monospace",
      }}
    >
      <h1>Give your eyes a rest will ya!</h1>
      <p style={{ lineHeight: "1.5rem" }}>
        Inspired by the 20 20 20 rule, this is a little reminder to look 20 feet
        away from your screen every 20 minutes. Keep your eyes healthy, reduce
        eye strain, prevent headaches and increase productivity.
      </p>
      {/* <Box pos="absolute" top="0" right="0">
        <Button
          onClick={onOpen}
          variant="ghost"
          _hover={{ background: "transparent" }}
        >
          About
        </Button>
      </Box>
      {!started && (
        <Button
          fontWeight="bold"
          fontSize="2xl"
          variant="ghost"
          borderBottomWidth={4}
          borderBottomRadius={0}
          _hover={{ background: "transparent", borderBottomColor: "gray.800" }}
          onClick={() => {
            setStarted(true);
            startTimer("main", expositionTime, takeABreak);
          }}
        >
          start
        </Button>
      )}
      {started && (
        <Button
          fontWeight="bold"
          fontSize="2xl"
          variant="ghost"
          _hover={{ background: "transparent" }}
          borderBottomWidth={4}
          borderBottomRadius={0}
          onClick={() => {
            setStarted(false);
            stopTimer("main");
            stopTimer("break");
          }}
        >
          stop
        </Button>
      )} */}
    </div>
  );
}

export default App;
