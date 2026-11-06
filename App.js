import * as Location from 'expo-location';
import React, { useRef, useState, useEffect } from 'react';
import {
  Alert, Image, Modal, Platform, Pressable, SafeAreaView,
  StatusBar, StyleSheet, Text, View, ActivityIndicator
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions
} from 'expo-camera';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';

const AMARILLO = '#ffcb18';
const avisar = (titulo, detalle) => Alert.alert(titulo, detalle);
const dormir = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function BotonIcono({ icono, onPress, activo = false, deshabilitado = false }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      style={[
        est.iconoBoton,
        activo && est.iconoActivo,
        deshabilitado && est.opaco
      ]}
    >
      <Ionicons
        name={icono}
        size={24}
        color={activo ? AMARILLO : '#fff'}
      />
    </Pressable>
  );
}

function VistaVideo({ uri }) {
  const player = useVideoPlayer(uri, p => {
    p.loop = true;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={{ flex: 1 }}
      contentFit="contain"
      nativeControls
    />
  );
}

export default function App() {
  // GPS_UBICACION_CAMARA
  const [ubicacionGPS, setUbicacionGPS] = useState(null);
  const [mostrarGPS, setMostrarGPS] = useState(true);
  const [cargandoGPS, setCargandoGPS] = useState(false);
  const [fechaGPS, setFechaGPS] = useState(new Date());

  useEffect(() => {
    const intervalo = setInterval(() => {
      setFechaGPS(new Date());
    }, 30000);

    return () => clearInterval(intervalo);
  }, []);

  async function actualizarGPS() {
    if (cargandoGPS) return;

    setCargandoGPS(true);

    try {
      const permiso =
        await Location.requestForegroundPermissionsAsync();

      if (permiso.status !== 'granted') {
        Alert.alert(
          'Ubicacion',
          'Debes permitir la ubicacion en tu celular.'
        );
        return;
      }

      const posicion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      const lat = posicion.coords.latitude;
      const lon = posicion.coords.longitude;

      let direccion = 'Ubicacion GPS';

      try {
        const datos = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lon
        });

        if (datos.length > 0) {
          const d = datos[0];

          direccion = [
            d.street,
            d.city || d.subregion,
            d.region,
            d.country
          ].filter(Boolean).join(', ');
        }
      } catch (_) {
        // Las coordenadas siguen disponibles.
      }

      setUbicacionGPS({
        latitud: lat,
        longitud: lon,
        direccion,
        precision: posicion.coords.accuracy
      });

      setFechaGPS(new Date());

    } catch (error) {
      Alert.alert(
        'GPS',
        'No se pudo obtener la ubicacion. Activa el GPS e intenta otra vez.'
      );
    } finally {
      setCargandoGPS(false);
    }
  }
  const camara = useRef(null);
  const ocupado = useRef(false);
  const grabandoRef = useRef(false);
  const vivo = useRef(true);

  const [permisoCamara, pedirCamara] = useCameraPermissions();
  const [permisoMicro, pedirMicro] = useMicrophonePermissions();

  const [modo, setModo] = useState('picture');
  const [modoExtra, setModoExtra] = useState('Foto');
  const [filtro, setFiltro] = useState('Normal');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const filtros = [
    { nombre: 'Normal', color: 'transparent' },
    { nombre: 'Calido', color: '#ffae0025' },
    { nombre: 'Frio', color: '#168bff25' },
    { nombre: 'Vintage', color: '#98602035' },
    { nombre: 'Rosa', color: '#ff408125' },
    { nombre: 'Verde', color: '#35a85325' },
    { nombre: 'Nocturno', color: '#080b2035' }
  ];
  const [frente, setFrente] = useState('back');
  const [lista, setLista] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [herramientas, setHerramientas] = useState(false);
  const [flash, setFlash] = useState('off');
  const [linterna, setLinterna] = useState(false);
  const [temporizador, setTemporizador] = useState(0);
  const [cuenta, setCuenta] = useState(null);
  const [zoom, setZoom] = useState(0);
  const [proporcion, setProporcion] = useState('4:3');
  const [cuadricula, setCuadricula] = useState(false);
  const [rafaga, setRafaga] = useState(false);
  const [ultimo, setUltimo] = useState(null);
  const [vista, setVista] = useState(null);

  useEffect(() => () => {
    vivo.current = false;
    if (grabandoRef.current) {
      try {
        camara.current?.stopRecording();
      } catch (_) {}
    }
  }, []);

  async function guardar(uri) {
    if (!uri) {
      throw new Error('La camara no devolvio un archivo.');
    }

    // En Android moderno no pedimos permiso de lectura
    // para guardar archivos nuevos en la galeria.
    // Esto evita solicitar READ_MEDIA_AUDIO en Expo Go.
    if (Platform.OS === 'ios') {
      const permiso = await MediaLibrary.requestPermissionsAsync(
        true, ['photo', 'video']
      );
      if (!permiso.granted) {
        throw new Error('Concede permiso para agregar fotos.');
      }
    }

    await MediaLibrary.saveToLibraryAsync(uri);
  }

  async function esperarCuenta() {
    for (let i = temporizador; i > 0; i--) {
      if (!vivo.current) return false;
      setCuenta(i);
      await dormir(1000);
    }
    setCuenta(null);
    return vivo.current;
  }

  async function foto() {
    if (ocupado.current || grabandoRef.current || !lista) return;

    ocupado.current = true;
    setTrabajando(true);

    try {
      if (!(await esperarCuenta())) return;

      const cantidad = rafaga ? 3 : 1;
      let guardadas = 0;

      for (let i = 0; i < cantidad; i++) {
        const resultado = await camara.current?.takePictureAsync({
          quality: 0.9
        });

        if (!resultado?.uri) {
          throw new Error('No se pudo capturar la foto.');
        }

        await guardar(resultado.uri);
        guardadas++;

        setUltimo({
          uri: resultado.uri,
          tipo: 'image'
        });

        if (i < cantidad - 1) await dormir(350);
      }

      avisar(
        'Guardado',
        guardadas === 1
          ? 'Foto guardada en la galeria.'
          : `${guardadas} fotos guardadas en la galeria.`
      );
    } catch (e) {
      avisar('Error al guardar la foto', e.message || String(e));
    } finally {
      ocupado.current = false;
      if (vivo.current) {
        setTrabajando(false);
        setCuenta(null);
      }
    }
  }

  async function empezarVideo() {
    if (ocupado.current || grabandoRef.current || !lista) return;

    ocupado.current = true;
    setTrabajando(true);

    try {
      if (!permisoMicro?.granted) {
        const resultado = await pedirMicro();
        if (!resultado.granted) {
          throw new Error('Activa el microfono para grabar video.');
        }
      }

      if (!(await esperarCuenta())) return;

      if (!camara.current) {
        throw new Error('La camara no esta disponible.');
      }

      grabandoRef.current = true;
      setGrabando(true);
      ocupado.current = false;
      setTrabajando(false);

      const resultado = await camara.current.recordAsync({
        maxDuration: 300
      });

      if (resultado?.uri) {
        await guardar(resultado.uri);
        setUltimo({
          uri: resultado.uri,
          tipo: 'video'
        });

        avisar('Guardado', 'Video guardado en la galeria.');
      } else {
        avisar(
          'Grabacion detenida',
          'No se genero un video para guardar.'
        );
      }
    } catch (e) {
      avisar('Error al grabar video', e.message || String(e));
    } finally {
      ocupado.current = false;
      grabandoRef.current = false;

      if (vivo.current) {
        setTrabajando(false);
        setGrabando(false);
        setCuenta(null);
      }
    }
  }

  function detenerVideo() {
    if (!grabandoRef.current) return;
    try {
      camara.current?.stopRecording();
    } catch (e) {
      avisar('Error', e.message);
    }
  }

  function elegirModo(siguiente) {
    if (ocupado.current || grabandoRef.current || modo === siguiente) {
      return;
    }

    setLista(false);
    setLinterna(false);
    setHerramientas(false);
    setModo(siguiente);
    setModoExtra(siguiente === 'video' ? 'Video' : 'Foto');
  }

  function girar() {
    if (ocupado.current || grabandoRef.current) return;

    setLista(false);
    setFlash('off');
    setLinterna(false);
    setFrente(v => v === 'back' ? 'front' : 'back');
  }

  async function abrirGaleria() {
    if (grabandoRef.current || ocupado.current) return;

    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 1
      });

      if (!r.canceled && r.assets?.length) {
        const a = r.assets[0];
        setVista({
          uri: a.uri,
          tipo: a.type === 'video' ? 'video' : 'image'
        });
      }
    } catch (e) {
      avisar('No se pudo abrir la galeria', e.message);
    }
  }

  const enVideo = modo === 'video';
  const sinCambios = grabando || trabajando;
  const opcionesTemporizador = [0, 3, 5, 10];

  function herramienta(
    icono, nombre, onPress, activo = false, deshabilitado = false
  ) {
    return (
      <Pressable
        key={nombre}
        onPress={onPress}
        disabled={sinCambios}
        style={[
          est.herramienta,
          activo && est.herramientaActiva
        ]}
      >
        <Ionicons
          name={icono}
          size={25}
          color={activo ? AMARILLO : '#e9e9e9'}
        />
        <Text style={[
          est.herramientaTexto,
          activo && { color: AMARILLO }
        ]}>
          {nombre}
        </Text>
        {deshabilitado && (
          <Text style={est.etiquetaNo}>NO NATIVO</Text>
        )}
      </Pressable>
    );
  }

  if (!permisoCamara) {
    return (
      <View style={est.centro}>
        <ActivityIndicator color={AMARILLO} />
      </View>
    );
  }

  if (!permisoCamara.granted) {
    return (
      <View style={est.centro}>
        <Ionicons name="camera-outline" color="white" size={64} />
        <Text style={est.permisoTitulo}>Mi Camara</Text>
        <Text style={est.permisoTexto}>
          Para mostrar la imagen necesitamos permiso de camara.
        </Text>
        <Pressable onPress={pedirCamara} style={est.permisoBoton}>
          <Text style={est.permisoBotonTexto}>Permitir camara</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={est.pagina}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={est.barraSuperior}>
        <BotonIcono
          icono={linterna ? 'flashlight' : 'flashlight-outline'}
          activo={linterna}
          deshabilitado={sinCambios || frente === 'front'}
          onPress={() => setLinterna(v => !v)}
        />

        <BotonIcono
          icono="timer-outline"
          activo={temporizador > 0}
          deshabilitado={sinCambios}
          onPress={() =>
            setTemporizador(v =>
              opcionesTemporizador[
                (opcionesTemporizador.indexOf(v) + 1)
                % opcionesTemporizador.length
              ]
            )
          }
        />

        <Pressable
          disabled={sinCambios}
          style={est.proporcionBoton}
          onPress={() =>
            setProporcion(v =>
              v === '4:3' ? '16:9'
                : v === '16:9' ? '1:1' : '4:3'
            )
          }
        >
          <Text style={est.proporcionTexto}>{proporcion}</Text>
        </Pressable>

        <BotonIcono
          icono={herramientas ? 'chevron-up' : 'chevron-down'}
          activo={herramientas}
          deshabilitado={sinCambios}
          onPress={() => setHerramientas(v => !v)}
        />

        <BotonIcono
          icono="settings-outline"
          deshabilitado={sinCambios}
          onPress={() => avisar(
            'Controles',
            'Flash, temporizador, proporciones, zoom, cuadricula y rafaga disponibles. HDR, IA y modo Pro nativos requieren desarrollo adicional.'
          )}
        />
      </View>

      <View style={est.areaCamara}>
        {!vista && (
          <CameraView
            key={`${modo}-${frente}`}
            ref={camara}
            style={StyleSheet.absoluteFill}
            facing={frente}
            mode={modo}
            ratio={Platform.OS === 'android' ? proporcion : undefined}
            flash={!enVideo && frente === 'back' ? flash : 'off'}
            enableTorch={linterna && frente === 'back'}
            zoom={zoom}
            onCameraReady={() => setLista(true)}
            onMountError={e =>
              avisar(
                'Camara no disponible',
                e.message || 'Revisa permisos.'
              )
            }
          />
        )}

        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor:
                filtros.find(f => f.nombre === filtro)?.color
                || 'transparent'
            }
          ]}
        />

        {mostrarFiltros && (
          <View style={{
            position: 'absolute',
            top: 12,
            left: 8,
            right: 8,
            backgroundColor: '#080808ee',
            padding: 12,
            borderRadius: 15
          }}>
            <Text style={{
              color: 'white',
              textAlign: 'center',
              marginBottom: 12,
              fontWeight: 'bold'
            }}>
              FILTROS DE VISTA PREVIA
            </Text>
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              {filtros.map(f => (
                <Pressable
                  key={f.nombre}
                  onPress={() => {
                    setFiltro(f.nombre);
                    setMostrarFiltros(false);
                  }}
                  style={{
                    padding: 11,
                    margin: 4,
                    borderRadius: 12,
                    backgroundColor:
                      filtro === f.nombre ? '#755c0d' : '#292929'
                  }}
                >
                  <Text style={{ color: 'white' }}>
                    {f.nombre}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {mostrarGPS && (
          <View
            style={{
              position: 'absolute',
              bottom: 14,
              left: 12,
              right: 12,
              backgroundColor: '#000b',
              padding: 12,
              borderRadius: 12,
              borderLeftWidth: 3,
              borderLeftColor: '#ffcb18'
            }}
          >
            <Text style={{
              color: '#ffcb18',
              fontWeight: 'bold',
              fontSize: 12
            }}>
              UBICACION GPS
            </Text>

            <Text style={{
              color: '#fff',
              fontSize: 12,
              marginTop: 4
            }}>
              {ubicacionGPS
                ? ubicacionGPS.direccion
                : 'Pulsa GPS para obtener ubicacion'}
            </Text>

            {ubicacionGPS && (
              <Text style={{
                color: '#ddd',
                fontSize: 11,
                marginTop: 3
              }}>
                {ubicacionGPS.latitud.toFixed(6)}
                {' , '}
                {ubicacionGPS.longitud.toFixed(6)}
              </Text>
            )}

            <Text style={{
              color: '#ddd',
              fontSize: 11,
              marginTop: 4
            }}>
              {fechaGPS.toLocaleString('es-PE')}
            </Text>
          </View>
        )}

        {cuadricula && (
          <View
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          >
            <View style={[
              est.lineaVertical, { left: '33.333%' }
            ]} />
            <View style={[
              est.lineaVertical, { left: '66.666%' }
            ]} />
            <View style={[
              est.lineaHorizontal, { top: '33.333%' }
            ]} />
            <View style={[
              est.lineaHorizontal, { top: '66.666%' }
            ]} />
          </View>
        )}

        {!lista && !vista && (
          <View pointerEvents="none" style={est.cargando}>
            <ActivityIndicator color="white" />
            <Text style={est.cargandoTexto}>
              Iniciando camara...
            </Text>
          </View>
        )}

        {cuenta !== null && (
          <View pointerEvents="none" style={est.contador}>
            <Text style={est.contadorTexto}>{cuenta}</Text>
          </View>
        )}

        {grabando && (
          <View style={est.grabando}>
            <View style={est.puntoRojo} />
            <Text style={est.grabandoTexto}>GRABANDO</Text>
          </View>
        )}

        {herramientas && (
          <View style={est.panel}>
            <View style={est.panelFila}>
              {herramienta(
                'contrast-outline',
                'HDR',
                () => avisar(
                  'HDR nativo',
                  'No esta disponible mediante este control de Expo Go.'
                ),
                false,
                true
              )}

              {herramienta(
                'sparkles-outline',
                'Camara IA',
                () => avisar(
                  'Camara IA',
                  'Requiere un sistema de procesamiento adicional.'
                ),
                false,
                true
              )}

              {herramienta(
                'resize-outline',
                'Relacion ' + proporcion,
                () => setProporcion(v =>
                  v === '4:3' ? '16:9'
                    : v === '16:9' ? '1:1' : '4:3'
                )
              )}

              {herramienta(
                'timer-outline',
                temporizador ? `${temporizador}s` : 'Temporizador',
                () => setTemporizador(v =>
                  opcionesTemporizador[
                    (opcionesTemporizador.indexOf(v) + 1)
                    % opcionesTemporizador.length
                  ]
                ),
                temporizador > 0
              )}
            </View>

            <View style={est.panelFila}>
              {herramienta(
                'aperture-outline',
                'Diorama',
                () => avisar(
                  'Diorama',
                  'El efecto optico nativo no esta disponible en Expo Go.'
                ),
                false,
                true
              )}

              {herramienta(
                'albums-outline',
                'Rafaga 3 fotos',
                () => setRafaga(v => !v),
                rafaga
              )}

              {herramienta(
                'grid-outline',
                'Cuadricula',
                () => setCuadricula(v => !v),
                cuadricula
              )}

              {herramienta(
                'settings-outline',
                'Ajustes',
                () => avisar(
                  'Ajustes',
                  'El zoom es digital. Los resultados dependen del telefono. Fotos y videos se guardan en la galeria.'
                )
              )}
            </View>
          </View>
        )}
      </View>

      <View style={{
        height: 42,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        backgroundColor: '#080808'
      }}>
        <Pressable
          disabled={sinCambios}
          onPress={() => setMostrarFiltros(v => !v)}
        >
          <Text style={{ color: '#ffcb18', fontSize: 14 }}>
            FILTROS
          </Text>
        </Pressable>

        <Pressable
          disabled={sinCambios}
          onPress={() => {
            setFlash(v =>
              v === 'off' ? 'on' : v === 'on' ? 'auto' : 'off'
            );
          }}
        >
          <Text style={{ color: 'white', fontSize: 13 }}>
            FLASH: {flash.toUpperCase()}
          </Text>
        </Pressable>

        <Text style={{ color: '#aaa', fontSize: 12 }}>
          {modoExtra}
        </Text>
      </View>

      <View style={{
        height: 43,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        backgroundColor: '#080808'
      }}>
        <Pressable
          disabled={cargandoGPS}
          onPress={actualizarGPS}
          style={{ padding: 8 }}
        >
          <Text style={{
            color: '#ffcb18',
            fontWeight: 'bold',
            fontSize: 12
          }}>
            {cargandoGPS ? 'BUSCANDO...' : 'GPS ACTUALIZAR'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setMostrarGPS(v => !v)}
          style={{ padding: 8 }}
        >
          <Text style={{
            color: '#fff',
            fontSize: 12
          }}>
            {mostrarGPS ? 'OCULTAR GPS' : 'MOSTRAR GPS'}
          </Text>
        </Pressable>
      </View>

      <View style={est.zoomBarra}>
        {[
          { n: '1x', z: 0 },
          { n: 'MED', z: 0.22 },
          { n: 'MAX', z: 0.7 }
        ].map(item => (
          <Pressable
            key={item.n}
            disabled={sinCambios}
            onPress={() => setZoom(item.z)}
            style={[
              est.zoomOpcion,
              zoom === item.z && est.zoomActivo
            ]}
          >
            <Text style={[
              est.zoomTexto,
              zoom === item.z && { color: AMARILLO }
            ]}>
              {item.n}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={est.modos}>
        <Pressable onPress={() => {
          elegirModo('picture');
          setModoExtra('Pro');
          setCuadricula(true);
        }}>
          <Text style={
            modoExtra === 'Pro' ? est.modoActivo : est.modoInactivo
          }>Pro</Text>
        </Pressable>

        <Pressable onPress={() => elegirModo('video')}>
          <Text style={
            enVideo ? est.modoActivo : est.modoInactivo
          }>Video</Text>
        </Pressable>

        <Pressable onPress={() => elegirModo('picture')}>
          <Text style={
            !enVideo ? est.modoActivo : est.modoInactivo
          }>Foto</Text>
        </Pressable>

        <Pressable onPress={() => {
          elegirModo('picture');
          setModoExtra('Retrato');
        }}>
          <Text style={
            modoExtra === 'Retrato' ? est.modoActivo : est.modoInactivo
          }>Retrato</Text>
        </Pressable>

        <Pressable onPress={() => {
          elegirModo('picture');
          setModoExtra('Documento');
          setCuadricula(true);
        }}>
          <Text style={
            modoExtra === 'Documento'
              ? est.modoActivo : est.modoInactivo
          }>Documento</Text>
        </Pressable>
      </View>

      <View style={est.controlesFinales}>
        <Pressable
          style={est.miniaturaBoton}
          disabled={sinCambios}
          onPress={() =>
            ultimo ? setVista(ultimo) : abrirGaleria()
          }
        >
          {ultimo?.tipo === 'image' ? (
            <Image
              source={{ uri: ultimo.uri }}
              style={est.miniatura}
            />
          ) : (
            <Ionicons
              name={
                ultimo?.tipo === 'video'
                  ? 'play-circle-outline'
                  : 'images-outline'
              }
              size={28}
              color="white"
            />
          )}
        </Pressable>

        <Pressable
          disabled={!lista || (trabajando && !grabando)}
          onPress={
            enVideo
              ? (grabando ? detenerVideo : empezarVideo)
              : foto
          }
          style={[
            est.disparador,
            !lista && est.opaco
          ]}
        >
          <View style={[
            est.disparadorInterior,
            grabando && est.detener
          ]} />
        </Pressable>

        <Pressable
          disabled={sinCambios}
          onPress={girar}
          style={est.girarBoton}
        >
          <Ionicons
            name="camera-reverse-outline"
            color="white"
            size={29}
          />
        </Pressable>
      </View>

      <View style={est.pie}>
        <Pressable onPress={abrirGaleria} disabled={sinCambios}>
          <Text style={est.pieTexto}>GALERIA</Text>
        </Pressable>
        <Text style={est.pieTexto}>
          {temporizador ? `TEMP ${temporizador}s` : 'AUTO'}
        </Text>
      </View>

      <Modal
        visible={!!vista}
        animationType="slide"
        onRequestClose={() => setVista(null)}
      >
        <SafeAreaView style={est.modal}>
          <View style={est.modalCabecera}>
            <Text style={est.modalTitulo}>Vista previa</Text>
            <Pressable onPress={() => setVista(null)}>
              <Ionicons name="close" color="white" size={30} />
            </Pressable>
          </View>

          {vista && (
            vista.tipo === 'video'
              ? <VistaVideo uri={vista.uri} />
              : <Image
                  source={{ uri: vista.uri }}
                  style={est.imagenCompleta}
                  resizeMode="contain"
                />
          )}

          <Text style={est.modalPie}>
            Para ver todos los archivos, abre la Galeria del telefono.
          </Text>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const est = StyleSheet.create({
  pagina: { flex: 1, backgroundColor: '#000' },
  centro: {
    flex: 1, backgroundColor: '#050505',
    alignItems: 'center', justifyContent: 'center', padding: 28
  },
  permisoTitulo: {
    color: 'white', fontSize: 27,
    fontWeight: '700', marginTop: 20
  },
  permisoTexto: {
    color: '#bbb', fontSize: 15,
    textAlign: 'center', marginVertical: 18
  },
  permisoBoton: {
    backgroundColor: AMARILLO,
    borderRadius: 10, padding: 15
  },
  permisoBotonTexto: { color: '#000', fontWeight: '700' },
  barraSuperior: {
    height: 66, flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center', paddingHorizontal: 9
  },
  iconoBoton: {
    width: 48, height: 45, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center'
  },
  iconoActivo: { backgroundColor: '#242424' },
  proporcionBoton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48, height: 45
  },
  proporcionTexto: {
    color: 'white', fontSize: 14, fontWeight: '600'
  },
  opaco: { opacity: 0.5 },
  areaCamara: {
    flex: 1, backgroundColor: '#0b0b0b', overflow: 'hidden'
  },
  cargando: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center', gap: 10
  },
  cargandoTexto: { color: 'white' },
  lineaVertical: {
    position: 'absolute', top: 0, bottom: 0,
    width: 1, backgroundColor: '#ffffff55'
  },
  lineaHorizontal: {
    position: 'absolute', left: 0, right: 0,
    height: 1, backgroundColor: '#ffffff55'
  },
  contador: {
    position: 'absolute', top: '40%', alignSelf: 'center'
  },
  contadorTexto: {
    color: 'white', fontSize: 90, fontWeight: '800',
    textShadowColor: '#000', textShadowRadius: 15
  },
  grabando: {
    position: 'absolute', top: 10, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#000a',
    paddingHorizontal: 15, paddingVertical: 7,
    borderRadius: 20, gap: 7
  },
  puntoRojo: {
    width: 10, height: 10,
    borderRadius: 6, backgroundColor: '#f44'
  },
  grabandoTexto: {
    color: 'white', fontWeight: '700', fontSize: 12
  },
  panel: {
    position: 'absolute', bottom: 8, left: 8, right: 8,
    backgroundColor: '#080808eb',
    borderRadius: 12, borderWidth: 1,
    borderColor: '#373737', paddingVertical: 8
  },
  panelFila: { flexDirection: 'row' },
  herramienta: {
    flex: 1, alignItems: 'center',
    justifyContent: 'center',
    minHeight: 87, paddingVertical: 6,
    borderWidth: 0.5, borderColor: '#333'
  },
  herramientaActiva: { backgroundColor: '#3d3209' },
  herramientaTexto: {
    color: '#eee', textAlign: 'center',
    fontSize: 10, marginTop: 7
  },
  etiquetaNo: {
    color: '#999', fontSize: 7, marginTop: 3
  },
  zoomBarra: {
    height: 47, flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center', gap: 15
  },
  zoomOpcion: {
    width: 53, height: 32,
    justifyContent: 'center',
    alignItems: 'center', borderRadius: 20
  },
  zoomActivo: { backgroundColor: '#292929' },
  zoomTexto: {
    color: '#aaa', fontSize: 13, fontWeight: '700'
  },
  modos: {
    height: 48, flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  modoInactivo: { color: '#999', fontSize: 14 },
  modoActivo: {
    color: AMARILLO, fontSize: 15, fontWeight: '700'
  },
  controlesFinales: {
    height: 113, flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around'
  },
  miniaturaBoton: {
    width: 59, height: 59, borderRadius: 9,
    backgroundColor: '#222',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden'
  },
  miniatura: { width: 59, height: 59 },
  disparador: {
    height: 85, width: 85, borderWidth: 4,
    borderColor: 'white', borderRadius: 50,
    alignItems: 'center', justifyContent: 'center'
  },
  disparadorInterior: {
    width: 69, height: 69,
    backgroundColor: 'white', borderRadius: 40
  },
  detener: {
    width: 35, height: 35,
    borderRadius: 6, backgroundColor: '#ed3838'
  },
  girarBoton: {
    width: 59, height: 59,
    justifyContent: 'center', alignItems: 'center'
  },
  pie: {
    height: 28, justifyContent: 'space-around',
    flexDirection: 'row', alignItems: 'flex-start'
  },
  pieTexto: { color: '#777', fontSize: 11 },
  modal: { flex: 1, backgroundColor: '#000' },
  modalCabecera: {
    height: 60, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between'
  },
  modalTitulo: {
    color: 'white', fontSize: 18, fontWeight: '700'
  },
  imagenCompleta: { flex: 1, width: '100%' },
  modalPie: {
    color: '#999', textAlign: 'center',
    padding: 20, fontSize: 12
  }
});



