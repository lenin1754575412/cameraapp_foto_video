import * as MediaLibrary from "expo-media-library/legacy";
import React, { useRef, useState } from "react";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Alert, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";

function VideoPreview({ uri }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.play(); });
  return <VideoView player={player} style={styles.camera} contentFit="contain" nativeControls />;
}

export default function App() {
  const cameraRef = useRef(null);
const [galleryPermission, requestGalleryPermission] = MediaLibrary.usePermissions({
    writeOnly: true
});

async function saveToGallery(uri) {
    if (!uri) throw new Error("No se encontro el archivo");

    let granted = galleryPermission?.granted;

    if (!granted) {
        const permission = await requestGalleryPermission();
        granted = permission.granted;
    }

    if (!granted) {
        Alert.alert("Permiso necesario", "Debes permitir guardar fotos y videos en la galeria.");
        return false;
    }

    await MediaLibrary.saveToLibraryAsync(uri);
    return true;
}
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState("back");
  const [mode, setMode] = useState("picture");
  const [recording, setRecording] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  async function capture() {
    if (!cameraRef.current || busy || !cameraReady) return;
    setBusy(true);
    try {
      const result = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (result?.uri) {
        const saved = await saveToGallery(result.uri);
        setPreview({ type: "picture", uri: result.uri });
        if (saved) Alert.alert("Foto guardada", "La foto se guardo en tu galeria.");
      }
    } catch (e) { Alert.alert("Error al tomar foto", String(e.message || e)); }
    finally { setBusy(false); }
  }

  async function toggleRecord() {
    if (recording) {
      cameraRef.current?.stopRecording();
      return;
    }
    if (!cameraRef.current || busy || !cameraReady) return;
    if (!micPermission?.granted) {
      const result = await requestMicPermission();
      if (!result.granted) {
        Alert.alert("Permiso necesario", "Permite el micrÃ³fono para grabar videos con audio.");
        return;
      }
    }
    setRecording(true);
    try {
      const result = await cameraRef.current.recordAsync();
      if (result?.uri) {
        const saved = await saveToGallery(result.uri);
        setPreview({ type: "video", uri: result.uri });
        if (saved) Alert.alert("Video guardado", "El video se guardo en tu galeria.");
      }
    } catch (e) {
      Alert.alert("Error al grabar", String(e.message || e));
    } finally { setRecording(false); }
  }

  if (!cameraPermission) return <View style={styles.center}><ActivityIndicator /></View>;
  if (!cameraPermission.granted) {
    return <View style={styles.center}>
      <Text style={styles.title}>{" Cámara y video"}</Text>
      <Text style={styles.info}>{"Necesitamos acceso a la cámara para tomar fotos y grabar videos."}</Text>
      <TouchableOpacity style={styles.primary} onPress={requestCameraPermission}><Text style={styles.white}>{"Permitir cámara"}</Text></TouchableOpacity>
    </View>;
  }

  const changeMode = (next) => {
    if (recording || busy) return;
    setPreview(null);
    setCameraReady(false);
    setMode(next);
  };

  return <SafeAreaView style={styles.container}>
    <StatusBar style="light" />
    <Text style={styles.title}>{" Mi Cámara"}</Text>
    <Text style={styles.subtitle}>{"Fotos y videos - Expo SDK 58"}</Text>
    <View style={styles.frame}>
      {preview?.type === "picture" ? <Image source={{uri:preview.uri}} style={styles.camera} resizeMode="contain" /> :
       preview?.type === "video" ? <VideoPreview uri={preview.uri} /> :
       <CameraView key={mode + facing} ref={cameraRef} style={styles.camera} facing={facing} mode={mode} mute={false}  onCameraReady={() => setCameraReady(true)} />}
    </View>
    {preview ? <View style={styles.controls}>
      <TouchableOpacity style={styles.primary} onPress={() => setPreview(null)}><Text style={styles.white}>{"↩ Volver a cámara"}</Text></TouchableOpacity>
    </View> : <>
      <View style={styles.modes}>
        <TouchableOpacity onPress={() => changeMode("picture")} style={[styles.mode, mode==="picture" && styles.active]}>
          <Text style={styles.white}>FOTO</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => changeMode("video")} style={[styles.mode, mode==="video" && styles.active]}>
          <Text style={styles.white}>VIDEO</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity disabled={recording} style={styles.secondary} onPress={() => setFacing(v => v==="back"?"front":"back")}>
          <Text style={styles.white}>{" Girar"}</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={busy} style={[styles.primary, recording && styles.stop]} onPress={mode==="picture"?capture:toggleRecord}>
          <Text style={styles.white}>{mode === "picture" ? "● Tomar foto" : recording ? "■ Detener" : "🔴 Grabar"}</Text>
        </TouchableOpacity>
      </View>
    </>}
    <Text style={styles.note}>{"Las fotos y videos se guardan automáticamente en la galería."}</Text>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:"#0f172a",paddingTop:32},
  center:{flex:1,alignItems:"center",justifyContent:"center",padding:24,backgroundColor:"#0f172a"},
  title:{fontSize:28,fontWeight:"bold",color:"white",textAlign:"center"},
  subtitle:{fontSize:14,color:"#94a3b8",textAlign:"center",marginBottom:16},
  info:{color:"white",fontSize:16,textAlign:"center",marginVertical:20},
  frame:{flex:1,marginHorizontal:16,borderRadius:22,overflow:"hidden",backgroundColor:"#1e293b"},
  camera:{flex:1,width:"100%"},
  modes:{flexDirection:"row",justifyContent:"center",gap:12,marginTop:14},
  mode:{paddingHorizontal:28,paddingVertical:12,borderRadius:14,backgroundColor:"#334155"},
  active:{backgroundColor:"#2563eb"},
  controls:{flexDirection:"row",justifyContent:"center",gap:14,marginVertical:18},
  primary:{backgroundColor:"#2563eb",paddingVertical:16,paddingHorizontal:23,borderRadius:14},
  secondary:{backgroundColor:"#334155",paddingVertical:16,paddingHorizontal:23,borderRadius:14},
  stop:{backgroundColor:"#dc2626"},
  white:{color:"white",fontWeight:"700",fontSize:16},
  note:{color:"#94a3b8",textAlign:"center",fontSize:12,marginBottom:16,paddingHorizontal:12}
});

