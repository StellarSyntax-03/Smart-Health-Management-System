import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { View } from "react-native";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";

export interface SilentCameraRef {
  capturePhotos: () => Promise<string[]>;
}

export default forwardRef<SilentCameraRef>(function SilentCamera(_props, ref) {
  const cameraRef = useRef<any>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [active, setActive] = useState(false);
  const readyRef = useRef(false);

  function waitForReady(): Promise<void> {
    return new Promise((resolve) => {
      if (readyRef.current) {
        resolve();
        return;
      }
      const check = setInterval(() => {
        if (readyRef.current) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        resolve();
      }, 3000);
    });
  }

  useImperativeHandle(ref, () => ({
    capturePhotos: async () => {
      if (!permission?.granted) {
        const result = await requestPermission();
        if (!result.granted) return [];
      }

      const uris: string[] = [];
      readyRef.current = false;
      setActive(true);
      setFacing("back");

      await new Promise((r) => setTimeout(r, 1000));
      await waitForReady();

      try {
        if (cameraRef.current) {
          const backPhoto = await cameraRef.current.takePicture({ quality: 0.5, skipProcessing: true });
          if (backPhoto?.uri) uris.push(backPhoto.uri);
        }
      } catch (e) {
        console.log("[SilentCamera] back capture failed:", e);
      }

      readyRef.current = false;
      setFacing("front");
      await new Promise((r) => setTimeout(r, 1000));
      await waitForReady();

      try {
        if (cameraRef.current) {
          const frontPhoto = await cameraRef.current.takePicture({ quality: 0.5, skipProcessing: true });
          if (frontPhoto?.uri) uris.push(frontPhoto.uri);
        }
      } catch (e) {
        console.log("[SilentCamera] front capture failed:", e);
      }

      setActive(false);
      console.log("[SilentCamera] captured URIs:", uris);
      return uris;
    },
  }));

  if (!active) return null;

  return (
    <View style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }}>
      <CameraView
        ref={cameraRef}
        facing={facing}
        style={{ width: 1, height: 1 }}
        onCameraReady={() => { readyRef.current = true; }}
      />
    </View>
  );
});
